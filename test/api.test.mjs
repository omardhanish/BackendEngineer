// API + security tests against an in-process server, with a fake DeepSeek (the real key is never used).
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startFakeDeepSeek } from './helpers/fake-deepseek.mjs';

process.env.DEEPSEEK_API_KEY = 'sk-test-0000000000000000';
const fake = await startFakeDeepSeek();
process.env.DEEPSEEK_BASE_URL = fake.url;

const { loadConfig, ROOT } = await import('../server/lib/env.js');
const { createContext, createApp } = await import('../server/app.js');

const DATA = join(ROOT, '.tmp', `test-data-${process.pid}`);
let ctx;
let server;
let base;
let port;

const origin = () => `http://localhost:${port}`;
const J = () => ({ 'content-type': 'application/json', origin: origin() });
const post = (path, body, headers = J()) => fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });

async function readSse(res) {
  const text = await res.text();
  return text.split('\n\n').filter(Boolean).map((f) => {
    const ev = /^event: (.*)$/m.exec(f)?.[1];
    const data = /^data: (.*)$/m.exec(f)?.[1];
    return { event: ev, data: data ? JSON.parse(data) : null };
  });
}
const chat = (message, extra = {}) => post('/api/chat', { topicId: 'c02-t09', clientMsgId: `m-${Math.random().toString(36).slice(2, 12)}`, message, mode: 'ask', ...extra });
const answerOf = (events) => events.filter((e) => e.event === 'delta').map((e) => e.data.t).join('');
const done = (events) => events.find((e) => e.event === 'done')?.data;

function rawRequest(path, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method: 'GET', headers }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, body: b, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

