import crypto from 'node:crypto';
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
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpiry: Date,
}));

// src/controllers/auth.controllers.js: the last two controllers
const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    emailVerificationToken: sha256(req.params.verificationToken),
    emailVerificationExpiry: { $gt: Date.now() },
  });
  if (!user) throw new ApiError(400, 'Token is invalid or expired');

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save();
  const data = { isEmailVerified: true };
  res.status(200).json(new ApiResponse(200, data, 'Email verified'));
});

const getCurrentUser = (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user, 'Current user fetched'));
};

// src/routes/auth.routes.js and src/app.js; the first middleware stands in
// for verifyJWT, which sets req.user on secured routes.
const router = Router();
router.route('/verify-email/:verificationToken').get(verifyEmail);
router.route('/current-user').get(getCurrentUser);
const app = express();
app.use(async (req, res, next) => {
  req.user = await User.findOne({ username: 'ada' });
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
await User.create({
  username: 'ada',
  emailVerificationToken: sha256('demo-token'),
  emailVerificationExpiry: Date.now() + 20 * 60 * 1000,
});

const server = app.listen(0, async () => {
  const { port } = server.address();
  const get = async (path) => {
    const res = await fetch(`http://localhost:${port}/api/v1/auth${path}`);
    const { message, data } = await res.json();
    return [res.status, message, data];
  };
  const show = async (label, path) => {
    const [status, message] = await get(path);
    console.log(label.padEnd(18), status, message);
  };
  await show('wrong token:', '/verify-email/nope');
  await show('right token:', '/verify-email/demo-token');
  const ada = await User.findOne();
  console.log('verified in db:', ada.isEmailVerified);
  console.log('token cleared:', ada.emailVerificationToken === undefined);
  await show('same link again:', '/verify-email/demo-token');
  const [, , user] = await get('/current-user');
  console.log('current user:', user.username);
  server.close();
  await mongoose.disconnect();
});
