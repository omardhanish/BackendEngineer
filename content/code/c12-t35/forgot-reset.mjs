import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import express, { Router } from 'express';
import mongoose from 'mongoose';

// Demo value only; the project reads the real one from .env.
process.env.FORGOT_PASSWORD_REDIRECT_URL = 'https://app.example.com/reset';

// Earlier lessons, condensed: utils, mail helpers and a trimmed User.
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
const forgotPasswordMailgenContent = (username, url) => ({
  body: { name: username, action: { button: { text: 'Reset', link: url } } },
});

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  refreshToken: String,
  forgotPasswordToken: String,
  forgotPasswordExpiry: Date,
});
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});
userSchema.methods.generateTemporaryToken = function () {
  const unHashedToken = crypto.randomBytes(20).toString('hex');
  const tokenExpiry = Date.now() + 20 * 60 * 1000;
  return { unHashedToken, hashedToken: sha256(unHashedToken), tokenExpiry };
};
const User = mongoose.model('User', userSchema);

// src/controllers/auth.controllers.js: this lesson
const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const { unHashedToken, hashedToken, tokenExpiry } =
      user.generateTemporaryToken();
    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpiry = tokenExpiry;
    await user.save();

    const base = process.env.FORGOT_PASSWORD_REDIRECT_URL;
    await sendEmail({
      email: user.email,
      subject: 'Reset your password',
      mailgenContent: forgotPasswordMailgenContent(
        user.username,
        `${base}/${unHashedToken}`,
      ),
    });
  }
  const message = 'If that email has an account, a reset link was sent';
  res.status(200).json(new ApiResponse(200, {}, message));
});

const resetForgottenPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    forgotPasswordToken: sha256(req.params.resetToken),
    forgotPasswordExpiry: { $gt: Date.now() },
  });
  if (!user) throw new ApiError(400, 'Token is invalid or expired');

  user.password = req.body.newPassword;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;
  user.refreshToken = undefined;
  await user.save();
  res.status(200).json(new ApiResponse(200, {}, 'Password reset'));
});

// src/routes/auth.routes.js and src/app.js
const router = Router();
router.route('/forgot-password').post(forgotPasswordRequest);
router.route('/reset-password/:resetToken').post(resetForgottenPassword);
const app = express();
app.use(express.json());
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
  email: 'ada@example.com',
  password: 'old-pass',
  refreshToken: 'stored',
});

const server = app.listen(0, async () => {
  const { port } = server.address();
  const call = async (path, body) => {
    const res = await fetch(`http://localhost:${port}/api/v1/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.status;
  };
  const forgot = (email) => call('/forgot-password', { email });
  const reset = (token) =>
    call(`/reset-password/${token}`, { newPassword: 'new-pass' });
  const tokenOf = (i) =>
    outbox[i].mailgenContent.body.action.button.link.split('/').pop();

  console.log('known email:', await forgot('ada@example.com'));
  console.log('unknown email:', await forgot('bob@example.com'));
  console.log('mails sent:', outbox.length);
  const stored = (await User.findOne()).forgotPasswordToken;
  console.log('stored is sha256 of token:', stored === sha256(tokenOf(0)));

  await User.updateOne({}, { forgotPasswordExpiry: new Date(Date.now() - 1) });
  console.log('expired token:', await reset(tokenOf(0)));
  await forgot('ada@example.com');
  console.log('fresh token:', await reset(tokenOf(1)));

  const after = await User.findOne();
  const works = (password) => bcrypt.compare(password, after.password);
  console.log('new password works:', await works('new-pass'));
  console.log('old password works:', await works('old-pass'));
  console.log('token cleared:', after.forgotPasswordToken === undefined);
  console.log('sessions ended:', after.refreshToken === undefined);
  console.log('same link again:', await reset(tokenOf(1)));
  server.close();
  await mongoose.disconnect();
});
