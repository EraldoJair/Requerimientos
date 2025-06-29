import mongoose from 'mongoose';

const purchaseRequestSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
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
      required: true,
      enum: ['critical_spare', 'consumable', 'dangerous_material', 'new_equipment', 'specialized_service']
    },
    description: {
      type: String,
      required: true,
      trim: true
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
        trim: true
      }
    },
    criticality: {
      type: String,
      required: true,
      enum: ['critical', 'high', 'medium', 'low']
    },
    justification: {
      type: String,
      required: true,
      trim: true
    },
    estimatedCost: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      enum: ['USD', 'PEN', 'EUR'],
      default: 'USD'
    },
    requiredDate: {
      type: Date,
      required: true
    },
    attachments: [{
      fileName: String,
      fileType: String,
      fileSize: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      gridFSId: mongoose.Schema.Types.ObjectId
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
      enum: [
        'supervisor_maintenance',
        'maintenance_manager', 
        'operations_superintendent',
        'procurement_manager',
        'financial_manager',
        'general_manager'
      ]
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    actionDate: Date,
    timeToAction: Number, // seconds
    ipAddress: String,
    deviceInfo: String
  }],
  metrics: {
    totalApprovalTime: Number, // seconds
    escalations: {
      type: Number,
      default: 0
    },
    slaCompliance: {
      type: Boolean,
      default: true
    },
    businessRulesViolations: [String]
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
  timestamps: true
});

// Only define additional indexes here (not duplicating unique fields)
purchaseRequestSchema.index({ status: 1, createdAt: -1 });
purchaseRequestSchema.index({ 'requestor.userId': 1, createdAt: -1 });
purchaseRequestSchema.index({ 'requestDetails.criticality': 1, status: 1 });
purchaseRequestSchema.index({ 
  status: 1, 
  'requestDetails.criticality': 1, 
  createdAt: -1 
});

// Text index for search
purchaseRequestSchema.index({ 
  'requestDetails.description': 'text',
  'requestDetails.specifications.partNumber': 'text'
});

// Auto-generate request number
purchaseRequestSchema.pre('save', async function(next) {
  if (this.isNew && !this.requestNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.requestNumber = `PR-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model('PurchaseRequest', purchaseRequestSchema);