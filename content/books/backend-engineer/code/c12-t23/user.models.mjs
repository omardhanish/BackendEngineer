import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Demo values; the project reads real ones from .env.
Object.assign(process.env, {
  ACCESS_TOKEN_SECRET: 'demo-access-secret',
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_SECRET: 'demo-refresh-secret',
  REFRESH_TOKEN_EXPIRY: '7d',
});

const sha256 = (text) =>
  crypto.createHash('sha256').update(text).digest('hex');

const userSchema = new mongoose.Schema({ username: String, email: String });

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

userSchema.methods.generateTemporaryToken = function () {
  const unHashedToken = crypto.randomBytes(20).toString('hex');
  const hashedToken = sha256(unHashedToken);
  const tokenExpiry = Date.now() + 20 * 60 * 1000;
  return { unHashedToken, hashedToken, tokenExpiry };
};

const User = mongoose.model('User', userSchema);
const user = new User({ username: 'ada', email: 'ada@example.com' });
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

const access = jwt.verify(user.generateAccessToken(), ACCESS_TOKEN_SECRET);
const refresh = jwt.verify(user.generateRefreshToken(), REFRESH_TOKEN_SECRET);
console.log('access claims:', Object.keys(access));
console.log('refresh claims:', Object.keys(refresh));

const temp = user.generateTemporaryToken();
console.log('lengths:', temp.unHashedToken.length, temp.hashedToken.length);
console.log('hash matches:', sha256(temp.unHashedToken) === temp.hashedToken);
console.log('expires later:', temp.tokenExpiry > Date.now());
