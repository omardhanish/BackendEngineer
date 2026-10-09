import express from 'express';
import { ApiResponse } from './api-response.js';
import { ApiError } from './api-error.js';

const app = express();
app.get('/user', (req, res) => {
  res.status(200).json(new ApiResponse(200, { id: 1 }, 'User fetched'));
});
app.get('/missing', () => { throw new ApiError(404, 'User not found'); });
app.get('/invalid', () => {
  throw new ApiError(422, 'Invalid data', [{ field: 'email', message: 'Bad' }]);
});
app.get('/bug', () => { throw new TypeError('x is not a function'); });

app.use((err, req, res, next) => {
  const known = err instanceof ApiError;
  const fail = known ? err : new ApiError(500, 'Internal Server Error');
  res.status(fail.statusCode).json({
    statusCode: fail.statusCode,
    message: fail.message,
    success: fail.success,
    errors: fail.errors,
  });
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  for (const path of ['/user', '/missing', '/invalid', '/bug']) {
    const res = await fetch(base + path);
    console.log(res.status, JSON.stringify(await res.json()));
  }
  server.close();
});
