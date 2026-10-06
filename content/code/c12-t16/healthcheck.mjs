import express, { Router } from 'express';

// src/utils/api-response.js, built earlier in the chapter
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

// src/controllers/healthcheck.controllers.js
const healthCheck = (req, res) => {
  const body = new ApiResponse(200, { status: 'ok' }, 'Server is running');
  res.status(200).json(body);
};

// src/routes/healthcheck.routes.js
const router = Router();
router.route('/').get(healthCheck);

// src/app.js
const app = express();
app.use('/api/v1/healthcheck', router);

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/api/v1/healthcheck`;
  const get = await fetch(url);
  console.log(get.status, JSON.stringify(await get.json()));
  const post = await fetch(url, { method: 'POST' });
  console.log(post.status);
  server.close();
});
