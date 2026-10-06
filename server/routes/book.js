import { ID_RE } from '../lib/security.js';

export function bookRoutes(router, { content }) {
  router.get('/book', async (req, res) => {
    res.json(await content.manifest());
  });

  router.get('/topic/:id', async (req, res) => {
    const { id } = req.params;
    if (!ID_RE.test(id) || !content.has(id)) return res.status(404).json({ error: { code: 'unknown_topic', message: 'Unknown page.' } });
    res.json(await content.topic(id));
  });
}