before(async () => {
  rmSync(DATA, { recursive: true, force: true });
  mkdirSync(DATA, { recursive: true });
  const config = loadConfig({}, { dataDir: DATA, silent: true, limits: { chatPerMinute: 100, dailyTokens: 10_000_000 }, deepseek: { key: process.env.DEEPSEEK_API_KEY, baseUrl: fake.url, model: 'deepseek-flash' } });
  ctx = await createContext(config);
  const app = createApp(ctx);
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  port = server.address().port;
  base = `http://localhost:${port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  await ctx.store.close();
  await fake.close();
  rmSync(DATA, { recursive: true, force: true });
});
beforeEach(() => fake.reset());

describe('book + content', () => {
  test('manifest lists the whole syllabus', async () => {
    const m = await (await fetch(`${base}/api/book`)).json();
    assert.equal(m.chapters.length, 15);
    assert.equal(m.topics.length, 197);
  });
  test('a written page is returned with its code, captured output and neighbours', async () => {
    const t = await (await fetch(`${base}/api/topic/c02-t09`)).json();
    assert.equal(t.authored, true);
    assert.equal(t.code[0].source.includes("console.log('A')"), true);
    assert.match(t.code[0].captured.stdout, /A\nD\nC\nB/);
    assert.equal(t.prev.id, 'c02-t08');
    assert.equal(t.next.id, 'c02-t10');
  });
  test('role-play secrets never reach the browser', async () => {
    const res = await fetch(`${base}/api/topic/c04-t07`);
    const text = await res.text();
    for (const secret of ['never volunteer a list of problems', 'splice(-1, 1) deletes the LAST book', 'hidden_facts', '"flaws"', '"persona"']) assert.equal(text.includes(secret), false, `leaked: ${secret}`);
    assert.equal(JSON.parse(text).hasRoleplay, true);
  });
  test('a scripted role-play opening is created without calling the model', async () => {
    const res = await post('/api/chats/c04-t07/threads', { kind: 'roleplay' });
    const thread = await res.json();
    assert.equal(thread.messages[0].role, 'assistant');
    assert.equal(thread.messages[0].scripted, true);
    assert.equal(fake.requests.length, 0);
  });
});

describe('localhost hardening', () => {
  test('health never leaks configuration', async () => {
    const text = await (await fetch(`${base}/api/health`)).text();
    assert.equal(text.includes('sk-test'), false);
    assert.equal(JSON.parse(text).tutor.configured, true);
  });
  test('requests with a foreign Host header are refused (DNS rebinding)', async () => {
    for (const host of ['evil.com', `localhost.evil.com:${port}`, `localhost:${port}@evil.com`, `127.0.0.1.evil.com:${port}`, 'localhost']) {
      const r = await rawRequest('/api/health', { host });
      assert.equal(r.status, 421, `host ${host}`);
    }
    assert.equal((await rawRequest('/api/health', { host: `127.0.0.1:${port}` })).status, 200);
  });
  test('state-changing requests need our own origin and JSON', async () => {
    const body = JSON.stringify({ visited: true });
    const patch = (headers) => fetch(`${base}/api/progress/c02-t09`, { method: 'PATCH', headers, body });
    assert.equal((await patch({ 'content-type': 'application/json' })).status, 403); // no Origin
    assert.equal((await patch({ 'content-type': 'application/json', origin: 'http://evil.com' })).status, 403);
    assert.equal((await patch({ 'content-type': 'application/json', origin: 'null' })).status, 403);
    assert.equal((await patch({ 'content-type': 'application/json', origin: `http://localhost:${port}.evil.com` })).status, 403);
    assert.equal((await patch({ 'content-type': 'text/plain', origin: origin() })).status, 415);
    assert.equal((await patch({ 'content-type': 'application/x-www-form-urlencoded', origin: origin() })).status, 415);
    assert.equal((await patch({ 'content-type': 'application/json', origin: origin() })).status, 200);
  });
  test('only public/ is served; project files and data are not reachable', async () => {
    for (const p of ['/.env', '/%2e%2e/.env', '/..%2f.env', '/content/syllabus.json', '/data/progress.json', '/server/index.js', '/package.json', '/node_modules/express/package.json', '/%2e%2e/%2e%2e/etc/passwd', '/js/..%2f..%2f.env', '/css/%5c..%5c.env']) {
      const r = await rawRequest(p, { host: `localhost:${port}` });
      assert.ok(r.status === 404 || (r.status === 200 && r.body.includes('<title>Living library')), `${p} → ${r.status}`);
      assert.equal(/DEEPSEEK|sk-test|"topics"|express/.test(r.body) && !r.body.includes('<title>Living library'), false, `${p} leaked content`);
    }
  });
  test('ids are validated; prototype keys are not pages', async () => {
    for (const id of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'C02-T09', 'x'.repeat(200), 'c02-t09%00', 'c02_t09']) {
      const r = await fetch(`${base}/api/topic/${id}`);
      assert.equal(r.status, 404, id);
    }
  });
  test('security headers, and a separate CSP for the code-runner page', async () => {
    const app = await fetch(`${base}/api/health`);
    assert.match(app.headers.get('content-security-policy'), /default-src 'none'/);
    assert.match(app.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(app.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(app.headers.get('cache-control'), 'no-store');
    const runner = await fetch(`${base}/sandbox/runner.html`);
    assert.match(runner.headers.get('content-security-policy'), /^sandbox allow-scripts;/);
    assert.match(runner.headers.get('content-security-policy'), /connect-src 'none'/);
  });
  test('bad JSON and oversized bodies are rejected cleanly', async () => {
    assert.equal((await fetch(`${base}/api/chat`, { method: 'POST', headers: J(), body: '{bad' })).status, 400);
    assert.equal((await fetch(`${base}/api/chat`, { method: 'POST', headers: J(), body: JSON.stringify({ message: 'x'.repeat(40_000) }) })).status, 413);
  });
  test('prototype-pollution payloads do not change behaviour', async () => {
    await fetch(`${base}/api/progress/c02-t09`, { method: 'PATCH', headers: J(), body: '{"__proto__":{"polluted":true},"visited":true}' });
    await fetch(`${base}/api/notes/c02-t09`, { method: 'PUT', headers: J(), body: '{"__proto__":{"polluted":true},"text":"x","rev":0}' });
    assert.equal({}.polluted, undefined);
  });
  test('no server code path executes arbitrary code', () => {
    const files = [];
    const walk = (d) => { for (const n of readdirSync(d, { withFileTypes: true })) { const p = join(d, n.name); if (n.isDirectory()) walk(p); else if (n.name.endsWith('.js')) files.push(p); } };
    walk(join(ROOT, 'server'));
    for (const f of files) assert.equal(/child_process|\beval\(|new Function|node:vm|require\('vm'\)/.test(readFileSync(f, 'utf8')), false, `${f} can execute code`);
  });
});

describe('tutor chat', () => {
  test('streams an answer built from the page, persists both sides, never exposes the key', async () => {
    const res = await chat('what is the event loop?', { live: { frame: 2, frameLabel: 'How it works', step: 3, code: 'console.log(1)', error: '' } });
    assert.equal(res.headers.get('content-type').startsWith('text/event-stream'), true);
    const events = await readSse(res);
    assert.equal(events[0].event, 'meta');
    assert.equal(answerOf(events), 'Hello world!');
    assert.equal(done(events).status, 'complete');
    assert.equal(done(events).usage.total_tokens, 13);

    const sent = fake.requests[0];
    assert.equal(sent.headers.authorization, 'Bearer sk-test-0000000000000000');
    assert.equal(sent.body.model, 'deepseek-flash');
    assert.deepEqual(sent.body.thinking, { type: 'disabled' });
    assert.equal(sent.body.stream, true);
    assert.deepEqual(sent.body.stream_options, { include_usage: true });
    assert.equal(sent.body.messages[0].role, 'system');
    assert.match(sent.body.messages[0].content, /The internal architecture|The event loop/);
    assert.match(sent.body.messages[0].content, /CORE IDEA: Node runs your JavaScript on one thread/);
    assert.match(sent.body.messages.at(-1).content, /<state>viewing frame 2 "How it works"/);
    assert.match(sent.body.messages.at(-1).content, /<learner_code>/);

    const saved = await (await fetch(`${base}/api/chats/c02-t09`)).json();
    const t = saved.threads.at(-1);
    assert.deepEqual(t.messages.map((m) => [m.role, m.status ?? null]), [['user', null], ['assistant', 'complete']]);
    assert.equal(t.messages[1].content, 'Hello world!');
    assert.equal(JSON.stringify(saved).includes('sk-test'), false);
    assert.equal(existsSync(join(DATA, 'books', 'backend-engineer', 'chats', 'c02-t09.json')), true);
  });

  test('a retried request (same clientMsgId) is replayed, not paid for twice', async () => {
    const id = 'dup-0001-xyz';
    const first = await readSse(await chat('replay me', { clientMsgId: id }));
    assert.equal(done(first).status, 'complete');
    const calls = fake.requests.length;
    const second = await readSse(await chat('replay me', { clientMsgId: id }));
    assert.equal(done(second).replay, true);
    assert.equal(answerOf(second), 'Hello world!');
    assert.equal(fake.requests.length, calls);
  });

  test('upstream errors become friendly events and are saved as errors', async () => {
    for (const [mark, code] of [['401', 'key_invalid'], ['402', 'balance_empty'], ['400', 'bad_request']]) {
      const events = await readSse(await chat(`oops [[${mark}]]`));
      const err = events.find((e) => e.event === 'error');
      assert.equal(err.data.code, code);
      assert.equal(done(events).status, 'error');
      assert.equal(fake.requests.length, 1, 'never retried');
      fake.reset();
    }
  });

  test('retries a 429 once before the first byte, then succeeds', async () => {
    const events = await readSse(await chat('busy [[429-then-ok]]'));
    assert.equal(answerOf(events), 'Hello world!');
    assert.equal(fake.requests.length, 2);
    assert.ok(events.some((e) => e.event === 'status'));
  });

  test('a stream cut mid-answer keeps the partial text and is marked interrupted', async () => {
    const events = await readSse(await chat('cut me [[drop]]'));
    assert.equal(done(events).status, 'interrupted');
    const saved = (await (await fetch(`${base}/api/chats/c02-t09`)).json()).threads.at(-1);
    const a = saved.messages.at(-1);
    assert.equal(a.status, 'interrupted');
    assert.equal(a.content, 'partial ');
  });

  test('multi-byte characters split across network chunks survive', async () => {
    const events = await readSse(await chat('unicode [[split]]'));
    assert.equal(answerOf(events), 'héllo 🙂 done');
  });

  test('closing the browser tab aborts the upstream call and saves the partial as stopped', async () => {
    const ac = new AbortController();
    const res = await fetch(`${base}/api/chat`, { method: 'POST', headers: J(), signal: ac.signal, body: JSON.stringify({ topicId: 'c02-t09', clientMsgId: 'abort-0001', message: 'hang [[hang]]', mode: 'ask' }) });
    const reader = res.body.getReader();
    await reader.read(); // meta event
    await new Promise((r) => setTimeout(r, 150));
    ac.abort();
    await new Promise((r) => setTimeout(r, 400));
    assert.ok(fake.events.includes('upstream-closed'), 'upstream request was cancelled');
    assert.equal(ctx.controllers.size, 0);
    assert.equal(ctx.streaming.size, 0);
    const msgs = (await (await fetch(`${base}/api/chats/c02-t09`)).json()).threads.flatMap((t) => t.messages);
    assert.ok(msgs.some((m) => m.clientMsgId === 'abort-0001'));
    assert.ok(msgs.some((m) => m.status === 'stopped'));
  });

  test('role-play: persona and key stay server-side, debrief uses the rubric', async () => {
    const events = await readSse(await post('/api/chat', { topicId: 'c04-t07', clientMsgId: 'rp-0001-x', message: 'why cors *?', mode: 'roleplay' }));
    assert.equal(done(events).status, 'complete');
    const sys = fake.requests.at(-1).body.messages[0].content;
    assert.match(sys, /You are Priya/);
    assert.match(sys, /<hidden_facts>/);
    fake.reset();
    await readSse(await post('/api/chat', { topicId: 'c04-t07', clientMsgId: 'rp-0002-x', message: '', mode: 'debrief' }));
    const dsys = fake.requests.at(-1).body.messages[0].content;
    assert.match(dsys, /<rubric>/);
    assert.match(dsys, /SCORE: <total>/);
    assert.match(dsys, /<answer_key>/);
  });

  test('validation: unknown page, empty message, bad ids, too long', async () => {
    assert.equal((await post('/api/chat', { topicId: 'nope', clientMsgId: 'abcdefgh', message: 'x', mode: 'ask' })).status, 404);
    assert.equal((await post('/api/chat', { topicId: 'c02-t09', clientMsgId: 'abcdefgh', message: '   ', mode: 'ask' })).status, 400);
    assert.equal((await post('/api/chat', { topicId: 'c02-t09', clientMsgId: '!!', message: 'x', mode: 'ask' })).status, 400);
    assert.equal((await post('/api/chat', { topicId: 'c02-t09', clientMsgId: 'abcdefgh', threadId: '../../x', message: 'x', mode: 'ask' })).status, 400);
    assert.equal((await post('/api/chat', { topicId: 'c02-t09', clientMsgId: 'abcdefgh', message: 'x'.repeat(9000), mode: 'ask' })).status, 413);
    assert.equal(fake.requests.length, 0);
  });

  test('history, search and export read back what was said', async () => {
    await readSse(await chat('zebra stripes question'));
    const found = await (await fetch(`${base}/api/chats?q=zebra`)).json();
    assert.ok(found.threads.length >= 1);
    assert.equal((await (await fetch(`${base}/api/chats?q=nonexistentwordxyz`)).json()).threads.length, 0);
    const md = await (await fetch(`${base}/api/chats/c02-t09/export`)).text();
    assert.match(md, /zebra stripes question/);
    assert.match(md, /Hello world!/);
  });
});

describe('progress and notes', () => {
  test('per-topic progress PATCH merges and tracks the last page', async () => {
    await fetch(`${base}/api/progress/c01-t02`, { method: 'PATCH', headers: J(), body: JSON.stringify({ visited: true, frame: 2 }) });
    const p = await (await fetch(`${base}/api/progress/c02-t11`, { method: 'PATCH', headers: J(), body: JSON.stringify({ done: true }) })).json();
    assert.equal(p.topics['c01-t02'].frame, 2);
    assert.ok(p.topics['c02-t11'].done);
    assert.equal(p.last.id, 'c02-t11');
  });
  test('notes use a revision so two tabs cannot silently overwrite each other', async () => {
    const put = (text, rev) => fetch(`${base}/api/notes/c00-t01`, { method: 'PUT', headers: J(), body: JSON.stringify({ text, rev }) });
    assert.equal((await put('one', 0)).status, 200);
    const stale = await put('two', 0);
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).current.text, 'one');
    assert.equal((await put('three', 1)).status, 200);
  });
});

