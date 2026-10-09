import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Demo values; the project reads real ones from .env.
Object.assign(process.env, {
  ACCESS_TOKEN_SECRET: 'demo-access-secret',
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_SECRET: 'demo-refresh-secret',
  REFRESH_TOKEN_EXPIRY: '7d',
});

// Earlier lessons, condensed so this file runs on its own.
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
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  refreshToken: String,
});
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});
userSchema.methods.isPasswordCorrect = function (password) {
  return bcrypt.compare(password, this.password);
};
userSchema.methods.generateAccessToken = function () {
  const claims = { _id: this._id, username: this.username };
  return jwt.sign(claims, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};
const User = mongoose.model('User', userSchema);

// src/controllers/auth.controllers.js: this lesson
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save();

  const loggedInUser = await User.findById(user._id).select(
    '-password -refreshToken -emailVerificationToken -emailVerificationExpiry',
  );
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };
  res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(new ApiResponse(200, { user: loggedInUser }, 'Logged in'));
});

const app = express();
app.use(express.json());
app.post('/api/v1/auth/login', loginUser);
app.use((err, req, res, next) => {
  const known = err instanceof ApiError;
  const fail = known ? err : new ApiError(500, 'Internal Server Error');
  const { statusCode, message, success, errors } = fail;
  res.status(statusCode).json({ statusCode, message, success, errors });
});

await mongoose.connect(process.env.MONGO_URI);
const ada = { email: 'ada@example.com', password: 'demo-password' };
await User.create({ username: 'ada', ...ada });

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/api/v1/auth/login`;
  const login = async (payload) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return [res, await res.json()];
  };

  const [res, reply] = await login(ada);
  console.log(res.status, reply.message, Object.keys(reply.data));
  const cookies = res.headers.getSetCookie();
  console.log(cookies.map((c) => c.replace(/=[^;]*/, '=<jwt>')));
  const sent = cookies[1].split(';')[0].split('=')[1];
  const stored = await User.findOne({ email: ada.email });
  console.log('db holds the refresh token:', stored.refreshToken === sent);

  const bad = [
    { ...ada, password: 'wrong-password' },
    { ...ada, email: 'bob@example.com' },
  ];
  for (const payload of bad) {
    const [fail, body] = await login(payload);
    console.log(fail.status, body.message, fail.headers.getSetCookie().length);
  }

  process.env.NODE_ENV = 'production';
  const [prod] = await login(ada);
  console.log(prod.headers.getSetCookie()[0].replace(/=[^;]*/, '=<jwt>'));
  server.close();
  await mongoose.disconnect();
});
