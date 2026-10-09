import express, { Router } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Demo value only; the project reads the real one from .env.
process.env.ACCESS_TOKEN_SECRET = 'demo-access-secret';

// Earlier lessons, condensed: utils, a trimmed User and a trimmed verifyJWT.
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
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  refreshToken: String,
}));
const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const { _id } = jwt.verify(req.cookies.accessToken, secret);
    req.user = await User.findById(_id);
  } catch {
    throw new ApiError(401, 'Invalid access token');
  }
  next();
});

// src/controllers/auth.controllers.js: this lesson
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };
  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'User logged out'));
});

// src/routes/auth.routes.js and src/app.js
const router = Router();
router.route('/logout').post(verifyJWT, logoutUser);
const app = express();
app.use(cookieParser());
app.use('/api/v1/auth', router);
app.use((err, req, res, next) => {
  const known = err instanceof ApiError;
  const fail = known ? err : new ApiError(500, 'Internal Server Error');
  const { statusCode, message, success, errors } = fail;
  res.status(statusCode).json({ statusCode, message, success, errors });
});

await mongoose.connect(process.env.MONGO_URI);
const user = await User.create({ username: 'ada', refreshToken: 'stored' });
const secret = process.env.ACCESS_TOKEN_SECRET;
const access = jwt.sign({ _id: user._id }, secret, { expiresIn: '15m' });

const server = app.listen(0, async () => {
  const { port } = server.address();
  const url = `http://localhost:${port}/api/v1/auth/logout`;
  const headers = { Cookie: `accessToken=${access}` };
  const logout = () => fetch(url, { method: 'POST', headers });
  const res = await logout();
  console.log('status:', res.status);
  res.headers.getSetCookie().forEach((c) => console.log(c));
  const stored = await User.findById(user._id);
  console.log('stored refreshToken:', stored.refreshToken);
  console.log('same access token:', (await logout()).status);
  server.close();
  await mongoose.disconnect();
});
