// Configuration. Secrets come only from the environment / .env (gitignored) and never leave the server.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// loadEnvFile never overrides variables that are already set in the shell. Quote values in .env.
try {
  process.loadEnvFile(join(ROOT, '.env'));
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}

const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

/** Build a frozen config object. `overrides` is used by the test-suite. */
export function loadConfig(env = process.env, overrides = {}) {
  const cfg = {
    root: ROOT,
    host: '127.0.0.1', // loopback only: nothing else on the network can reach this server
    port: int(env.PORT, 4000),
    publicDir: join(ROOT, 'public'),
    booksDir: env.BOOKS_DIR ? resolve(ROOT, env.BOOKS_DIR) : join(ROOT, 'content', 'books'), // one folder per book
    defaultBook: /^[a-z0-9][a-z0-9-]{0,39}$/.test(env.DEFAULT_BOOK || '') ? env.DEFAULT_BOOK : 'backend-engineer', // where the original /api/* and /read/* URLs point (a slug, never a path)
    dataDir: resolve(ROOT, env.DATA_DIR || 'data'),
    deepseek: {
      key: env.DEEPSEEK_API_KEY || '',
      baseUrl: (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, ''),
      model: env.DEEPSEEK_MODEL || 'deepseek-flash',
    },
    limits: {
      bodyBytes: 32 * 1024,
      messageChars: 8000,
      chatPerMinute: 20,
      concurrentStreams: 3,
      dailyTokens: int(env.DAILY_TOKEN_CAP, 600_000),
      historyMessages: 20,
      historyChars: 48_000,
      pageChars: 40_000,
      maxTokens: 1536,
      firstDeltaMs: 60_000,
      idleMs: 45_000,
      totalMs: 300_000,
    },
    silent: env.LOG === 'silent',
  };
  const merged = {
    ...cfg,
    ...overrides,
    deepseek: { ...cfg.deepseek, ...(overrides.deepseek || {}) },
    limits: { ...cfg.limits, ...(overrides.limits || {}) },
  };
  return Object.freeze({ ...merged, deepseek: Object.freeze(merged.deepseek), limits: Object.freeze(merged.limits) });
}

export const config = loadConfig();
