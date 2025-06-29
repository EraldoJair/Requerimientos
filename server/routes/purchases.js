import express from 'express';
import mongoose from 'mongoose';
import PurchaseRequest from '../models/PurchaseRequest.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validatePurchaseRequest = (req, res, next) => {
  const { requestDetails, approvalFlow } = req.body;
  
  // Basic validation
  if (!requestDetails) {
    return res.status(400).json({ message: 'Request details are required' });
  }
  
  const { itemType, description, criticality, justification, estimatedCost, currency, requiredDate, specifications } = requestDetails;
  
  // Required fields validation
  if (!itemType || !description || !criticality || !justification || !estimatedCost || !currency || !requiredDate) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  // Specifications validation
  if (!specifications || !specifications.quantity || !specifications.unitOfMeasure) {
    return res.status(400).json({ message: 'Quantity and unit of measure are required' });
  }
  
  // Date validation
  const reqDate = new Date(requiredDate);
  if (reqDate <= new Date()) {
    return res.status(400).json({ message: 'Required date must be in the future' });
  }
  
  // Cost validation
  if (estimatedCost <= 0) {
    return res.status(400).json({ message: 'Estimated cost must be greater than 0' });
  }
  
  // Approval flow validation
  if (!approvalFlow || !Array.isArray(approvalFlow) || approvalFlow.length === 0) {
    return res.status(400).json({ message: 'Valid approval flow is required' });
  }
  
  next();
};

// Get all purchase requests
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      status, 
      criticality, 
      department, 
      page = 1, 
      limit = 20,
      search,
      warehouseStatus
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (criticality && criticality !== 'all') {
      filter['requestDetails.criticality'] = criticality;
    }
    
    if (department && department !== 'all') {
      filter['requestor.department'] = department;
    }

    if (warehouseStatus && warehouseStatus !== 'all') {
      filter['warehouseInfo.warehouseStatus'] = warehouseStatus;
    }

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Role-based filtering
    if (req.user.permissions.role === 'technical_field') {
      filter['requestor.userId'] = req.user._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const requests = await PurchaseRequest.find(filter)
      .populate('requestor.userId', 'profile.firstName profile.lastName')
      .populate('approvalFlow.userId', 'profile.firstName profile.lastName')
      .populate('warehouseInfo.assignedWarehouse', 'name location')
      .populate('warehouseInfo.productId', 'name code')
      .populate('warehouseInfo.warehouseReceipt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PurchaseRequest.countDocuments(filter);

    res.json({
      success: true,
      requests,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });

  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get approved requests ready for warehouse assignment
router.get('/approved-for-warehouse', authenticate, async (req, res) => {
  try {
    const requests = await PurchaseRequest.getApprovedForWarehouse()
      .populate('requestor.userId', 'profile.firstName profile.lastName');

    res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Get approved requests error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching approved requests'
    });
  }
});

// Assign warehouse to approved request
router.post('/:id/assign-warehouse', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { warehouseId, productId, expectedDeliveryDate } = req.body;
      
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new Error('Invalid request ID format');
      }

      const request = await PurchaseRequest.findById(req.params.id).session(session);
      
      if (!request) {
        throw new Error('Purchase request not found');
      }

      if (request.status !== 'approved') {
        throw new Error('Request must be approved before warehouse assignment');
      }

      // Verify warehouse exists
      const warehouse = await Warehouse.findById(warehouseId).session(session);
      if (!warehouse) {
        throw new Error('Warehouse not found');
      }

      // Create or find product
      let product;
      if (productId) {
        product = await Product.findById(productId).session(session);
      } else {
        // Create new product from request details
        product = new Product({
          name: request.requestDetails.description,
          code: request.requestDetails.specifications.partNumber || `AUTO-${Date.now()}`,
          description: request.requestDetails.description,
          category: request.requestDetails.itemType,
          unitOfMeasure: request.requestDetails.specifications.unitOfMeasure,
          specifications: {
            brand: request.requestDetails.specifications.brand,
            model: request.requestDetails.specifications.model,
            technicalSpecs: request.requestDetails.specifications.technicalSpecs
          },
          pricing: {
            standardCost: request.requestDetails.estimatedCost / request.requestDetails.specifications.quantity,
            currency: request.requestDetails.currency
          },
          createdBy: req.user._id
        });
        await product.save({ session });
      }

      // Update request with warehouse information
      request.warehouseInfo = {
        assignedWarehouse: warehouseId,
        productId: product._id,
        pendingQuantity: request.requestDetails.specifications.quantity,
        warehouseStatus: 'assigned',
        assignedDate: new Date(),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null
      };
      
      request.status = 'in_warehouse';
      request.audit.modifiedBy = req.user._id;
      request.audit.version += 1;
      
      // Add to audit log
      request.audit.changeLog.push({
        field: 'warehouseInfo',
        oldValue: 'pending_assignment',
        newValue: 'assigned',
        changedBy: req.user._id,
        changedAt: new Date(),
        reason: `Assigned to warehouse: ${warehouse.name}`
      });

      await request.save({ session });

      await request.populate([
        { path: 'warehouseInfo.assignedWarehouse', select: 'name location' },
        { path: 'warehouseInfo.productId', select: 'name code' }
      ]);

      res.json({
        success: true,
        message: 'Warehouse assigned successfully',
        request
      });
    });

  } catch (error) {
    console.error('Assign warehouse error:', error);
    
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('must be approved') ? 400 :
                      error.message.includes('Invalid') ? 400 : 500;
    
    res.status(statusCode).json({ 
      success: false,
      message: error.message || 'Server error assigning warehouse'
    });
  } finally {
    await session.endSession();
  }
});

