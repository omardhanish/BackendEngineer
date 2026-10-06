// Chat persistence: per-topic files holding threads[] of messages, plus an in-memory search index.
// The server owns history; the browser only ever sends the new message.
import { randomUUID } from 'node:crypto';

const rid = (p) => `${p}_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
const emptyDoc = (topicId) => ({ v: 1, topicId, threads: [] });
const file = (topicId) => `chats/${topicId}.json`;
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export class Chats {
  constructor(store, { log } = {}) {
    this.store = store;
    this.log = log;
    this.index = new Map(); // topicId -> doc (read-only snapshots)
  }

  /** Load everything into the search index and fix streams that were cut off by a crash/restart. */
  async init() {
    for (const topicId of await this.store.list('chats')) {
      const fixed = await this.store.update(file(topicId), (doc) => {
        let n = 0;
        for (const t of doc.threads) {
          for (const m of t.messages) {
            if (m.status === 'streaming') { m.status = 'interrupted'; n++; }
          }
        }
        return n;
      }, emptyDoc(topicId));
      if (fixed) this.log?.warn(`marked ${fixed} unfinished answer(s) in ${topicId} as interrupted`);
      this.index.set(topicId, await this.store.read(file(topicId), emptyDoc(topicId)));
    }
  }

  async #mutate(topicId, fn) {
    let snapshot;
    const result = await this.store.update(file(topicId), (doc) => {
      const r = fn(doc);
      snapshot = doc;
      return r;
    }, emptyDoc(topicId));
    this.index.set(topicId, structuredClone(snapshot));
    return result;
  }

  async get(topicId) {
    return this.store.read(file(topicId), emptyDoc(topicId));
  }

  /** Find or create the thread to talk in. Role-play threads are seeded with a scripted opening. */
  async ensureThread(topicId, { threadId, kind = 'ask', opening, model, fresh = false }) {
    return this.#mutate(topicId, (doc) => {
      let t = threadId ? doc.threads.find((x) => x.id === threadId) : null;
      if (!t && !threadId && !fresh) {
        const kindMatch = (x) => x.kind === kind;
        t = [...doc.threads].reverse().find(kindMatch); // continue the latest thread of this kind
      }
      if (!t) {
        const now = Date.now();
        t = { id: rid('t'), title: kind === 'ask' ? 'New chat' : 'Role-play', kind, createdAt: now, updatedAt: now, messages: [] };
        if (opening) t.messages.push({ id: rid('m'), role: 'assistant', content: opening, ts: now, status: 'complete', scripted: true, model });
        doc.threads.push(t);
      }
      return structuredClone(t);
    });
  }

  /** Append the learner's message (idempotent on clientMsgId). */
  async addUser(topicId, threadId, { clientMsgId, content, quote }) {
    return this.#mutate(topicId, (doc) => {
      const t = doc.threads.find((x) => x.id === threadId);
      if (!t) throw Object.assign(new Error('thread not found'), { code: 'thread_not_found' });
      const dup = t.messages.findIndex((m) => m.role === 'user' && m.clientMsgId === clientMsgId);
      if (dup !== -1) {
        const answer = t.messages[dup + 1];
        return { duplicate: true, userMessage: structuredClone(t.messages[dup]), existingAnswer: answer?.role === 'assistant' ? structuredClone(answer) : null };
      }
      const now = Date.now();
      const m = { id: rid('m'), role: 'user', content, ts: now, clientMsgId };
      if (quote) m.quote = quote;
      t.messages.push(m);
      if (t.title === 'New chat') t.title = clip(content.replace(/\s+/g, ' ').trim(), 64);
      t.updatedAt = now;
      return { duplicate: false, userMessage: structuredClone(m), existingAnswer: null };
    });
  }

  async startAssistant(topicId, threadId, { model }) {
    return this.#mutate(topicId, (doc) => {
      const t = doc.threads.find((x) => x.id === threadId);
      const m = { id: rid('m'), role: 'assistant', content: '', ts: Date.now(), status: 'streaming', model };
      t.messages.push(m);
      return structuredClone(m);
    });
  }

  async finishAssistant(topicId, threadId, messageId, { content, status, usage, error }) {
    return this.#mutate(topicId, (doc) => {
      const t = doc.threads.find((x) => x.id === threadId);
      const m = t?.messages.find((x) => x.id === messageId);
      if (!m) return null;
      Object.assign(m, { content, status });
      if (usage) m.usage = usage;
      if (error) m.error = error;
      t.updatedAt = Date.now();
      return structuredClone(m);
    });
  }

  /** Messages the model should see: finished or partially delivered turns, never errors or scripted-less empties. */
  static contextOf(thread, { exceptId } = {}) {
    const out = [];
    for (const m of thread.messages) {
      if (m.id === exceptId) continue;
      if (m.role === 'assistant' && (m.status === 'error' || m.status === 'streaming' || !m.content)) continue;
      const text = m.role === 'user' && m.quote ? `> ${m.quote.replace(/\n/g, '\n> ')}\n\n${m.content}` : m.content;
      const last = out[out.length - 1];
      if (last && last.role === m.role) last.content += `\n\n${text}`;
      else out.push({ role: m.role, content: text });
    }
    return out;
  }

  /** Summaries for the history page; `q` is an AND-of-terms search over every message. */
  list({ q = '', topicId, limit = 100 } = {}) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = [];
    for (const [tid, doc] of this.index) {
      if (topicId && tid !== topicId) continue;
      for (const t of doc.threads) {
        const userMsgs = t.messages.filter((m) => m.role === 'user').length;
        if (!userMsgs && t.kind === 'ask') continue; // never-used threads
        let snippet = '';
        if (terms.length) {
          const hay = t.messages.map((m) => m.content).join('\n');
          const low = `${t.title}\n${hay}`.toLowerCase();
          if (!terms.every((w) => low.includes(w))) continue;
          const at = hay.toLowerCase().indexOf(terms[0]);
          snippet = at === -1 ? '' : clip(hay.slice(Math.max(0, at - 50), at + 110).replace(/\s+/g, ' '), 160);
        } else {
          snippet = clip((t.messages.findLast((m) => m.content)?.content || '').replace(/\s+/g, ' '), 140);
        }
        rows.push({ topicId: tid, threadId: t.id, title: t.title, kind: t.kind, updatedAt: t.updatedAt, createdAt: t.createdAt, messages: t.messages.length, snippet });
      }
    }
    rows.sort((a, b) => b.updatedAt - a.updatedAt);
    return rows.slice(0, limit);
  }

  /** Markdown transcript of one thread, or of every thread of a topic, or of everything. */
  exportMarkdown({ topicId, threadId, titleOf = (id) => id } = {}) {
    const parts = [];
    const emit = (tid, t) => {
      const when = (ts) => new Date(ts).toISOString().replace('T', ' ').slice(0, 16);
      parts.push(`## ${titleOf(tid)} — ${t.title}\n\n*${tid} · started ${when(t.createdAt)} · ${t.messages.length} messages*\n`);
      for (const m of t.messages) {
        if (!m.content) continue;
        if (m.role === 'user') parts.push(`**You** · ${when(m.ts)}\n\n${m.content.split('\n').map((l) => `> ${l}`).join('\n')}\n`);
        else parts.push(`**Tutor**${m.status && m.status !== 'complete' ? ` *(${m.status})*` : ''}\n\n${m.content}\n`);
      }
      parts.push('---\n');
    };
    for (const [tid, doc] of this.index) {
      if (topicId && tid !== topicId) continue;
      for (const t of doc.threads) if (!threadId || t.id === threadId) emit(tid, t);
    }
    return `# BackendEngineer — saved chats\n\n*Exported ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC*\n\n${parts.join('\n')}`;
  }
}
