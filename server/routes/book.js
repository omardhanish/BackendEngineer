import { ID_RE } from '../lib/security.js';

// Mounted once per book: `req.bk` (set by the library routes) is the book being asked about.
export function bookRoutes(router) {
  router.get('/book', async (req, res) => {
    res.json(await req.bk.content.manifest());
  });

  router.get('/topic/:id', async (req, res) => {
    const { id } = req.params;
    const { content } = req.bk;
    if (!ID_RE.test(id) || !content.has(id)) return res.status(404).json({ error: { code: 'unknown_topic', message: 'Unknown page.' } });
    res.json(await content.topic(id));
  });
}
