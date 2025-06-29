import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Set mongoose options for better connection handling
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);
    
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('📍 Connection URI:', process.env.MONGODB_URI ? 'URI loaded from .env' : 'URI NOT FOUND');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Remove deprecated options
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000,
      maxConnecting: 2
    });
    
    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`📊 Database Host: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    console.log(`📊 Connection State: ${conn.connection.readyState}`);
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
    mongoose.connection.on('connecting', () => {
      console.log('🔄 MongoDB connecting...');
    });
    
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
    });
    
    return conn;
    
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    console.error('💡 Connection string format should be: mongodb+srv://username:password@cluster.mongodb.net/database');
    console.error('💡 Make sure your IP is whitelisted in MongoDB Atlas');
    console.error('💡 Verify your username and password are correct');
    process.exit(1);
  }
};

export default connectDB;