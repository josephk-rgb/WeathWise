require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    const baseUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'wealthwise';
    
    console.log('Testing MongoDB Atlas connection...');
    console.log('Base URI:', baseUri ? 'Found' : 'Missing');
    console.log('Database Name:', dbName);
    
    if (!baseUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    // Construct the URI
    let mongoUri;
    if (baseUri.includes('mongodb.net/?')) {
      mongoUri = baseUri.replace('mongodb.net/?', `mongodb.net/${dbName}?`);
    } else {
      mongoUri = baseUri;
    }
    
    console.log('Connection URI:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });
    
    console.log('✅ MongoDB Atlas connection successful!');
    console.log('Connected to database:', mongoose.connection.db.databaseName);
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testConnection();
