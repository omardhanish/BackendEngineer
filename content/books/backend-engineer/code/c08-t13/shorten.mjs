import express from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';

// src/validation/url.validation.js
const shortenSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
});

// src/controllers/urls.controller.js
function shorten(req, res) {
  const parsed = shortenSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({ error: 'Validation failed', issues });
  }
  const shortCode = nanoid(7);
  res.status(201).json({ shortCode });
}

// Setup so this file runs alone. requireAuth stands in for lecture 12.
const requireAuth = (req, res, next) =>
  req.get('authorization')
    ? next()
    : res.status(401).json({ error: 'Unauthorized' });
const app = express();
app.use(express.json());
app.post('/shorten', requireAuth, shorten);

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/shorten`;
  const post = async (body, headers) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    return [res.status, await res.json()];
  };
  const token = { authorization: 'Bearer demo' };
  const good = { url: 'https://example.com/a' };

  const [s1, b1] = await post(good);
  console.log(s1, b1.error);
  const [s2, b2] = await post({ url: 'ftp://example.com' }, token);
  console.log(s2, JSON.stringify(b2.issues));
  const [s3, a] = await post(good, token);
  const [, b] = await post(good, token);
  console.log(s3, a.shortCode.length, a.shortCode !== b.shortCode);
  server.close();
});
