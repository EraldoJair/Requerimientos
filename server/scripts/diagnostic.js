import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const diagnoseSetup = async () => {
  console.log('🔍 Diagnóstico del Sistema de Seeding...\n');
  
  // 1. Verificar estructura de archivos
  console.log('📁 Verificando estructura de archivos:');
  const requiredPaths = [
    '../models/User.js',
    '../models/PurchaseRequest.js',
    '../models/ApprovalRule.js',
    '../config/database.js'
  ];
  
  for (const filePath of requiredPaths) {
    const fullPath = path.resolve(__dirname, filePath);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? '✅' : '❌'} ${filePath} ${exists ? 'EXISTS' : 'MISSING'}`);
    if (exists) {
      const stats = fs.statSync(fullPath);
      console.log(`   📊 Size: ${stats.size} bytes, Modified: ${stats.mtime.toLocaleString()}`);
    }
  }
  
  // 2. Verificar conexión a DB
  console.log('\n🔗 Verificando conexión a base de datos:');
  try {
    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI no encontrada');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conexión a MongoDB exitosa');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // 3. Intentar importar modelos
    console.log('\n📦 Verificando importación de modelos:');
    
    try {
      const { default: User } = await import('../models/User.js');
      console.log('✅ User model importado correctamente');
      console.log(`   📋 Collection: ${User.collection.name}`);
      console.log(`   📋 Schema fields: ${Object.keys(User.schema.paths).slice(0, 5).join(', ')}...`);
    } catch (error) {
      console.log('❌ Error importando User model:', error.message);
    }
    
    try {
      const { default: PurchaseRequest } = await import('../models/PurchaseRequest.js');
      console.log('✅ PurchaseRequest model importado correctamente');
      console.log(`   📋 Collection: ${PurchaseRequest.collection.name}`);
    } catch (error) {
      console.log('❌ Error importando PurchaseRequest model:', error.message);
    }
    
    try {
      const { default: ApprovalRule } = await import('../models/ApprovalRule.js');
      console.log('✅ ApprovalRule model importado correctamente');
      console.log(`   📋 Collection: ${ApprovalRule.collection.name}`);
    } catch (error) {
      console.log('❌ Error importando ApprovalRule model:', error.message);
    }
    
    // 4. Verificar colecciones existentes
    console.log('\n📋 Colecciones existentes en la base de datos:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    if (collections.length === 0) {
      console.log('⚠️  No hay colecciones en la base de datos');
    } else {
      collections.forEach(col => {
        console.log(`   📄 ${col.name}`);
      });
    }
    
    // 5. Verificar datos existentes
    console.log('\n📊 Conteo de documentos:');
    for (const col of collections) {
      try {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        console.log(`   📄 ${col.name}: ${count} documentos`);
      } catch (error) {
        console.log(`   ❌ Error contando ${col.name}: ${error.message}`);
      }
    }
    
    // 6. Probar creación de documento simple
    console.log('\n🧪 Probando inserción directa:');
    try {
      const testDoc = await mongoose.connection.db.collection('test_collection').insertOne({
        test: true,
        timestamp: new Date(),
        message: 'Test document'
      });
      console.log('✅ Inserción directa exitosa:', testDoc.insertedId);
      
      // Limpiar
      await mongoose.connection.db.collection('test_collection').deleteOne({ _id: testDoc.insertedId });
      console.log('🧹 Documento de prueba eliminado');
    } catch (error) {
      console.log('❌ Error en inserción directa:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
  
  // 7. Verificar permisos de escritura en directorio
  console.log('\n📝 Verificando permisos:');
  try {
    const testFile = path.resolve(__dirname, 'test_write.tmp');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Permisos de escritura en directorio OK');
  } catch (error) {
    console.log('❌ Sin permisos de escritura:', error.message);
  }
  
  console.log('\n🏁 Diagnóstico completado');
  process.exit(0);
};

diagnoseSetup();