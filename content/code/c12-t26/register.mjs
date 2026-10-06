import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';

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
const outbox = []; // the real sendEmail sends; this one keeps the message
const sendEmail = async (options) => { outbox.push(options); };
const emailVerificationMailgenContent = (username, url) => ({
  body: { name: username, action: { button: { text: 'Verify', link: url } } },
});

const unique = () => ({
  type: String, required: true, unique: true, lowercase: true, trim: true,
});
const userSchema = new mongoose.Schema({
  username: unique(),
  email: unique(),
  password: { type: String, required: true },
  isEmailVerified: { type: Boolean, default: false },
  refreshToken: String,
  emailVerificationToken: String,
  emailVerificationExpiry: Date,
});
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});
userSchema.methods.generateTemporaryToken = function () {
  const unHashedToken = crypto.randomBytes(20).toString('hex');
  const hashedToken = crypto
    .createHash('sha256').update(unHashedToken).digest('hex');
  const tokenExpiry = Date.now() + 20 * 60 * 1000;
  return { unHashedToken, hashedToken, tokenExpiry };
};
const User = mongoose.model('User', userSchema);

// src/controllers/auth.controllers.js: this lesson
export const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  const taken = await User.findOne({ $or: [{ username }, { email }] });
  if (taken) throw new ApiError(409, 'Username or email already in use');

  const user = new User({ email, username, password });
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save();

  const base = `${req.protocol}://${req.get('host')}/api/v1/auth`;
  await sendEmail({
    email: user.email,
    subject: 'Verify your email',
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${base}/verify-email/${unHashedToken}`,
    ),
  });

  const created = await User.findById(user._id).select(
    '-password -refreshToken -emailVerificationToken -emailVerificationExpiry',
  );
  const message = 'User registered. Check your email to verify it.';
  res.status(201).json(new ApiResponse(201, { user: created }, message));
});

const app = express();
app.use(express.json());
app.post('/api/v1/auth/register', registerUser);
app.use((err, req, res, next) => {
  const known = err instanceof ApiError;
  const fail = known ? err : new ApiError(500, 'Internal Server Error');
  const { statusCode, message, success, errors } = fail;
  res.status(statusCode).json({ statusCode, message, success, errors });
});

await mongoose.connect(process.env.MONGO_URI);
const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/api/v1/auth/register`;
  const post = async (body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return [res.status, await res.json()];
  };
  const ada = {
    username: 'ada',
    email: 'ada@example.com',
    password: 'demo-password',
  };

  const [status, { data }] = await post(ada);
  console.log(status, data.user.username, data.user.isEmailVerified);
  console.log('password in reply:', 'password' in data.user);

  const sent = outbox[0];
  const token = sent.mailgenContent.body.action.button.link.split('/').pop();
  const stored = await User.findOne({ email: ada.email });
  const sha = crypto.createHash('sha256').update(token).digest('hex');
  console.log('mail to', sent.email);
  console.log('db holds raw token:', stored.emailVerificationToken === token);
  console.log('db holds its hash:', stored.emailVerificationToken === sha);
  const ms = stored.emailVerificationExpiry - Date.now();
  console.log('minutes to expiry:', Math.round(ms / 60000));

  for (const body of [ada, {}]) {
    const [code, reply] = await post(body);
    console.log(code, reply.message);
  }
  server.close();
  await mongoose.disconnect();
});
