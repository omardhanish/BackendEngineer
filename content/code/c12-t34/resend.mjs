import crypto from 'node:crypto';
import express, { Router } from 'express';
import mongoose from 'mongoose';

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
const emailVerificationMailgenContent = (username, url) => ({
  body: { name: username, action: { button: { text: 'Verify', link: url } } },
});

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpiry: Date,
});
userSchema.methods.generateTemporaryToken = function () {
  const unHashedToken = crypto.randomBytes(20).toString('hex');
  const tokenExpiry = Date.now() + 20 * 60 * 1000;
  return { unHashedToken, hashedToken: sha256(unHashedToken), tokenExpiry };
};
const User = mongoose.model('User', userSchema);

// src/controllers/auth.controllers.js: this lesson
const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User does not exist');
  if (user.isEmailVerified) {
    throw new ApiError(409, 'Email is already verified');
  }

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
  return res.status(200).json(new ApiResponse(200, {}, 'Mail sent'));
});

// src/routes/auth.routes.js and src/app.js; the first middleware stands in
// for verifyJWT and sets req.user.
const router = Router();
router.route('/resend-email-verification').post(resendEmailVerification);
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
await User.create({ username: 'ada', email: 'ada@example.com' });

const server = app.listen(0, async () => {
  const { port } = server.address();
  const url = `http://localhost:${port}/api/v1/auth/resend-email-verification`;
  const resend = async () => {
    const res = await fetch(url, { method: 'POST' });
    return [res.status, (await res.json()).message];
  };
  const stored = async () => (await User.findOne()).emailVerificationToken;
  const lastToken = () =>
    outbox.at(-1).mailgenContent.body.action.button.link.split('/').pop();

  console.log('resend:', ...(await resend()));
  console.log('mailed to:', outbox[0].email, '|', outbox[0].subject);
  const first = await stored();
  console.log('stored is sha256 of link token:', first === sha256(lastToken()));
  console.log('stored is the link token:', first === lastToken());

  await resend();
  console.log('second resend replaced it:', (await stored()) !== first);

  await User.updateOne({ username: 'ada' }, { isEmailVerified: true });
  console.log('verified user:', ...(await resend()));
  server.close();
  await mongoose.disconnect();
});
