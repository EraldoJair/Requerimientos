import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    position: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      enum: ['Mantenimiento Mina', 'Operaciones', 'Planta', 'Servicios', 'Administración']
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    emergencyContact: {
      type: String,
      trim: true
    }
  },
  permissions: {
    role: {
      type: String,
      required: true,
      enum: [
        'technical_field',
        'supervisor_maintenance', 
        'maintenance_manager',
        'operations_superintendent',
        'procurement_manager',
        'financial_manager',
        'general_manager'
      ]
    },
    approvalLimits: {
      maxAmount: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'PEN', 'EUR']
      },
      categories: [{
        type: String,
        enum: ['critical_spare', 'consumable', 'dangerous_material', 'new_equipment', 'specialized_service']
      }]
    },
    areas: [{
      type: String,
      enum: ['maintenance', 'operations', 'mobile_equipment', 'fixed_plant', 'services']
    }],
    specialPermissions: [{
      type: String,
      enum: ['emergency_approval', 'budget_override', 'vendor_evaluation', 'user_management']
    }]
  },
  preferences: {
    language: {
      type: String,
      default: 'es',
      enum: ['es', 'en']
    },
    timezone: {
      type: String,
      default: 'America/Lima'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  session: {
    isActive: {
      type: Boolean,
      default: false
    },
    lastLogin: Date,
    loginHistory: [{
      timestamp: Date,
      ipAddress: String,
      device: String,
      location: String
    }]
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'inactive', 'suspended']
  }
}, {
  timestamps: true
});

// Only define additional indexes here (not duplicating unique fields)
userSchema.index({ 'permissions.role': 1, status: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

export default mongoose.model('User', userSchema);