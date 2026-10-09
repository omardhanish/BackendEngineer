// Reading progress + margin notes + health. Small documents, saved through the atomic store.
import { ID_RE } from '../lib/security.js';

const PROGRESS = { v: 1, topics: {}, last: null };
const notFound = (res) => res.status(404).json({ error: { code: 'unknown_topic', message: 'Unknown page.' } });

export function progressRoutes(router, { store }) {
  const file = (req) => `${req.bk.prefix}progress.json`; // every book keeps its own reading position
  router.get('/progress', async (req, res) => res.json(await store.read(file(req), PROGRESS)));

  // Per-topic PATCH so two open tabs never overwrite each other's progress.
  router.patch('/progress/:topicId', async (req, res) => {
    const { topicId } = req.params;
    if (!ID_RE.test(topicId) || !req.bk.content.has(topicId)) return notFound(res);
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const doc = await store.update(file(req), (d) => {
      const now = Date.now();
      const cur = d.topics[topicId] ?? {};
      if (b.visited === true && !cur.visited) cur.visited = now;
      if (typeof b.done === 'boolean') cur.done = b.done ? cur.done ?? now : null;
      if (Number.isInteger(b.frame) && b.frame >= 0 && b.frame < 20) cur.frame = b.frame;
      if (b.solved && typeof b.solved === 'object' && !Array.isArray(b.solved)) {
        cur.solved = cur.solved && typeof cur.solved === 'object' ? cur.solved : {};
        for (const [k, v] of Object.entries(b.solved).slice(0, 12)) if (/^[a-z0-9-]{1,30}$/.test(k) && Object.keys(cur.solved).length < 24) { if (v === true) { if (!Object.hasOwn(cur.solved, k)) cur.solved[k] = now; } else delete cur.solved[k]; } // hasOwn: an id like "constructor" must not hit Object.prototype
      }
      cur.ts = now;
      d.topics[topicId] = cur;
      d.last = { id: topicId, frame: cur.frame ?? 0, ts: now };
    }, PROGRESS).then(() => store.read(file(req), PROGRESS));
    res.json(doc);
  });
}

export function notesRoutes(router, { store }) {
  const blank = { text: '', rev: 0, updatedAt: null };
  const rel = (req, id) => `${req.bk.prefix}notes/${id}.json`;

  router.get('/notes/:topicId', async (req, res) => {
    const { topicId } = req.params;
    if (!ID_RE.test(topicId) || !req.bk.content.has(topicId)) return notFound(res);
    res.json(await store.read(rel(req, topicId), blank));
  });

  router.put('/notes/:topicId', async (req, res) => {
    const { topicId } = req.params;
    if (!ID_RE.test(topicId) || !req.bk.content.has(topicId)) return notFound(res);
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    if (typeof b.text !== 'string' || b.text.length > 20_000 || !Number.isInteger(b.rev)) {
      return res.status(400).json({ error: { code: 'bad_note', message: 'Notes must be text up to 20,000 characters.' } });
    }
    try {
      const saved = await store.update(rel(req, topicId), (d) => {
        if (d.rev !== b.rev) throw Object.assign(new Error('stale'), { current: { ...d } });
        d.text = b.text;
        d.rev += 1;
        d.updatedAt = Date.now();
        return { ...d };
      }, blank);
      res.json(saved);
    } catch (e) {
      if (e.current) return res.status(409).json({ error: { code: 'conflict', message: 'These notes changed in another tab.' }, current: e.current });
      throw e;
    }
  });
}

export function healthRoutes(router, ctx) {
  router.get('/health', async (req, res) => {
    const cards = await ctx.library.list();
    // Booleans and counts only: this endpoint must never leak configuration.
    res.json({
      ok: true,
      tutor: { configured: !!ctx.config.deepseek.key, model: ctx.config.deepseek.model, modelOk: ctx.health.modelOk },
      books: cards.length,
      pages: { total: cards.reduce((n, c) => n + c.pages, 0), authored: cards.reduce((n, c) => n + c.authored, 0) },
    });
  });
}
