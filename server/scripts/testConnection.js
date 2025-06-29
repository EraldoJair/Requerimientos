import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const testConnection = async () => {
  try {
    console.log('🧪 Testing MongoDB Connection...');
    console.log('📍 Environment:', process.env.NODE_ENV);
    console.log('📍 MongoDB URI exists:', !!process.env.MONGODB_URI);
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }
    
    // Connect to database
    await connectDB();
    
    // Test basic operations
    console.log('🧪 Testing database operations...');
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Existing collections:', collections.map(c => c.name));
    
    // Test write operation
    const testCollection = mongoose.connection.db.collection('test');
    const testDoc = await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'Connection test successful' 
    });
    console.log('✅ Test document inserted:', testDoc.insertedId);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: testDoc.insertedId });
    console.log('🧹 Test document cleaned up');
    
    console.log('✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
    process.exit(0);
  }
};

testConnection();