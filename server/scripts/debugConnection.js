import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const debugConnection = async () => {
  try {
    console.log('🔍 Debugging MongoDB Connection...');
    console.log('📍 Current working directory:', process.cwd());
    console.log('📍 Environment file path:', '.env');
    
    // Check if .env file exists
    const fs = await import('fs');
    const envExists = fs.existsSync('.env');
    console.log('📍 .env file exists:', envExists);
    
    // Check environment variables
    console.log('📍 NODE_ENV:', process.env.NODE_ENV);
    console.log('📍 MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('📍 MONGODB_URI length:', process.env.MONGODB_URI?.length || 0);
    
    if (process.env.MONGODB_URI) {
      // Mask password for security
      const maskedUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
      console.log('📍 MONGODB_URI (masked):', maskedUri);
      
      // Check URI format
      if (!process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
        console.error('❌ Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
        return;
      }
    } else {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.log('📋 Available environment variables:');
      Object.keys(process.env).forEach(key => {
        if (key.includes('MONGO') || key.includes('DB')) {
          console.log(`   ${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`);
        }
      });
      return;
    }
    
    console.log('\n🔄 Attempting MongoDB connection...');
    
    // Set mongoose options
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📊 Database Host: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    console.log(`📊 Connection State: ${conn.connection.readyState}`);
    console.log(`📊 Connection ID: ${conn.connection.id}`);
    
    // Test basic operations
    console.log('\n🧪 Testing database operations...');
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Existing collections:', collections.map(c => c.name));
    
    // Test write operation
    const testCollection = mongoose.connection.db.collection('connection_test');
    const testDoc = await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'Connection test successful',
      nodeVersion: process.version,
      mongooseVersion: mongoose.version
    });
    console.log('✅ Test document inserted:', testDoc.insertedId);
    
    // Test read operation
    const retrievedDoc = await testCollection.findOne({ _id: testDoc.insertedId });
    console.log('✅ Test document retrieved:', !!retrievedDoc);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: testDoc.insertedId });
    console.log('🧹 Test document cleaned up');
    
    console.log('\n✅ All database tests passed!');
    
  } catch (error) {
    console.error('\n❌ Connection failed with error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Server Selection Error - Possible causes:');
      console.error('   • Network connectivity issues');
      console.error('   • Incorrect hostname or port');
      console.error('   • IP address not whitelisted in MongoDB Atlas');
      console.error('   • Firewall blocking connection');
      console.error('   • MongoDB cluster is paused or unavailable');
    }
    
    if (error.name === 'MongoParseError') {
      console.error('\n💡 Parse Error - Possible causes:');
      console.error('   • Invalid connection string format');
      console.error('   • Special characters not properly encoded');
      console.error('   • Missing required parameters');
    }
    
    if (error.message.includes('authentication')) {
      console.error('\n💡 Authentication Error - Possible causes:');
      console.error('   • Incorrect username or password');
      console.error('   • User does not have access to the database');
      console.error('   • Authentication database is incorrect');
    }
    
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Verify your IP is whitelisted in MongoDB Atlas');
    console.error('2. Check username and password are correct');
    console.error('3. Ensure the cluster is running and accessible');
    console.error('4. Try connecting from MongoDB Compass with the same URI');
    
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Connection closed');
    }
    process.exit(0);
  }
};

debugConnection();