describe('challenge pages', () => {
  test('the page API carries starter, tests and solution text for every challenge', async () => {
    const t = await (await fetch(`${base}/api/topic/c01-t07`)).json();
    assert.equal(t.challenges.items.length, 5);
    for (const it of t.challenges.items) {
      assert.match(it.starterSource, /function /);
      assert.match(it.testsSource, /test\(/);
      assert.match(it.solutionSource, /return/);
    }
  });

  test('solved flags are saved per challenge, can be cleared, and reject junk keys', async () => {
    const patch = (body) => fetch(`${base}/api/progress/c01-t07`, { method: 'PATCH', headers: J(), body: JSON.stringify(body) });
    let p = await (await patch({ solved: { parity: true, grade: true } })).json();
    assert.ok(p.topics['c01-t07'].solved.parity > 0);
    assert.ok(p.topics['c01-t07'].solved.grade > 0);
    p = await (await patch({ solved: { parity: false, '__proto__': true, 'BAD KEY': true, constructor: true, [`x${'y'.repeat(40)}`]: true } })).json();
    const solved = p.topics['c01-t07'].solved;
    assert.equal('parity' in solved, false, 'false clears a solved flag');
    assert.ok(solved.grade > 0, 'other flags are kept');
    assert.deepEqual(Object.keys(solved).sort(), ['constructor', 'grade'].sort().filter((k) => k in solved), 'only well-formed ids are stored');
    assert.equal({}.polluted, undefined);
    // a flood of ids cannot grow the file without bound
    const many = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`c${i}`, true]));
    for (let r = 0; r < 6; r++) await patch({ solved: Object.fromEntries(Object.entries(many).slice(r * 10, r * 10 + 10)) });
    p = await (await patch({})).json();
    assert.ok(Object.keys(p.topics['c01-t07'].solved).length <= 24);
  });

  test('the tutor knows the challenges, holds the reference solution back, and sees what was revealed', async () => {
    const res = await chat('give me a hint', { topicId: 'c01-t07', live: { challenge: 'parity', revealed: 'parity,grade', code: 'function parity(n) {}', error: 'Challenge parity: 0/4 tests pass' } });
    await readSse(res);
    const sent = fake.requests.at(-1).body.messages;
    assert.match(sent[0].content, /CHALLENGES \(the learner solves these in the page/);
    assert.match(sent[0].content, /REFERENCE SOLUTION \(hidden from the learner until revealed\)/);
    assert.match(sent[0].content, /never paste a reference solution unless/);
    assert.match(sent.at(-1).content, /working on challenge "parity"/);
    assert.match(sent.at(-1).content, /solutions already revealed: parity,grade/);
    assert.match(sent.at(-1).content, /last run error: Challenge parity/);
  });

  test('oversized live fields are cut, not forwarded', async () => {
    const res = await chat('hi', { topicId: 'c01-t07', live: { challenge: 'x'.repeat(500), revealed: 'y'.repeat(900) } });
    await readSse(res);
    const last = fake.requests.at(-1).body.messages.at(-1).content;
    assert.equal(last.includes('x'.repeat(100)), false);
    assert.equal(last.includes('y'.repeat(200)), false);
  });
});

