import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const detailedSeedDebug = async () => {
  try {
    console.log('🔍 Debug Detallado de Inserción de Datos\n');
    
    // 1. Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // 2. Importar modelos con validación
    let User;
    try {
      const userModule = await import('../models/User.js');
      User = userModule.default;
      console.log('✅ User model importado');
      console.log(`   📋 Collection: ${User.collection.name}`);
      console.log(`   📋 Schema paths: ${Object.keys(User.schema.paths).join(', ')}`);
    } catch (error) {
      console.error('❌ Error importando User model:', error);
      return;
    }
    
    // 3. Limpiar colección para prueba (opcional)
    console.log('\n🧹 Limpiando colección users para prueba...');
    await User.deleteMany({});
    const initialCount = await User.countDocuments();
    console.log(`📊 Documentos en users después de limpiar: ${initialCount}`);
    
    // 4. Crear un usuario simple primero - CON TODOS LOS CAMPOS REQUERIDOS
    console.log('\n🧪 Probando inserción de usuario simple...');
    const simpleUserData = {
      employeeId: 'TEST-001',
      email: 'test@minera.com',
      password: 'password123',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        position: 'Técnico de Prueba',        // REQUERIDO
        department: 'Mantenimiento Mina',     // REQUERIDO
        location: 'Oficina Central'           // REQUERIDO
      },
      permissions: {
        role: 'technical_field',              // REQUERIDO
        approvalLimits: {
          maxAmount: 0,
          currency: 'USD',
          categories: []
        },
        areas: ['maintenance'],
        specialPermissions: []
      }
    };
    
    try {
      // Validar datos antes de crear
      const tempUser = new User(simpleUserData);
      const validationError = tempUser.validateSync();
      if (validationError) {
        console.error('❌ Error de validación en usuario simple:', validationError.errors);
        // Mostrar cada error específico
        Object.keys(validationError.errors).forEach(field => {
          console.error(`   🔸 ${field}: ${validationError.errors[field].message}`);
        });
        return;
      }
      
      console.log('✅ Validación de usuario simple exitosa');
      
      // Intentar guardar
      const savedUser = await tempUser.save();
      console.log('✅ Usuario simple guardado:', savedUser._id);
      
      // Verificar que se guardó
      const foundUser = await User.findById(savedUser._id);
      console.log('✅ Usuario encontrado en DB:', !!foundUser);
      
    } catch (error) {
      console.error('❌ Error guardando usuario simple:', error);
      if (error.name === 'ValidationError') {
        Object.keys(error.errors).forEach(field => {
          console.error(`   🔸 ${field}: ${error.errors[field].message}`);
        });
      }
      return;
    }
    
    // 5. Ahora probar con datos completos
    console.log('\n🧪 Probando inserción de usuario completo...');
    const fullUserData = {
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
    };
    
    try {
      // Verificar si ya existe
      const existingUser = await User.findOne({ email: fullUserData.email });
      if (existingUser) {
        console.log('⚠️  Usuario ya existe, eliminando para prueba...');
        await User.deleteOne({ email: fullUserData.email });
      }
      
      // Validar estructura completa
      const fullUser = new User(fullUserData);
      const fullValidationError = fullUser.validateSync();
      if (fullValidationError) {
        console.error('❌ Error de validación en usuario completo:', fullValidationError.errors);
        Object.keys(fullValidationError.errors).forEach(field => {
          console.error(`   🔸 ${field}: ${fullValidationError.errors[field].message}`);
        });
        return;
      }
      
      console.log('✅ Validación de usuario completo exitosa');
      
      // Verificar si el schema tiene middleware pre-save
      const preSaveHooks = User.schema._pre;
      console.log('🔍 Pre-save hooks detectados:', preSaveHooks && preSaveHooks.get('save') ? 'SÍ' : 'NO');
      
      // Intentar guardar
      console.log('💾 Guardando usuario completo...');
      const savedFullUser = await fullUser.save();
      console.log('✅ Usuario completo guardado:', savedFullUser._id);
      console.log('   📧 Email:', savedFullUser.email);
      console.log('   👤 Nombre:', savedFullUser.profile.firstName, savedFullUser.profile.lastName);
      console.log('   🔐 Password hasheado:', savedFullUser.password !== 'password123');
      
    } catch (error) {
      console.error('❌ Error guardando usuario completo:', error);
      if (error.name === 'ValidationError') {
        console.error('📋 Errores de validación:');
        Object.keys(error.errors).forEach(field => {
          console.error(`   🔸 ${field}: ${error.errors[field].message}`);
        });
      }
      if (error.code === 11000) {
        console.error('📋 Error de duplicado - campos únicos:', error.keyPattern);
      }
      return;
    }
    
    // 6. Contar documentos finales
    const finalCount = await User.countDocuments();
    console.log(`\n📊 Total de usuarios en la base de datos: ${finalCount}`);
    
    // 7. Listar todos los usuarios
    const allUsers = await User.find({}, 'email profile.firstName profile.lastName permissions.role');
    console.log('\n👥 Usuarios encontrados:');
    allUsers.forEach(user => {
      console.log(`   📧 ${user.email} - ${user.profile?.firstName || 'N/A'} ${user.profile?.lastName || 'N/A'} (${user.permissions?.role || 'N/A'})`);
    });
    
    // 8. Probar inserción múltiple
    console.log('\n🧪 Probando inserción múltiple...');
    const multipleUsers = [
      {
        employeeId: 'EMP-2025-002',
        email: 'manager@minera.com',
        password: 'password123',
        profile: {
          firstName: 'Ana',
          lastName: 'García',
          position: 'Jefe de Mantenimiento',
          department: 'Mantenimiento Mina',
          location: 'Oficina Administrativa'
        },
        permissions: {
          role: 'maintenance_manager',
          approvalLimits: {
            maxAmount: 50000,
            currency: 'USD',
            categories: ['critical_spare', 'consumable']
          },
          areas: ['maintenance'],
          specialPermissions: ['emergency_approval']
        }
      },
      {
        employeeId: 'EMP-2025-003',
        email: 'tecnico@minera.com',
        password: 'password123',
        profile: {
          firstName: 'Juan',
          lastName: 'Pérez',
          position: 'Técnico de Campo',
          department: 'Mantenimiento Mina',
          location: 'Taller Central'
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
      }
    ];
    
    try {
      const insertResult = await User.insertMany(multipleUsers, { ordered: false });
      console.log(`✅ Inserción múltiple exitosa: ${insertResult.length} usuarios`);
    } catch (error) {
      console.error('❌ Error en inserción múltiple:', error);
      if (error.writeErrors) {
        error.writeErrors.forEach((err, index) => {
          console.error(`   🔸 Error en usuario ${index + 1}:`, err.errmsg);
        });
      }
    }
    
    // 9. Conteo final
    const veryFinalCount = await User.countDocuments();
    console.log(`\n📊 Conteo final de usuarios: ${veryFinalCount}`);
    
    // 10. Verificar que las contraseñas se hashearon correctamente
    console.log('\n🔐 Verificando hashing de contraseñas...');
    const testUser = await User.findOne({ email: 'test@minera.com' });
    if (testUser) {
      const passwordMatch = await testUser.comparePassword('password123');
      console.log('✅ Password original coincide:', passwordMatch);
      console.log('✅ Password está hasheado:', testUser.password !== 'password123');
    }
    
    console.log('\n✅ Debug completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(0);
  }
};

detailedSeedDebug();