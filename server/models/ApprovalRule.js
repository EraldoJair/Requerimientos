import mongoose from 'mongoose';

const approvalRuleSchema = new mongoose.Schema({
  ruleName: {
    type: String,
    required: true,
    trim: true
  },
  ruleType: {
    type: String,
    required: true,
    enum: ['amount_based', 'criticality_based', 'category_based', 'combined']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  conditions: {
    amountRange: {
      min: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: Number.MAX_SAFE_INTEGER
      },
      currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'PEN', 'EUR']
      }
    },
    itemCategories: [{
      type: String,
      enum: ['critical_spare', 'consumable', 'dangerous_material', 'new_equipment', 'specialized_service']
    }],
    criticality: [{
      type: String,
      enum: ['critical', 'high', 'medium', 'low']
    }],
    departments: [{
      type: String,
      enum: ['Mantenimiento Mina', 'Operaciones', 'Planta', 'Servicios', 'Administración']
    }]
  },
  approvalSequence: [{
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
    isRequired: {
      type: Boolean,
      default: true
    },
    slaHours: {
      type: Number,
      default: 24
    },
    canDelegate: {
      type: Boolean,
      default: false
    },
    parallelApproval: {
      type: Boolean,
      default: false
    }
  }],
  escalationRules: {
    enableAutoEscalation: {
      type: Boolean,
      default: true
    },
    escalationTimeHours: {
      type: Number,
      default: 24
    },
    escalateToRole: {
      type: String,
      enum: [
        'supervisor_maintenance',
        'maintenance_manager',
        'operations_superintendent',
        'procurement_manager', 
        'financial_manager',
        'general_manager'
      ]
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
approvalRuleSchema.index({ ruleType: 1, isActive: 1 });
approvalRuleSchema.index({ 'conditions.amountRange.min': 1, 'conditions.amountRange.max': 1 });

export default mongoose.model('ApprovalRule', approvalRuleSchema);