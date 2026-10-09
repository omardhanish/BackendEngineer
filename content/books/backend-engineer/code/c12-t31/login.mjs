import express, { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';

// Earlier lessons, condensed so this file runs on its own.
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    Object.assign(this, { statusCode, errors, success: false });
  }
}
const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  password: String,
}));
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  throw new ApiError(422, 'Received data is not valid', errors);
};

// src/validators/index.js: this lesson
const userLoginValidator = () => [
  body('email')
    .trim().notEmpty().withMessage('Email is required').bail()
    .isEmail().withMessage('Email is invalid'),
  body('password')
    .notEmpty().withMessage('Password is required').bail()
    .isString().withMessage('Password must be text'),
];

// src/controllers/auth.controllers.js: login, cut down to its checks
const loginUser = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  const ok = user && (await bcrypt.compare(req.body.password, user.password));
  if (!ok) throw new ApiError(401, 'Invalid credentials');
  res.status(200).json({ statusCode: 200, message: 'Logged in' });
};

// src/routes/auth.routes.js and src/app.js
const router = Router();
router.route('/login').post(userLoginValidator(), validate, loginUser);
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
const hash = await bcrypt.hash('demo-pass', 10);
await User.create({ email: 'ada@example.com', password: hash });

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/api/v1/auth/login`;
  const post = async (label, payload) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const { message, errors = [] } = await res.json();
    console.log(label.padEnd(13), res.status, message);
    for (const e of errors) console.log(`  ${e.field}: ${e.message}`);
  };
  const ada = { email: 'ada@example.com', password: 'demo-pass' };
  await post('empty body', {});
  await post('bad email', { ...ada, email: 'ada' });
  await post('number pass', { ...ada, password: 12345 });
  await post('unknown user', { ...ada, email: 'bob@example.com' });
  await post('wrong pass', { ...ada, password: 'nope' });
  await post('correct', ada);
  server.close();
  await mongoose.disconnect();
});
