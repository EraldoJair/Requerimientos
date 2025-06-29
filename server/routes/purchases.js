import express from 'express';
import mongoose from 'mongoose';
import PurchaseRequest from '../models/PurchaseRequest.js';
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
      search 
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
      .populate('audit.modifiedBy', 'profile.firstName profile.lastName');

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
      })
    ]);

    res.json({
      success: true,
      stats: {
        pending: stats[0],
        approved: stats[1],
        rejected: stats[2],
        criticalPending: stats[3],
        total: stats[0] + stats[1] + stats[2]
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

// Endpoint de prueba (temporal)
router.post('/test', authenticate, async (req, res) => {
  try {
    console.log('Test endpoint hit with user:', req.user._id);
    console.log('Request body:', req.body);
    
    const testDoc = {
      requestor: {
        userId: req.user._id,
        name: "Test User",
        role: "technical_field",
        department: "maintenance",
        location: "plant_1"
      },
      requestDetails: {
        itemType: "consumable",
        description: "Test item for database connection",
        specifications: {
          quantity: 1,
          unitOfMeasure: "units"
        },
        criticality: "low",
        justification: "Testing database connection and model validation",
        estimatedCost: 100,
        currency: "USD",
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      approvalFlow: [{
        level: 1,
        role: "supervisor_maintenance",
        status: "pending"
      }],
      audit: {
        createdBy: req.user._id
      }
    };
    
    const testRequest = new PurchaseRequest(testDoc);
    await testRequest.save();
    
    res.json({
      success: true,
      message: "Test document created successfully",
      id: testRequest._id
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;