import mongoose from 'mongoose';

// Atlas or local: only the value of MONGO_URI changes.
await mongoose.connect(process.env.MONGO_URI);
console.log('connected to', mongoose.connection.name);
await mongoose.disconnect();

try {
  await mongoose.connect('mongodb://127.0.0.1:1/app', {
    serverSelectionTimeoutMS: 500,
  });
} catch (err) {
  console.log('rejected:', err.name);
}
