const mongoose = require('mongoose');

const connectDB = async () => {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        family: 4,
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB attempt ${attempt}/${maxRetries}: ${error.message}`);
      if (attempt === maxRetries) {
        console.error('❌ All MongoDB connection attempts failed');
        process.exit(1);
      }
      console.log(`⏳ Retrying in 3 seconds...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};

module.exports = connectDB;
