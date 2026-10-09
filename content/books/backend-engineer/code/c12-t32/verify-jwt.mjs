import express, { Router } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Demo values only; the project reads real ones from .env.
process.env.ACCESS_TOKEN_SECRET = 'demo-access-secret';
process.env.ACCESS_TOKEN_EXPIRY = '15m';

// Earlier lessons, condensed so this file runs on its own.
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    Object.assign(this, { statusCode, errors, success: false });
  }
}
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  refreshToken: String,
  emailVerificationToken: String,
  forgotPasswordToken: String,
});
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, username: this.username },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );
};
const User = mongoose.model('User', userSchema);

// src/middlewares/auth.middlewares.js: this lesson
const SECRET_FIELDS =
  '-password -refreshToken -emailVerificationToken -emailVerificationExpiry ' +
  '-forgotPasswordToken -forgotPasswordExpiry';

const verifyJWT = asyncHandler(async (req, res, next) => {
  const header = req.get('Authorization') ?? '';
  const token =
    req.cookies?.accessToken ||
    (header.startsWith('Bearer ') ? header.slice(7) : '');
  if (!token) throw new ApiError(401, 'Unauthorized request');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid access token');
  }
  const user = await User.findById(decoded._id).select(SECRET_FIELDS);
  if (!user) throw new ApiError(401, 'Invalid access token');
  req.user = user;
  next();
});

// src/routes/auth.routes.js and src/app.js
const router = Router();
router.route('/current-user').get(verifyJWT, (req, res) => res.json(req.user));
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
const user = await User.create({
  username: 'ada',
  password: 'demo-hash',
  refreshToken: 'demo-refresh',
});
const token = user.generateAccessToken();
const past = Math.floor(Date.now() / 1000) - 10;
const expired = jwt.sign(
  { _id: user._id, exp: past },
  process.env.ACCESS_TOKEN_SECRET,
);

const server = app.listen(0, async () => {
  const { port } = server.address();
  const url = `http://localhost:${port}/api/v1/auth/current-user`;
  const call = async (label, headers) => {
    const res = await fetch(url, { headers });
    const body = await res.json();
    console.log(label.padEnd(13), res.status, body.username ?? body.message);
    return body;
  };
  await call('no token', {});
  await call('garbage', { Cookie: 'accessToken=abc' });
  await call('expired', { Cookie: `accessToken=${expired}` });
  const body = await call('cookie', { Cookie: `accessToken=${token}` });
  console.log('secrets sent:', 'password' in body || 'refreshToken' in body);
  await call('bearer header', { Authorization: `Bearer ${token}` });
  await User.deleteOne({ _id: user._id });
  await call('deleted user', { Cookie: `accessToken=${token}` });
  server.close();
  await mongoose.disconnect();
});