describe('hardening found by the independent security review', () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fire = (topicId, message, extra = {}, signal) => fetch(`${base}/api/chat`, { method: 'POST', headers: J(), signal, body: JSON.stringify({ topicId, clientMsgId: `r-${Math.random().toString(36).slice(2, 12)}`, message, mode: 'ask', ...extra }) });

  test('the concurrency cap holds when requests arrive at the same instant', async () => {
    const topics = ['c02-t09', 'c02-t11', 'c01-t02', 'c04-t08', 'c01-t05', 'c01-t06', 'c04-t04', 'c03-t01'];
    const acs = topics.map(() => new AbortController());
    const reqs = topics.map((t, i) => fire(t, 'x [[hang]]', {}, acs[i].signal).then((r) => r.status).catch(() => 'aborted'));
    await sleep(700);
    assert.ok(fake.requests.length <= 3, `${fake.requests.length} upstream calls (cap is 3)`);
    acs.forEach((a) => a.abort());
    const statuses = await Promise.all(reqs);
    assert.ok(statuses.filter((s) => s === 429).length >= topics.length - 3, JSON.stringify(statuses));
    await sleep(300);
    assert.equal(ctx.controllers.size, 0);
  });

  test('two answers can never stream into one thread at the same time', async () => {
    const thread = await (await post('/api/chats/c02-t09/threads', { kind: 'ask', fresh: true })).json();
    const acs = [new AbortController(), new AbortController()];
    const results = await Promise.all(acs.map((a) => fire('c02-t09', 'same thread [[hang]]', { threadId: thread.id }, a.signal).then((r) => r.status).catch(() => 'aborted')));
    assert.deepEqual([...results].sort(), [200, 409]);
    await sleep(400); // let the admitted request reach the upstream before cancelling it
    assert.equal(fake.requests.length, 1, 'only one answer was ever requested');
    acs.forEach((a) => a.abort());
    await sleep(300);
    assert.equal(ctx.streaming.size, 0);
  });

  test('a tab that closes early never leaves an upstream call running', async () => {
    for (let i = 0; i < 8; i++) {
      await new Promise((resolve) => {
        const body = JSON.stringify({ topicId: 'c02-t09', clientMsgId: `early-${i}-aaaa`, message: 'x [[hang]]', mode: 'ask', fresh: true });
        const origin127 = `http://127.0.0.1:${port}`;
        const req = http.request({ host: '127.0.0.1', port, path: '/api/chat', method: 'POST', headers: { 'content-type': 'application/json', origin: origin127, 'content-length': Buffer.byteLength(body) } }, (res) => {
          res.once('data', () => { req.destroy(); resolve(); });
          res.on('error', () => resolve());
        });
        req.on('error', () => resolve());
        req.end(body);
        setTimeout(() => { req.destroy(); resolve(); }, 1500);
      });
    }
    await sleep(700);
    const closed = fake.events.filter((e) => e === 'upstream-closed').length;
    assert.equal(closed, fake.requests.length, `${fake.requests.length} upstream calls started, ${closed} cancelled`);
    assert.equal(ctx.controllers.size, 0);
  });

  test('stopped streams still count toward the daily token cap (estimate)', async () => {
    const before = (await ctx.store.read('usage.json', { day: '', tokens: 0 })).tokens;
    const ac = new AbortController();
    const res = await fire('c02-t09', 'count me [[hang]]', { fresh: true }, ac.signal);
    await res.body.getReader().read();
    await sleep(200);
    ac.abort();
    await sleep(500);
    const after = (await ctx.store.read('usage.json', { day: '', tokens: 0 })).tokens;
    assert.ok(after > before, `${before} → ${after}`);
  });

  test('upstream error text is scrubbed: the key never reaches the browser or the chat file', async () => {
    const events = await readSse(await chat('leak please [[echo-key]]'));
    const err = events.find((e) => e.event === 'error');
    assert.ok(err);
    assert.equal(JSON.stringify(events).includes('sk-test-0000000000000000'), false);
    assert.match(err.data.message, /\[redacted\]/);
    assert.equal(JSON.stringify(await (await fetch(`${base}/api/chats/c02-t09`)).json()).includes('sk-test-0000000000000000'), false);
    fake.reset();
    const e401 = await readSse(await chat('nope [[401]]'));
    assert.equal(/fake 401/.test(JSON.stringify(e401)), false, 'upstream text is not echoed for 401');
  });

  test('every alias of the code-runner page gets the sandbox CSP', async () => {
    let served = 0;
    for (const p of ['/sandbox/runner.html', '/sandbox//runner.html', '/sandbox/./runner.html', '/sandbox/%2e/runner.html', '/sandbox/%72unner.html', '/sandbox/Runner.html', '/sandbox/RUNNER.HTML']) {
      const r = await rawRequest(p, { host: `localhost:${port}` });
      if (r.status !== 200) continue; // a case-sensitive file system 404s the upper-case forms
      served++;
      assert.match(r.headers['content-security-policy'], /^sandbox allow-scripts;/, p);
    }
    assert.ok(served >= 4, `only ${served} aliases were served`);
  });

  test('malformed paths are client errors, not server errors; cache headers follow the served file', async () => {
    assert.equal((await rawRequest('/api/topic/%E0%A4%A', { host: `localhost:${port}` })).status, 400); // router param decoding fails
    assert.match((await fetch(`${base}/fonts/inter.woff2`)).headers.get('cache-control'), /immutable/);
    assert.equal((await fetch(`${base}/css/tokens.css`)).headers.get('cache-control'), 'no-cache');
  });
});

