import express, { Router } from 'express';
import cookieParser from 'cookie-parser';
import { body, validationResult } from 'express-validator';

// Earlier lessons, condensed: ApiError, validate, verifyJWT, the controllers.
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    Object.assign(this, { statusCode, errors, success: false });
  }
}
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  throw new ApiError(422, 'Received data is not valid', errors);
};
const verifyJWT = (req, res, next) => {
  if (!req.cookies.accessToken) throw new ApiError(401, 'Unauthorized request');
  next(); // the real one verifies the token and loads req.user
};
const stub = (name) => (req, res) => res.json({ controller: name });
const registerUser = stub('registerUser');
const loginUser = stub('loginUser');
const verifyEmail = stub('verifyEmail');
const refreshAccessToken = stub('refreshAccessToken');
const forgotPasswordRequest = stub('forgotPasswordRequest');
const resetForgottenPassword = stub('resetForgottenPassword');
const logoutUser = stub('logoutUser');
const getCurrentUser = stub('getCurrentUser');
const changeCurrentPassword = stub('changeCurrentPassword');
const resendEmailVerification = stub('resendEmailVerification');

// src/validators/index.js: all five validators, from shared helper rules
const email = () =>
  body('email')
    .trim().notEmpty().withMessage('Email is required').bail()
    .isEmail().withMessage('Email is invalid');
const text = (field, label) =>
  body(field)
    .notEmpty().withMessage(`${label} is required`).bail()
    .isString().withMessage(`${label} must be text`);
const strong = (field, label) =>
  text(field, label).bail()
    .isLength({ min: 8 }).withMessage(`${label} needs 8 or more characters`);
const lacksUsername = (value, { req }) =>
  !req.body.username || !value.includes(req.body.username);

const userRegisterValidator = () => [
  email(),
  body('username')
    .trim().notEmpty().withMessage('Username is required').bail()
    .isLength({ min: 3 }).withMessage('Username needs 3 or more characters')
    .bail()
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Username allows lowercase letters, digits and _'),
  strong('password', 'Password')
    .bail()
    .custom(lacksUsername)
    .withMessage('Password must not contain the username'),
];
const userLoginValidator = () => [email(), text('password', 'Password')];
const userForgotPasswordValidator = () => [email()];
const userResetForgottenPasswordValidator = () => [
  strong('newPassword', 'New password'),
];
const userChangeCurrentPasswordValidator = () => [
  text('oldPassword', 'Old password'),
  strong('newPassword', 'New password'),
];

// src/routes/auth.routes.js
const router = Router();

router.route('/register').post(userRegisterValidator(), validate, registerUser);
router.route('/login').post(userLoginValidator(), validate, loginUser);
router.route('/verify-email/:verificationToken').get(verifyEmail);
router.route('/refresh-token').post(refreshAccessToken);
router
  .route('/forgot-password')
  .post(userForgotPasswordValidator(), validate, forgotPasswordRequest);
router
  .route('/reset-password/:resetToken')
  .post(
    userResetForgottenPasswordValidator(),
    validate,
    resetForgottenPassword,
  );

// Secured routes: verifyJWT comes first.
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/current-user').get(verifyJWT, getCurrentUser);
router
  .route('/change-password')
  .post(
    verifyJWT,
    userChangeCurrentPasswordValidator(),
    validate,
    changeCurrentPassword,
  );
router
  .route('/resend-email-verification')
  .post(verifyJWT, resendEmailVerification);

const app = express();
app.use(express.json(), cookieParser());
app.use('/api/v1/auth', router);
app.use((err, req, res, next) => {
  const known = err instanceof ApiError;
  const fail = known ? err : new ApiError(500, 'Internal Server Error');
  const { statusCode, message, success, errors } = fail;
  res.status(statusCode).json({ statusCode, message, success, errors });
});

const server = app.listen(0, async () => {
  const { port } = server.address();
  const hit = async (method, path, { cookie, body } = {}) => {
    const url = `http://localhost:${port}/api/v1/auth${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers.Cookie = 'accessToken=demo-token';
    const init = { method, headers };
    if (method !== 'GET') init.body = JSON.stringify(body ?? {});
    const res = await fetch(url, init);
    const reply = await res.json();
    const fields = (reply.errors ?? []).map((e) => e.field).join(', ');
    const detail = reply.controller ?? (fields || reply.message);
    console.log(`${method} ${path}`.padEnd(34), res.status, detail);
  };

  // Every route, with an empty body and no cookie.
  await hit('POST', '/register');
  await hit('POST', '/login');
  await hit('GET', '/verify-email/abc');
  await hit('POST', '/refresh-token');
  await hit('POST', '/forgot-password');
  await hit('POST', '/reset-password/abc');
  await hit('POST', '/logout');
  await hit('GET', '/current-user');
  await hit('POST', '/change-password');
  await hit('POST', '/resend-email-verification');

  // Order matters: verifyJWT runs before the rules.
  console.log('--- change-password with a cookie');
  await hit('POST', '/change-password', { cookie: true });
  const body = { oldPassword: 'old-pass', newPassword: 'new-password' };
  await hit('POST', '/change-password', { cookie: true, body });
  server.close();
});
