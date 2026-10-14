import express from 'express';
import { z } from 'zod';
const LEVELS = ['debug', 'info', 'warn', 'error']; // no fatal: process exits
const lines = [];                                // memory appender for demo
const clock = () => '2026-01-15T10:00:00.000Z';  // injected, stable output
const SECRET = new Set(['password', 'cardNumber', 'authorization']);
const redact = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) =>
  [k, SECRET.has(k) ? '[redacted]' : v]));
function createLogger(state, bound = {}) {        // state is shared by children
  const log = (level) => (msg, fields = {}) => {
    if (LEVELS.indexOf(level) < LEVELS.indexOf(state.level)) return;
    state.appenders.forEach((a) => a(JSON.stringify({ time: clock(), level,
      msg, ...bound, ...redact(fields) })));
  };
  return { debug: log('debug'), info: log('info'), warn: log('warn'),
    error: log('error'), state,
    child: (more) => createLogger(state, { ...bound, ...more }) };
}
const root = createLogger({ level: 'info', appenders: [(l) => lines.push(l)] });
let seq = 0;
const app = express();
app.use((req, res, next) => {                    // request-scoped child logger
  const given = req.get('X-Request-Id') ?? '';   // reuse only a safe id
  req.id = /^[\w-]{1,64}$/.test(given) ? given : `req-${++seq}`;
  req.log = root.child({ requestId: req.id });
  res.set('X-Request-Id', req.id);
  res.on('finish', () => req.log.info('request done',
    { method: req.method, path: req.path, status: res.statusCode }));
  next();
});
app.use(express.json());                         // after req.log exists
const Order = z.object({ item: z.string().min(1), cardNumber: z.string() });
app.post('/orders', (req, res) => {
  const body = Order.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_BODY' });
  req.log.debug('order body', req.body);         // hidden while level is info
  res.status(201).json({ id: 'OD-1' });
});
app.get('/boom', () => { throw new Error('db pool exhausted'); });
app.put('/admin/log-level', (req, res) => {      // runtime change, no restart
  const body = z.object({ level: z.enum(LEVELS) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_LEVEL' });
  root.state.level = body.data.level;
  res.json({ level: root.state.level });
});
app.use((err, req, res, next) => {               // log once, answer safely
  req.log.error('unhandled error', { error: err.message });
  res.status(500).json({ error: 'INTERNAL', requestId: req.id });
});
const server = app.listen(0);
const base = `http://localhost:${server.address().port}`;
const call = async (method, path, body, headers = {}) => {
  const r = await fetch(base + path, { method, headers: {
    'content-type': 'application/json', ...headers },
    body: body && JSON.stringify(body) });
  console.log(method, path, r.status, JSON.stringify(await r.json()));
};
const card = { item: 'pizza', cardNumber: '4111-0000' };
await call('POST', '/orders', card);
await call('POST', '/orders', { item: '' });
await call('GET', '/boom', undefined, { 'X-Request-Id': 'edge-42' });
await call('PUT', '/admin/log-level', { level: 'loud' });
await call('PUT', '/admin/log-level', { level: 'debug' });
await call('POST', '/orders', card);
server.close();
console.log('--- log lines ---');
lines.forEach((l) => console.log(l));