// Get single purchase request
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid request ID format' 
      });
    }

    const request = await PurchaseRequest.findById(req.params.id)
      .populate('requestor.userId', 'profile.firstName profile.lastName')
      .populate('approvalFlow.userId', 'profile.firstName profile.lastName')
      .populate('audit.createdBy', 'profile.firstName profile.lastName')
      .populate('audit.modifiedBy', 'profile.firstName profile.lastName')
      .populate('warehouseInfo.assignedWarehouse', 'name location responsibleUser')
      .populate('warehouseInfo.productId', 'name code description')
      .populate('warehouseInfo.warehouseReceipt');

    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: 'Purchase request not found' 
      });
    }

    // Check if user can view this request
    const canView = 
      req.user.permissions.role !== 'technical_field' ||
      request.requestor.userId.toString() === req.user._id.toString();

    if (!canView) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    res.json({ 
      success: true,
      request 
    });

  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new purchase request
router.post('/', authenticate, validatePurchaseRequest, async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      console.log('Creating purchase request with data:', JSON.stringify(req.body, null, 2));
      
      const requestData = {
        ...req.body,
        requestor: {
          userId: req.user._id,
          name: `${req.user.profile.firstName} ${req.user.profile.lastName}`,
          role: req.user.permissions.role,
          department: req.user.profile.department,
          location: req.user.profile.location
        },
        audit: {
          createdBy: req.user._id
        },
        warehouseInfo: {
          warehouseStatus: 'pending_assignment',
          receivedQuantity: 0,
          pendingQuantity: req.body.requestDetails.specifications.quantity
        }
      };

      const request = new PurchaseRequest(requestData);
      
      // Validate before saving
      const validationError = request.validateSync();
      if (validationError) {
        console.error('Validation error:', validationError);
        throw new Error(`Validation failed: ${Object.values(validationError.errors).map(err => err.message).join(', ')}`);
      }
      
      await request.save({ session });

      // Populate the response
      await request.populate([
        { path: 'requestor.userId', select: 'profile.firstName profile.lastName' },
        { path: 'audit.createdBy', select: 'profile.firstName profile.lastName' }
      ]);

      console.log('Purchase request created successfully:', request._id);

      res.status(201).json({
        success: true,
        message: 'Purchase request created successfully',
        request
      });
    });

  } catch (error) {
    console.error('Create request error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Duplicate request number. Please try again.' 
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error creating request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await session.endSession();
  }
});

