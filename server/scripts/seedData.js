import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import ApprovalRule from '../models/ApprovalRule.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const seedUsers = async () => {
  console.log('🌱 Seeding users...');
  
  const users = [
    {
      employeeId: 'EMP-2025-001',
      email: 'supervisor@minera.com',
      password: 'password123',
      profile: {
        firstName: 'Carlos',
        lastName: 'López',
        position: 'Supervisor de Mantenimiento',
        department: 'Mantenimiento Mina',
        location: 'Operación Tajo Norte',
        phone: '+51-999-888-777'
      },
      permissions: {
        role: 'supervisor_maintenance',
        approvalLimits: {
          maxAmount: 10000,
          currency: 'USD',
          categories: ['critical_spare', 'consumable']
        },
        areas: ['maintenance', 'mobile_equipment'],
        specialPermissions: ['emergency_approval']
      }
    },
    {
      employeeId: 'EMP-2025-002',
      email: 'manager@minera.com',
      password: 'password123',
      profile: {
        firstName: 'Ana',
        lastName: 'García',
        position: 'Jefe de Mantenimiento',
        department: 'Mantenimiento Mina',
        location: 'Oficina Central',
        phone: '+51-888-777-666'
      },
      permissions: {
        role: 'maintenance_manager',
        approvalLimits: {
          maxAmount: 50000,
          currency: 'USD',
          categories: ['critical_spare', 'consumable', 'new_equipment']
        },
        areas: ['maintenance', 'mobile_equipment', 'fixed_plant'],
        specialPermissions: ['emergency_approval', 'budget_override']
      }
    },
    {
      employeeId: 'EMP-2025-003',
      email: 'tecnico@minera.com',
      password: 'password123',
      profile: {
        firstName: 'Juan',
        lastName: 'Pérez',
        position: 'Técnico Mecánico Senior',
        department: 'Mantenimiento Mina',
        location: 'Pit 1 - Level 2400',
        phone: '+51-777-666-555'
      },
      permissions: {
        role: 'technical_field',
        approvalLimits: {
          maxAmount: 0,
          currency: 'USD',
          categories: []
        },
        areas: ['maintenance'],
        specialPermissions: []
      }
    },
    {
      employeeId: 'EMP-2025-004',
      email: 'superintendent@minera.com',
      password: 'password123',
      profile: {
        firstName: 'Roberto',
        lastName: 'Silva',
        position: 'Superintendent de Operaciones',
        department: 'Operaciones',
        location: 'Centro de Control',
        phone: '+51-666-555-444'
      },
      permissions: {
        role: 'operations_superintendent',
        approvalLimits: {
          maxAmount: 100000,
          currency: 'USD',
          categories: ['critical_spare', 'consumable', 'new_equipment', 'specialized_service']
        },
        areas: ['operations', 'maintenance', 'mobile_equipment', 'fixed_plant'],
        specialPermissions: ['emergency_approval', 'production_override']
      }
    },
    {
      employeeId: 'EMP-2025-005',
      email: 'financial@minera.com',
      password: 'password123',
      profile: {
        firstName: 'María',
        lastName: 'Rodríguez',
        position: 'Gerente Financiero',
        department: 'Administración',
        location: 'Oficina Lima',
        phone: '+51-555-444-333'
      },
      permissions: {
        role: 'financial_manager',
        approvalLimits: {
          maxAmount: 500000,
          currency: 'USD',
          categories: ['critical_spare', 'consumable', 'new_equipment', 'specialized_service', 'dangerous_material']
        },
        areas: ['administration', 'finance'],
        specialPermissions: ['budget_override', 'user_management', 'financial_override']
      }
    },
    {
      employeeId: 'EMP-2025-006',
      email: 'general@minera.com',
      password: 'password123',
      profile: {
        firstName: 'Eduardo',
        lastName: 'Mendoza',
        position: 'Gerente General',
        department: 'Administración',
        location: 'Oficina Principal',
        phone: '+51-444-333-222'
      },
      permissions: {
        role: 'general_manager',
        approvalLimits: {
          maxAmount: Number.MAX_SAFE_INTEGER,
          currency: 'USD',
          categories: ['critical_spare', 'consumable', 'new_equipment', 'specialized_service', 'dangerous_material']
        },
        areas: ['all'],
        specialPermissions: ['emergency_approval', 'budget_override', 'user_management', 'system_admin']
      }
    }
  ];

  for (const userData of users) {
    const existingUser = await User.findOne({ email: userData.email });
    if (!existingUser) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created user: ${userData.email}`);
    } else {
      console.log(`⚠️  User already exists: ${userData.email}`);
    }
  }
};

const seedApprovalRules = async () => {
  console.log('🌱 Seeding approval rules...');
  
  const rules = [
    {
      ruleName: 'Standard Purchase Approval - Low Amount',
      ruleType: 'amount_based',
      conditions: {
        amountRange: { min: 0, max: 5000, currency: 'USD' },
        itemCategories: ['critical_spare', 'consumable'],
        criticality: ['low', 'medium', 'high', 'critical'],
        departments: ['Mantenimiento Mina', 'Operaciones']
      },
      approvalSequence: [
        {
          level: 1,
          role: 'supervisor_maintenance',
          isRequired: true,
          slaHours: 4,
          canDelegate: true,
          parallelApproval: false
        }
      ],
      escalationRules: {
        enableAutoEscalation: true,
        escalationTimeHours: 8,
        escalateToRole: 'maintenance_manager'
      },
      createdBy: null // Will be set to first admin user
    },
    {
      ruleName: 'Standard Purchase Approval - Medium Amount',
      ruleType: 'amount_based',
      conditions: {
        amountRange: { min: 5001, max: 25000, currency: 'USD' },
        itemCategories: ['critical_spare', 'consumable', 'new_equipment'],
        criticality: ['low', 'medium', 'high', 'critical'],
        departments: ['Mantenimiento Mina', 'Operaciones']
      },
      approvalSequence: [
        {
          level: 1,
          role: 'supervisor_maintenance',
          isRequired: true,
          slaHours: 4,
          canDelegate: true,
          parallelApproval: false
        },
        {
          level: 2,
          role: 'maintenance_manager',
          isRequired: true,
          slaHours: 8,
          canDelegate: false,
          parallelApproval: false
        }
      ],
      escalationRules: {
        enableAutoEscalation: true,
        escalationTimeHours: 24,
        escalateToRole: 'operations_superintendent'
      },
      createdBy: null
    },
    {
      ruleName: 'High Value Purchase Approval',
      ruleType: 'amount_based',
      conditions: {
        amountRange: { min: 25001, max: 100000, currency: 'USD' },
        itemCategories: ['critical_spare', 'consumable', 'new_equipment', 'specialized_service'],
        criticality: ['low', 'medium', 'high', 'critical'],
        departments: ['Mantenimiento Mina', 'Operaciones']
      },
      approvalSequence: [
        {
          level: 1,
          role: 'supervisor_maintenance',
          isRequired: true,
          slaHours: 4,
          canDelegate: true,
          parallelApproval: false
        },
        {
          level: 2,
          role: 'maintenance_manager',
          isRequired: true,
          slaHours: 8,
          canDelegate: false,
          parallelApproval: false
        },
        {
          level: 3,
          role: 'operations_superintendent',
          isRequired: true,
          slaHours: 12,
          canDelegate: false,
          parallelApproval: false
        }
      ],
      escalationRules: {
        enableAutoEscalation: true,
        escalationTimeHours: 48,
        escalateToRole: 'financial_manager'
      },
      createdBy: null
    },
    {
      ruleName: 'Critical Emergency Approval',
      ruleType: 'criticality_based',
      conditions: {
        amountRange: { min: 0, max: Number.MAX_SAFE_INTEGER, currency: 'USD' },
        itemCategories: ['critical_spare', 'consumable', 'new_equipment', 'specialized_service'],
        criticality: ['critical'],
        departments: ['Mantenimiento Mina', 'Operaciones']
      },
      approvalSequence: [
        {
          level: 1,
          role: 'supervisor_maintenance',
          isRequired: true,
          slaHours: 1,
          canDelegate: true,
          parallelApproval: true
        },
        {
          level: 1,
          role: 'maintenance_manager',
          isRequired: true,
          slaHours: 2,
          canDelegate: false,
          parallelApproval: true
        }
      ],
      escalationRules: {
        enableAutoEscalation: true,
        escalationTimeHours: 4,
        escalateToRole: 'operations_superintendent'
      },
      createdBy: null
    }
  ];

  // Get first admin user for createdBy field
  const adminUser = await User.findOne({ 'permissions.role': 'general_manager' });
  
  for (const ruleData of rules) {
    ruleData.createdBy = adminUser._id;
    
    const existingRule = await ApprovalRule.findOne({ ruleName: ruleData.ruleName });
    if (!existingRule) {
      const rule = new ApprovalRule(ruleData);
      await rule.save();
      console.log(`✅ Created approval rule: ${ruleData.ruleName}`);
    } else {
      console.log(`⚠️  Approval rule already exists: ${ruleData.ruleName}`);
    }
  }
};

const seedSampleRequests = async () => {
  console.log('🌱 Seeding sample purchase requests...');
  
  const techUser = await User.findOne({ 'permissions.role': 'technical_field' });
  const supervisor = await User.findOne({ 'permissions.role': 'supervisor_maintenance' });
  const manager = await User.findOne({ 'permissions.role': 'maintenance_manager' });
  
  if (!techUser || !supervisor || !manager) {
    console.log('⚠️  Required users not found for sample requests');
    return;
  }

  const sampleRequests = [
    {
      requestor: {
        userId: techUser._id,
        name: `${techUser.profile.firstName} ${techUser.profile.lastName}`,
        role: techUser.permissions.role,
        department: techUser.profile.department,
        location: techUser.profile.location
      },
      requestDetails: {
        itemType: 'critical_spare',
        description: 'Bomba hidráulica para excavadora CAT 390F',
        specifications: {
          partNumber: 'CAT-7Y-1234',
          brand: 'Caterpillar',
          model: '390F',
          quantity: 2,
          unitOfMeasure: 'units',
          technicalSpecs: 'Presión máxima 350 bar, caudal 180 l/min'
        },
        criticality: 'critical',
        justification: 'Falla en bomba principal, equipo detenido. Pérdida de producción estimada en $50,000 por día.',
        estimatedCost: 25000,
        currency: 'USD',
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        attachments: []
      },
      approvalFlow: [
        {
          level: 1,
          role: 'supervisor_maintenance',
          status: 'pending'
        },
        {
          level: 2,
          role: 'maintenance_manager',
          status: 'pending'
        },
        {
          level: 3,
          role: 'operations_superintendent',
          status: 'pending'
        }
      ],
      metrics: {
        escalations: 0,
        slaCompliance: true
      },
      audit: {
        createdBy: techUser._id
      }
    },
    {
      requestor: {
        userId: techUser._id,
        name: `${techUser.profile.firstName} ${techUser.profile.lastName}`,
        role: techUser.permissions.role,
        department: techUser.profile.department,
        location: techUser.profile.location
      },
      requestDetails: {
        itemType: 'consumable',
        description: 'Aceite hidráulico Shell Tellus S2 M46',
        specifications: {
          partNumber: 'SHELL-T46-200L',
          brand: 'Shell',
          model: 'Tellus S2 M46',
          quantity: 10,
          unitOfMeasure: 'liters',
          technicalSpecs: 'Viscosidad ISO VG 46, temperatura operación -30°C a +100°C'
        },
        criticality: 'medium',
        justification: 'Reposición de stock para mantenimiento preventivo programado.',
        estimatedCost: 3500,
        currency: 'USD',
        requiredDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        attachments: []
      },
      approvalFlow: [
        {
          level: 1,
          role: 'supervisor_maintenance',
          userId: supervisor._id,
          userName: `${supervisor.profile.firstName} ${supervisor.profile.lastName}`,
          status: 'approved',
          comments: 'Stock necesario para mantenimiento preventivo. Aprobado.',
          actionDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
          timeToAction: 7200
        }
      ],
      status: 'approved',
      metrics: {
        totalApprovalTime: 7200,
        escalations: 0,
        slaCompliance: true
      },
      audit: {
        createdBy: techUser._id,
        changeLog: [
          {
            field: 'approvalFlow',
            oldValue: 'pending',
            newValue: 'approved',
            changedBy: supervisor._id,
            changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            reason: 'Approved by supervisor_maintenance'
          }
        ]
      }
    }
  ];

  for (const requestData of sampleRequests) {
    const existingRequest = await PurchaseRequest.findOne({ 
      'requestDetails.description': requestData.requestDetails.description 
    });
    
    if (!existingRequest) {
      const request = new PurchaseRequest(requestData);
      await request.save();
      console.log(`✅ Created sample request: ${request.requestNumber}`);
    } else {
      console.log(`⚠️  Sample request already exists: ${requestData.requestDetails.description}`);
    }
  }
};

const seedDatabase = async () => {
  try {
    console.log('🚀 Starting database seeding...');
    
    await connectDB();
    
    await seedUsers();
    await seedApprovalRules();
    await seedSampleRequests();
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('👤 Technical Field: tecnico@minera.com / password123');
    console.log('👤 Supervisor: supervisor@minera.com / password123');
    console.log('👤 Manager: manager@minera.com / password123');
    console.log('👤 Superintendent: superintendent@minera.com / password123');
    console.log('👤 Financial Manager: financial@minera.com / password123');
    console.log('👤 General Manager: general@minera.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedDatabase();
}

export default seedDatabase;