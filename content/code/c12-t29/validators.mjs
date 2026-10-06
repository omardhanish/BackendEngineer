import express, { Router } from 'express';
import { body, validationResult } from 'express-validator';

// src/utils/api-error.js, condensed
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    Object.assign(this, { statusCode, errors, success: false });
  }
}

// src/validators/index.js
const lacksUsername = (value, { req }) =>
  !req.body.username || !value.includes(req.body.username);

export const userRegisterValidator = () => [
  body('email')
    .trim().notEmpty().withMessage('Email is required').bail()
    .isEmail().withMessage('Email is invalid'),
  body('username')
    .trim().notEmpty().withMessage('Username is required').bail()
    .isLength({ min: 3 }).withMessage('Username needs 3 or more characters')
    .bail()
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Username allows lowercase letters, digits and _'),
  body('password')
    .notEmpty().withMessage('Password is required').bail()
    .isString().withMessage('Password must be text').bail()
    .isLength({ min: 8 }).withMessage('Password needs 8 or more characters')
    .bail()
    .custom(lacksUsername)
    .withMessage('Password must not contain the username'),
];

// src/middlewares/validator.middlewares.js
export const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  throw new ApiError(422, 'Received data is not valid', errors);
};

// src/routes/auth.routes.js and src/app.js, with a stand-in controller
const registerUser = (req, res) => {
  res.status(201).json({ email: req.body.email, username: req.body.username });
};
const router = Router();
router.route('/register').post(userRegisterValidator(), validate, registerUser);
const app = express();
app.use(express.json());
app.use('/api/v1/auth', router);
app.use((err, req, res, next) => {
  const known = err instanceof ApiError;
  const fail = known ? err : new ApiError(500, 'Internal Server Error');
  const { statusCode, message, success, errors } = fail;
  res.status(statusCode).json({ statusCode, message, success, errors });
});

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/api/v1/auth/register`;
  const good = {
    email: 'ada@example.com',
    username: 'ada',
    password: 'demo-password',
  };
  const cases = {
    'empty body': {},
    'bad values': { email: 'ada@', username: 'Ada!', password: 'short' },
    'custom rule': { ...good, password: 'ada-password' },
    'object email': { ...good, email: { $ne: null } },
    'valid, spaces': { ...good, email: ' ada@example.com ', username: ' ada ' },
  };
  for (const [label, payload] of Object.entries(cases)) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const reply = await res.json();
    console.log(label, res.status);
    if (res.ok) console.log('  controller got', JSON.stringify(reply));
    for (const { field, message } of reply.errors ?? []) {
      console.log(`  ${field}: ${message}`);
    }
  }
  server.close();
});