// Update purchase request
router.put('/:id', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new Error('Invalid request ID format');
      }

      const request = await PurchaseRequest.findById(req.params.id).session(session);
      
      if (!request) {
        throw new Error('Purchase request not found');
      }

      // Check permissions
      const canEdit = 
        request.requestor.userId.toString() === req.user._id.toString() &&
        request.status === 'pending' &&
        !request.approvalFlow.some(flow => flow.status !== 'pending');

      if (!canEdit) {
        throw new Error('Cannot edit this request');
      }

      // Update request
      Object.assign(request, req.body);
      request.audit.modifiedBy = req.user._id;
      request.audit.version += 1;

      await request.save({ session });

      res.json({
        success: true,
        message: 'Purchase request updated successfully',
        request
      });
    });

  } catch (error) {
    console.error('Update request error:', error);
    
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Cannot edit') ? 403 :
                      error.message.includes('Invalid') ? 400 : 500;
    
    res.status(statusCode).json({ 
      success: false,
      message: error.message || 'Server error updating request'
    });
  } finally {
    await session.endSession();
  }
});

// Approve/Reject purchase request
router.post('/:id/action', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { action, level, comments } = req.body;
      
      if (!['approve', 'reject'].includes(action)) {
        throw new Error('Invalid action');
      }

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new Error('Invalid request ID format');
      }

      const request = await PurchaseRequest.findById(req.params.id).session(session);
      
      if (!request) {
        throw new Error('Purchase request not found');
      }

      // Find the approval level for current user
      const approvalLevel = request.approvalFlow.find(
        flow => flow.level === level && 
                flow.role === req.user.permissions.role &&
                flow.status === 'pending'
      );

      if (!approvalLevel) {
        throw new Error('No pending approval found for your role');
      }

      // Update approval level
      approvalLevel.status = action === 'approve' ? 'approved' : 'rejected';
      approvalLevel.userId = req.user._id;
      approvalLevel.userName = `${req.user.profile.firstName} ${req.user.profile.lastName}`;
      approvalLevel.comments = comments;
      approvalLevel.actionDate = new Date();
      approvalLevel.timeToAction = Math.floor((new Date() - request.createdAt) / 1000);

      // Update overall request status
      if (action === 'reject') {
        request.status = 'rejected';
      } else {
        // Check if all required approvals are complete
        const allApproved = request.approvalFlow.every(
          flow => flow.status === 'approved'
        );
        if (allApproved) {
          request.status = 'approved';
          // When approved, set warehouse status to pending assignment
          request.warehouseInfo.warehouseStatus = 'pending_assignment';
        }
      }

      // Add to audit log
      request.audit.changeLog.push({
        field: 'approvalFlow',
        oldValue: 'pending',
        newValue: approvalLevel.status,
        changedBy: req.user._id,
        changedAt: new Date(),
        reason: comments || `${action} by ${req.user.permissions.role}`
      });

      request.audit.modifiedBy = req.user._id;
      request.audit.version += 1;

      await request.save({ session });

      res.json({
        success: true,
        message: `Request ${action}d successfully`,
        request
      });
    });

  } catch (error) {
    console.error('Action request error:', error);
    
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('No pending approval') ? 403 :
                      error.message.includes('Invalid') ? 400 : 500;
    
    res.status(statusCode).json({ 
      success: false,
      message: error.message || 'Server error processing action'
    });
  } finally {
    await session.endSession();
  }
});

// Get requests pending approval for current user
router.get('/pending/approvals', authenticate, async (req, res) => {
  try {
    const requests = await PurchaseRequest.getPendingForRole(req.user.permissions.role);

    res.json({ 
      success: true,
      requests 
    });

  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching pending approvals',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get dashboard statistics
router.get('/stats/dashboard', authenticate, async (req, res) => {
  try {
    const stats = await Promise.all([
      PurchaseRequest.countDocuments({ status: 'pending' }),
      PurchaseRequest.countDocuments({ status: 'approved' }),
      PurchaseRequest.countDocuments({ status: 'rejected' }),
      PurchaseRequest.countDocuments({ 
        'requestDetails.criticality': 'critical',
        status: 'pending'
      }),
      PurchaseRequest.countDocuments({ status: 'in_warehouse' }),
      PurchaseRequest.countDocuments({ status: 'received' }),
      PurchaseRequest.countDocuments({ status: 'completed' })
    ]);

    res.json({
      success: true,
      stats: {
        pending: stats[0],
        approved: stats[1],
        rejected: stats[2],
        criticalPending: stats[3],
        inWarehouse: stats[4],
        received: stats[5],
        completed: stats[6],
        total: stats[0] + stats[1] + stats[2] + stats[4] + stats[5] + stats[6]
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching dashboard statistics'
    });
  }
});

export default router;