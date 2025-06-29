import mongoose from 'mongoose';

const purchaseRequestSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      // Generate request number: PR-YYYY-NNNNNN
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      return `PR-${year}-${random}`;
    }
  },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'in_warehouse', 'received', 'completed'],
    default: 'pending',
    required: true
  },
  
  requestor: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    department: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    }
  },
  
  requestDetails: {
    itemType: {
      type: String,
      enum: ['critical_spare', 'consumable', 'dangerous_material', 'new_equipment', 'specialized_service'],
      required: true
    },
    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000
    },
    specifications: {
      partNumber: {
        type: String,
        trim: true
      },
      brand: {
        type: String,
        trim: true
      },
      model: {
        type: String,
        trim: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      unitOfMeasure: {
        type: String,
        required: true,
        enum: ['units', 'meters', 'liters', 'kilograms', 'hours', 'services']
      },
      technicalSpecs: {
        type: String,
        maxlength: 2000
      }
    },
    criticality: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true
    },
    justification: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 2000
    },
    estimatedCost: {
      type: Number,
      required: true,
      min: 0.01
    },
    currency: {
      type: String,
      enum: ['USD', 'PEN', 'EUR'],
      default: 'USD',
      required: true
    },
    requiredDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(date) {
          return date >= new Date();
        },
        message: 'Required date must be in the future'
      }
    },
    attachments: [{
      fileName: {
        type: String,
        required: true
      },
      fileType: {
        type: String,
        required: true
      },
      fileSize: {
        type: Number,
        required: true,
        max: 10485760 // 10MB in bytes
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  approvalFlow: [{
    level: {
      type: Number,
      required: true
    },
    role: {
      type: String,
      required: true,
      enum: ['supervisor_maintenance', 'maintenance_manager', 'operations_superintendent', 'financial_manager', 'general_manager']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    actionDate: Date,
    timeToAction: Number // in seconds
  }],
  
  // NUEVA SECCIÓN: Información de Almacén
  warehouseInfo: {
    assignedWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    warehouseReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseReceipt'
    },
    receivedQuantity: {
      type: Number,
      default: 0
    },
    pendingQuantity: {
      type: Number,
      default: 0
    },
    warehouseStatus: {
      type: String,
      enum: ['pending_assignment', 'assigned', 'in_transit', 'received_partial', 'received_complete'],
      default: 'pending_assignment'
    },
    assignedDate: Date,
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date
  },
  
  metrics: {
    totalApprovalTime: Number,
    escalations: {
      type: Number,
      default: 0
    },
    slaCompliance: {
      type: Boolean,
      default: true
    }
  },
  
  audit: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    version: {
      type: Number,
      default: 1
    },
    changeLog: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      changedAt: {
        type: Date,
        default: Date.now
      },
      reason: String
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
purchaseRequestSchema.index({ status: 1, createdAt: -1 });
purchaseRequestSchema.index({ 'requestor.userId': 1 });
purchaseRequestSchema.index({ 'requestor.department': 1 });
purchaseRequestSchema.index({ 'requestDetails.criticality': 1 });
purchaseRequestSchema.index({ 'approvalFlow.role': 1, 'approvalFlow.status': 1 });
purchaseRequestSchema.index({ requestNumber: 1 });
purchaseRequestSchema.index({ 'warehouseInfo.warehouseStatus': 1 });

// Text search index
purchaseRequestSchema.index({
  'requestDetails.description': 'text',
  'requestDetails.specifications.partNumber': 'text',
  'requestDetails.specifications.brand': 'text',
  'requestDetails.specifications.model': 'text'
});

// Virtual for current approval level
purchaseRequestSchema.virtual('currentApprovalLevel').get(function() {
  return this.approvalFlow.find(flow => flow.status === 'pending');
});

// Virtual for next approver role
purchaseRequestSchema.virtual('nextApproverRole').get(function() {
  const pending = this.approvalFlow.find(flow => flow.status === 'pending');
  return pending ? pending.role : null;
});

// Virtual for completion percentage
purchaseRequestSchema.virtual('completionPercentage').get(function() {
  if (this.warehouseInfo.receivedQuantity === 0) return 0;
  return Math.round((this.warehouseInfo.receivedQuantity / this.requestDetails.specifications.quantity) * 100);
});

// Pre-save middleware
purchaseRequestSchema.pre('save', function(next) {
  // Update modifiedBy if document is being modified (not created)
  if (!this.isNew && this.isModified()) {
    this.updatedAt = new Date();
  }
  
  // Auto-calculate pending quantity
  if (this.warehouseInfo.receivedQuantity !== undefined) {
    this.warehouseInfo.pendingQuantity = this.requestDetails.specifications.quantity - this.warehouseInfo.receivedQuantity;
  }
  
  // Auto-update warehouse status based on quantities
  if (this.warehouseInfo.receivedQuantity > 0) {
    if (this.warehouseInfo.receivedQuantity >= this.requestDetails.specifications.quantity) {
      this.warehouseInfo.warehouseStatus = 'received_complete';
      this.status = 'completed';
    } else {
      this.warehouseInfo.warehouseStatus = 'received_partial';
      this.status = 'received';
    }
  }
  
  next();
});

// Static method to get pending approvals for a role
purchaseRequestSchema.statics.getPendingForRole = function(role) {
  return this.find({
    status: 'pending',
    'approvalFlow': {
      $elemMatch: {
        role: role,
        status: 'pending'
      }
    }
  })
  .populate('requestor.userId', 'profile.firstName profile.lastName')
  .sort({ 'requestDetails.criticality': 1, createdAt: 1 });
};

// Static method to get approved requests ready for warehouse
purchaseRequestSchema.statics.getApprovedForWarehouse = function() {
  return this.find({
    status: 'approved',
    'warehouseInfo.warehouseStatus': 'pending_assignment'
  })
  .populate('requestor.userId', 'profile.firstName profile.lastName')
  .sort({ 'requestDetails.criticality': 1, createdAt: 1 });
};

// Instance method to get current status
purchaseRequestSchema.methods.getCurrentStatus = function() {
  if (this.status !== 'pending') {
    return this.status;
  }
  
  const currentLevel = this.approvalFlow.find(flow => flow.status === 'pending');
  return currentLevel ? `Pending ${currentLevel.role} approval` : 'Pending review';
};

export default mongoose.model('PurchaseRequest', purchaseRequestSchema);