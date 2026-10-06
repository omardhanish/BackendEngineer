// Saved chats: list/search, per-topic history, empty-thread creation, Markdown export.
import { ID_RE, THREAD_RE, str } from '../lib/security.js';

const none = (res, code, message, status = 404) => res.status(status).json({ error: { code, message } });
const slug = (s) => String(s).replace(/[^a-z0-9-]/gi, '').slice(0, 60) || 'all';

export function chatsRoutes(router, ctx) {
  const { chats, content, config } = ctx;
  const titleOf = (id) => content.titleOf(id);
  const markdown = (res, name, text) => {
    res.set({ 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="backend-engineer-chats-${slug(name)}.md"` });
    res.send(text);
  };

  router.get('/chats', (req, res) => {
    const topicId = ID_RE.test(String(req.query.topic || '')) ? String(req.query.topic) : undefined;
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    res.json({ threads: chats.list({ q: str(req.query.q, 200), topicId, limit }) });
  });

  // Registered before /chats/:topicId so "export" is not read as an id.
  router.get('/chats/export', (req, res) => markdown(res, 'all', chats.exportMarkdown({ titleOf })));

  router.get('/chats/:topicId', async (req, res) => {
    const { topicId } = req.params;
    if (!ID_RE.test(topicId) || !content.has(topicId)) return none(res, 'unknown_topic', 'Unknown page.');
    res.json(await chats.get(topicId));
  });

  router.get('/chats/:topicId/export', (req, res) => {
    const { topicId } = req.params;
    const threadId = String(req.query.thread || '');
    if (!ID_RE.test(topicId) || !content.has(topicId)) return none(res, 'unknown_topic', 'Unknown page.');
    if (threadId && !THREAD_RE.test(threadId)) return none(res, 'bad_thread', 'Bad thread id.', 400);
    markdown(res, threadId || topicId, chats.exportMarkdown({ topicId, threadId: threadId || undefined, titleOf }));
  });

  // Create (or fetch) a thread without calling the model — role-play pages need their scripted opening on load.
  router.post('/chats/:topicId/threads', async (req, res) => {
    const { topicId } = req.params;
    if (!ID_RE.test(topicId) || !content.has(topicId)) return none(res, 'unknown_topic', 'Unknown page.');
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const topic = await content.topicPrivate(topicId);
    const wantsRole = b.kind === 'roleplay' && topic.kind === 'roleplay' && topic.roleplay;
    const thread = await chats.ensureThread(topicId, {
      kind: wantsRole ? 'roleplay' : 'ask',
      opening: wantsRole ? topic.roleplay.opening : undefined,
      model: config.deepseek.model,
      fresh: !!b.fresh,
    });
    res.json(thread);
  });
}