describe('packaging', () => {
  test('page routes still work when the project lives under a dot-directory (e.g. ~/.projects/…)', async () => {
    const dot = join(ROOT, '.tmp', `.dot-${process.pid}`);
    rmSync(dot, { recursive: true, force: true });
    mkdirSync(join(dot, 'public'), { recursive: true });
    writeFileSync(join(dot, 'public', 'index.html'), '<!doctype html><title>Living library dot-test</title>');
    const cfg = loadConfig({}, { dataDir: join(dot, 'data'), publicDir: join(dot, 'public'), silent: true, deepseek: { key: 'sk-test-0000000000000000', baseUrl: fake.url, model: 'deepseek-flash' } });
    const c3 = await createContext(cfg);
    const s3 = createApp(c3).listen(0, '127.0.0.1');
    await new Promise((r) => s3.once('listening', r));
    try {
      const res = await fetch(`http://localhost:${s3.address().port}/read/c02-t09/2`);
      assert.equal(res.status, 200);
      assert.match(await res.text(), /dot-test/);
    } finally {
      s3.closeAllConnections(); await new Promise((r) => s3.close(r)); await c3.store.close();
      rmSync(dot, { recursive: true, force: true });
    }
  });
});

describe('limits', () => {
  test('the per-minute limiter and the daily token cap stop runaway use', async () => {
    const tight = loadConfig({}, { dataDir: join(DATA, 'tight'), silent: true, limits: { chatPerMinute: 2, dailyTokens: 20 }, deepseek: { key: 'sk-test-0000000000000000', baseUrl: fake.url, model: 'deepseek-flash' } });
    const c2 = await createContext(tight);
    const s2 = createApp(c2).listen(0, '127.0.0.1');
    await new Promise((r) => s2.once('listening', r));
    const p2 = s2.address().port;
    const send = (n) => fetch(`http://localhost:${p2}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json', origin: `http://localhost:${p2}` }, body: JSON.stringify({ topicId: 'c02-t09', clientMsgId: `lim-${n}-aaaa`, message: `q${n}`, mode: 'ask' }) });
    assert.equal((await send(1)).status, 200); await (await send(1)).text().catch(() => {});
    const r2 = await send(2); await r2.text();
    const r3 = await send(3);
    assert.equal(r3.status, 429);
    assert.match((await r3.json()).error.code, /slow_down|daily_cap/);
    s2.closeAllConnections(); await new Promise((r) => s2.close(r)); await c2.store.close();
  });
});
