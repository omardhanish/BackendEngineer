// Localhost hardening: DNS-rebinding guard, CSRF/origin guard, CSP, id validation, rate limits, log redaction.

/** Ids from the URL/body are never trusted: lowercase letters, digits and dashes only. */
export const ID_RE = /^[a-z0-9-]{1,80}$/;
/** A book slug names a folder under content/books/ and data/books/: no dots, slashes or leading dash, so it can never escape them. */
export const BOOK_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const THREAD_RE = /^t_[a-z0-9]{6,16}$/;
export const MSG_ID_RE = /^[A-Za-z0-9_-]{6,64}$/;

const SECRET_PATTERNS = [/sk-[A-Za-z0-9_-]{8,}/g, /gh[pousr]_[A-Za-z0-9]{8,}/g, /github_pat_[A-Za-z0-9_]{8,}/g, /Bearer\s+[A-Za-z0-9._~+/-]{8,}/gi];
export function redact(text) {
  let out = String(text);
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[redacted]');
  return out;
}

/** redact() plus exact-value removal (e.g. the configured API key) for text that leaves the process or is stored. */
export function scrub(text, secrets = []) {
  let out = redact(text);
  for (const s of secrets) if (typeof s === 'string' && s.length >= 8) out = out.split(s).join('[redacted]');
  return out;
}

export function makeLogger({ silent = false } = {}) {
  const mark = { info: '·', warn: '!', error: '✖' };
  const write = (level, args) => {
    if (silent) return;
    const line = args.map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : JSON.stringify(a))).join(' ');
    (level === 'error' ? console.error : console.log)(`${new Date().toISOString().slice(11, 19)} ${mark[level]} ${redact(line)}`);
  };
  return { info: (...a) => write('info', a), warn: (...a) => write('warn', a), error: (...a) => write('error', a) };
}

const deny = (res, status, code, message) => res.status(status).json({ error: { code, message } });

/**
 * First middleware: only answer when the Host header is exactly localhost / 127.0.0.1 / [::1]
 * on the port the connection arrived on. This is the real defence against DNS rebinding, which
 * would otherwise turn a malicious web page into same-origin requests that spend the API key.
 */
export function hostGuard(req, res, next) {
  const port = req.socket.localPort;
  const host = String(req.headers.host || '').toLowerCase();
  if (host === `localhost:${port}` || host === `127.0.0.1:${port}` || host === `[::1]:${port}`) return next();
  res.status(421).type('text/plain').send('Misdirected request: this server only answers on localhost.');
}

const APP_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join('; ');

// The code-runner page: an opaque-origin sandbox that may run script and spawn blob workers, nothing else.
// app.js applies it from the static layer, keyed on the file that is actually served (so path aliases such as
// /sandbox//runner.html, %2e segments or a different case cannot fall back to the app CSP).
export const RUNNER_CSP = "sandbox allow-scripts; default-src 'none'; script-src 'self' blob:; worker-src blob:; connect-src 'none'; frame-ancestors 'self'";

export function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', APP_CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
}

/**
 * State-changing requests must come from our own origin and carry JSON. A cross-site form or
 * fetch cannot send this combination without a CORS preflight, which we never approve.
 * Absent and "null" origins (sandboxed iframes) are rejected.
 */
export function originGuard(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const port = req.socket.localPort;
  const origin = req.headers.origin;
  const ok = origin === `http://localhost:${port}` || origin === `http://127.0.0.1:${port}` || origin === `http://[::1]:${port}`;
  if (!ok) return deny(res, 403, 'bad_origin', 'Cross-origin request blocked.');
  if (req.is('application/json') === false) return deny(res, 415, 'json_required', 'Send application/json.');
  next();
}

/** Sliding-window limiter (in-memory). */
export class RateLimiter {
  constructor({ max, windowMs = 60_000 }) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = [];
  }
  take(now = Date.now()) {
    this.hits = this.hits.filter((t) => now - t < this.windowMs);
    if (this.hits.length >= this.max) return false;
    this.hits.push(now);
    return true;
  }
}

export const str = (v, max = 100_000) => (typeof v === 'string' ? v.slice(0, max) : '');
export const isPlainId = (v) => typeof v === 'string' && ID_RE.test(v);
