import 'dotenv/config';
import app from './app.js';
import connectDB from './db/index.js';

const port = process.env.PORT ?? 3000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
