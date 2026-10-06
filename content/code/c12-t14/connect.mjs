import mongoose from 'mongoose';

const DB_NAME = 'auth-backend'; // lives in src/constants.js

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: DB_NAME,
    serverSelectionTimeoutMS: 5000,
  });
};

await connectDB();
console.log(mongoose.connection.name, mongoose.connection.readyState);
await mongoose.disconnect();

process.env.MONGO_URI = 'mongodb://127.0.0.1:1'; // nothing listens here
await connectDB().catch((error) => console.log(error.name));
