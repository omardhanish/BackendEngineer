import bcrypt from 'bcryptjs';
import express, { Router } from 'express';
import mongoose from 'mongoose';

// Earlier lessons, condensed: utils and a trimmed User.
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    Object.assign(this, { statusCode, errors, success: false });
  }
}
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    Object.assign(this, { statusCode, data, message });
    this.success = statusCode < 400;
  }
}
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});
userSchema.methods.isPasswordCorrect = function (password) {
  return bcrypt.compare(password, this.password);
};
const User = mongoose.model('User', userSchema);

// src/controllers/auth.controllers.js: this lesson
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!(await user.isPasswordCorrect(oldPassword))) {
    throw new ApiError(400, 'Invalid old password');
  }
  user.password = newPassword;
  await user.save();
  res.status(200).json(new ApiResponse(200, {}, 'Password changed'));
});

// src/routes/auth.routes.js and src/app.js; the first middleware stands in
// for verifyJWT, which loads req.user without the password field.
const router = Router();
router.route('/change-password').post(changeCurrentPassword);
const app = express();
app.use(express.json());
app.use(async (req, res, next) => {
  req.user = await User.findOne({ username: 'ada' }).select('-password');
  next();
});
app.use('/api/v1/auth', router);
app.use((err, req, res, next) => {
  const known = err instanceof ApiError;
  const fail = known ? err : new ApiError(500, 'Internal Server Error');
  const { statusCode, message, success, errors } = fail;
  res.status(statusCode).json({ statusCode, message, success, errors });
});

await mongoose.connect(process.env.MONGO_URI);
await User.create({ username: 'ada', password: 'old-pass' });

const server = app.listen(0, async () => {
  const { port } = server.address();
  const url = `http://localhost:${port}/api/v1/auth/change-password`;
  const change = async (oldPassword, newPassword) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    return res.status;
  };
  console.log('wrong old password:', await change('guess', 'new-pass'));
  console.log('right old password:', await change('old-pass', 'new-pass'));

  const saved = await User.findOne();
  console.log('new password works:', await saved.isPasswordCorrect('new-pass'));
  console.log('old password works:', await saved.isPasswordCorrect('old-pass'));
  console.log('stored as plain text:', saved.password === 'new-pass');
  server.close();
  await mongoose.disconnect();
});
