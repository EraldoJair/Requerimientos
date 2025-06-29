import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const createInitialUsers = async () => {
  try {
    console.log('🌱 Creating initial users...');
    
    await connectDB();
    
    const users = [
      {
        employeeIdInterno: 'EMP-2025-001',
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
        employeeIdInterno: 'EMP-2025-002',
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
          specialPermissions: ['emergency_approval', 'budget_override', 'user_management']
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
    
    console.log('✅ Initial users created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('👤 Supervisor: supervisor@minera.com / password123');
    console.log('👤 Manager: manager@minera.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating initial users:', error);
    process.exit(1);
  }
};

// Run if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  createInitialUsers();
}

export default createInitialUsers;