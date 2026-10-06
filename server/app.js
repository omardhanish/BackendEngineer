import express from 'express';
import { relative, sep } from 'node:path';
import { makeLogger, hostGuard, securityHeaders, originGuard, RateLimiter, RUNNER_CSP } from './lib/security.js';
import { Store } from './lib/store.js';
import { Content } from './lib/content.js';
import { Chats } from './lib/chats.js';
import { createDeepSeek } from './lib/deepseek.js';
import { bookRoutes } from './routes/book.js';
import { chatRoutes } from './routes/chat.js';
import { chatsRoutes } from './routes/chats.js';
import { progressRoutes, notesRoutes, healthRoutes } from './routes/progress.js';

/** Wire up everything the routes need. Tests pass their own config and a stub fetch. */
export async function createContext(config, { fetchImpl } = {}) {
  const log = makeLogger({ silent: config.silent });
  const store = new Store(config.dataDir, { log });
  await store.init();
  const content = await new Content(config, { log }).load();
  const chats = new Chats(store, { log });
  await chats.init();
  const deepseek = createDeepSeek({ ...config.deepseek, limits: config.limits, fetchImpl });
  return {
    config, log, store, content, chats, deepseek,
    limiter: new RateLimiter({ max: config.limits.chatPerMinute }),
    streaming: new Set(), // thread ids that are mid-answer
    controllers: new Set(), // abort controllers of live upstream calls
    shuttingDown: false,
    health: { modelOk: null, modelError: null, models: [] },
  };
}

/** Headers decided from the file that is actually served, so URL aliases (//, %2e, case) cannot change them. */
function staticHeaders(publicDir) {
  return (res, file) => {
    const norm = file.split(sep).join('/');
    if (norm.toLowerCase().endsWith('/sandbox/runner.html')) res.setHeader('Content-Security-Policy', RUNNER_CSP);
    const rel = relative(publicDir, file).split(sep).join('/');
    res.setHeader('Cache-Control', rel.startsWith('fonts/') ? 'public, max-age=31536000, immutable' : 'no-cache');
  };
}

export function createApp(ctx) {
  const { config } = ctx;
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', 'strong');

  app.use(hostGuard); // first: covers static files and SSE too
  app.use(securityHeaders);

  const api = express.Router();
  api.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  api.use(originGuard);
  api.use(express.json({ limit: config.limits.bodyBytes, strict: true }));
  bookRoutes(api, ctx);
  chatRoutes(api, ctx);
  chatsRoutes(api, ctx);
  progressRoutes(api, ctx);
  notesRoutes(api, ctx);
  healthRoutes(api, ctx);
  api.use((req, res) => res.status(404).json({ error: { code: 'not_found', message: 'No such API route.' } }));
  app.use('/api', api);

  // Only public/ is ever served: never the project root, content/, data/ or .env.
  app.use(express.static(config.publicDir, { dotfiles: 'ignore', index: false, setHeaders: staticHeaders(config.publicDir) }));

  // Single-page app: any other extension-less GET gets the shell (Express 5: no '*' route patterns).
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || /\.[a-z0-9]+$/i.test(req.path)) return next();
    res.set('Cache-Control', 'no-cache');
    // `root` (not an absolute path): send() rejects absolute paths that contain a dot-directory, e.g. ~/.projects/…
    res.sendFile('index.html', { root: config.publicDir });
  });
  app.use((req, res) => res.status(404).type('text/plain').send('Not found'));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (res.headersSent) return res.destroy();
    const isApi = req.path.startsWith('/api');
    let status = 500;
    let code = 'server';
    let message = 'Something went wrong on the server.';
    if (err.type === 'entity.too.large') { status = 413; code = 'too_large'; message = 'That request is too large.'; }
    else if (err.type === 'entity.parse.failed') { status = 400; code = 'bad_json'; message = 'The request body is not valid JSON.'; }
    else if (Number(err.status ?? err.statusCode) >= 400 && Number(err.status ?? err.statusCode) < 500) {
      status = Number(err.status ?? err.statusCode);
      code = 'bad_request';
      message = status === 404 ? 'Not found.' : 'The request could not be understood.';
    } else ctx.log.error(`${req.method} ${req.path}: ${err.message}`);
    if (isApi) res.status(status).json({ error: { code, message } });
    else res.status(status).type('text/plain').send(message);
  });

  return app;
}
