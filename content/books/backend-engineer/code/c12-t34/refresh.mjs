import express, { Router } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Demo values only; the project reads real ones from .env.
Object.assign(process.env, {
  ACCESS_TOKEN_SECRET: 'demo-access-secret',
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_SECRET: 'demo-refresh-secret',
  REFRESH_TOKEN_EXPIRY: '7d',
});

// Earlier lessons, condensed: utils and a trimmed User with its token methods.
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
  refreshToken: String,
});
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, username: this.username },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};
const User = mongoose.model('User', userSchema);

// src/controllers/auth.controllers.js: this lesson
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incoming = req.cookies.refreshToken || req.body?.refreshToken;
  if (!incoming) throw new ApiError(401, 'Unauthorized request');

  let decoded;
  try {
    decoded = jwt.verify(incoming, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }
  const user = await User.findById(decoded._id);
  if (!user || user.refreshToken !== incoming) {
    throw new ApiError(401, 'Refresh token is expired or used');
  }

  const accessToken = user.generateAccessToken();
  user.refreshToken = user.generateRefreshToken();
  await user.save();

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };
  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', user.refreshToken, options)
    .json(new ApiResponse(200, {}, 'Access token refreshed'));
});

// src/routes/auth.routes.js and src/app.js
const router = Router();
router.route('/refresh-token').post(refreshAccessToken);
const app = express();
app.use(express.json(), cookieParser());
app.use('/api/v1/auth', router);
app.use((err, req, res, next) => {
  const known = err instanceof ApiError;
  const fail = known ? err : new ApiError(500, 'Internal Server Error');
  const { statusCode, message, success, errors } = fail;
  res.status(statusCode).json({ statusCode, message, success, errors });
});

await mongoose.connect(process.env.MONGO_URI);
const user = await User.create({ username: 'ada' });
// Issued a minute ago: equal claims in the same second give equal tokens.
const issued = Math.floor(Date.now() / 1000) - 60;
const old = jwt.sign(
  { _id: user._id, iat: issued },
  process.env.REFRESH_TOKEN_SECRET,
  { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
);
await User.updateOne({ _id: user._id }, { refreshToken: old });

const server = app.listen(0, async () => {
  const { port } = server.address();
  const url = `http://localhost:${port}/api/v1/auth/refresh-token`;
  const refresh = async (label, token) => {
    const headers = { Cookie: `refreshToken=${token}` };
    const res = await fetch(url, { method: 'POST', headers });
    const { message } = await res.json();
    const names = res.headers.getSetCookie().map((c) => c.split('=')[0]);
    console.log(label.padEnd(12), res.status, message, names);
    return res;
  };
  await refresh('garbage', 'abc');
  await refresh('access token', user.generateAccessToken());
  const ok = await refresh('valid', old);
  const fresh = ok.headers.getSetCookie()[1].split(';')[0].split('=')[1];
  console.log('rotated:', fresh !== old);
  await refresh('old again', old);
  await refresh('new token', fresh);
  server.close();
  await mongoose.disconnect();
});
