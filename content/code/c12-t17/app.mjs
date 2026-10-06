import express from 'express';

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const findUser = async (id) => {
  if (id === '2') throw new ApiError(404, 'User not found');
  if (id === '3') throw new Error('connection lost');
  return { id, username: 'ada' };
};

const app = express();
app.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    res.json(await findUser(req.params.id));
  }),
);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode ?? 500;
  const message = statusCode < 500 ? err.message : 'Internal Server Error';
  res
    .status(statusCode)
    .json({ statusCode, message, success: false, errors: [] });
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  for (const id of ['1', '2', '3']) {
    const res = await fetch(`${base}/users/${id}`);
    console.log(res.status, JSON.stringify(await res.json()));
  }
  server.close();
});
