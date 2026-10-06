// Unit tests: store durability, security helpers, prompt assembly.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { join } from 'node:path';

process.env.DEEPSEEK_API_KEY = 'sk-test-0000000000000000';
const { ROOT } = await import('../server/lib/env.js');
const { Store } = await import('../server/lib/store.js');
const { redact, ID_RE, RateLimiter } = await import('../server/lib/security.js');
const { buildMessages, topicToText } = await import('../server/lib/prompt.js');
const { Chats } = await import('../server/lib/chats.js');

const tmp = (name) => { const d = join(ROOT, '.tmp', `unit-${name}-${process.pid}`); rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); return d; };

describe('store', () => {
  test('parallel updates never lose a write', async () => {
    const dir = tmp('par');
    const s = new Store(dir);
    await s.init();
    await Promise.all(Array.from({ length: 60 }, () => s.update('counter.json', (d) => { d.n += 1; }, { n: 0 })));
    assert.equal((await s.read('counter.json', { n: -1 })).n, 60);
    assert.equal(JSON.parse(readFileSync(join(dir, 'counter.json'), 'utf8')).n, 60);
    await s.close();
    rmSync(dir, { recursive: true, force: true });
  });
  test('a corrupt file is quarantined and the backup restores it', async () => {
    const dir = tmp('corrupt');
    const a = new Store(dir);
    await a.init();
    await a.update('doc.json', (d) => { d.v = 1; }, { v: 0 });
    await a.update('doc.json', (d) => { d.v = 2; }, { v: 0 });
    await a.close();
    writeFileSync(join(dir, 'doc.json'), '{"v": 2,,,');
    const b = new Store(dir);
    await b.init();
    const got = await b.read('doc.json', { v: -1 });
    assert.equal(got.v, 1, 'restored from .bak (the previous good write)');
    assert.ok(readdirSync(dir).some((f) => f.startsWith('doc.json.corrupt-')));
    await b.close();
    rmSync(dir, { recursive: true, force: true });
  });
  test('a second server on the same data dir is refused', async () => {
    const dir = tmp('lock');
    writeFileSync(join(dir, '.lock'), JSON.stringify({ pid: process.ppid }));
    const s = new Store(dir);
    await assert.rejects(() => s.init(), /Another BackendEngineer server/);
    rmSync(dir, { recursive: true, force: true });
  });
  test('paths cannot escape the data dir', async () => {
    const dir = tmp('esc');
    const s = new Store(dir);
    await s.init();
    await assert.rejects(() => s.read('../secret.json', {}), /bad store path/);
    await assert.rejects(() => s.update('/etc/passwd', () => {}, {}), /bad store path/);
    await s.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('security helpers', () => {
  test('redact removes keys and bearer tokens from log lines', () => {
    const line = 'failed with sk-0123456789abcdef0123456789abcdef and ghp_0123456789abcdefghijklmnopqrstuvwxyz and Bearer abcdefghijklmnop';
    assert.equal(/sk-0123|ghp_0123|abcdefghij/.test(redact(line)), false);
    assert.match(redact(line), /\[redacted\]/);
  });
  test('id pattern', () => {
    for (const ok of ['c02-t09', 'abc', 'a-b-c']) assert.ok(ID_RE.test(ok));
    for (const bad of ['', 'A', 'a_b', 'a/b', '../x', 'a'.repeat(81), 'é']) assert.equal(ID_RE.test(bad), false, bad);
  });
  test('rate limiter slides', () => {
    const rl = new RateLimiter({ max: 2, windowMs: 1000 });
    assert.ok(rl.take(0)); assert.ok(rl.take(10)); assert.equal(rl.take(20), false); assert.ok(rl.take(1100));
  });
});

describe('prompt assembly', () => {
  const topic = {
    id: 'c02-t09', kind: 'lecture', authored: true, title: 'The event loop', source: 'x', chapter: { n: 2, title: 'Node.js core' }, position: { index: 23, total: 197 },
    idea: 'One thread.', points: ['a', 'b'], quiz: { q: 'q?', options: ['x', 'y', 'z'], answer: 1 }, code: [], prev: { title: 'Prev' }, next: { title: 'Next' },
  };
  const limits = { pageChars: 40000, historyMessages: 20, historyChars: 48000, maxTokens: 1536 };
  const hist = (n) => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));

  test('the system prompt is byte-stable across turns (cache friendly) and live state goes in the last user turn', () => {
    const a = buildMessages({ topic, mode: 'ask', history: [], userText: 'q1', live: { frameLabel: 'A', frame: 1 }, limits });
    const b = buildMessages({ topic, mode: 'ask', history: hist(4), userText: 'q2', live: { frameLabel: 'B', frame: 3, code: 'x' }, limits });
    assert.equal(a.messages[0].content, b.messages[0].content);
    assert.match(b.messages.at(-1).content, /<state>viewing frame 3 "B"/);
    assert.match(a.messages[0].content, /answer: B/);
  });
  test('never starts a conversation with an assistant turn and trims oldest-first', () => {
    const h = hist(31); // starts with user, 31 messages
    const { messages } = buildMessages({ topic, mode: 'ask', history: [{ role: 'assistant', content: 'opening' }, ...h], userText: 'now', limits });
    assert.equal(messages[1].role, 'user');
    assert.ok(messages.length - 2 <= 20);
    assert.equal(messages.at(-1).content, 'now');
  });
  test('quotes are passed along; unwritten pages still get a prompt', () => {
    const { messages } = buildMessages({ topic, mode: 'ask', history: [], userText: 'why?', quote: 'selected text', limits });
    assert.match(messages.at(-1).content, /<quote>\nselected text\n<\/quote>/);
    const soon = topicToText({ ...topic, authored: false });
    assert.match(soon, /has not been written yet/);
  });
  test('merging keeps roles alternating', () => {
    const doc = { threads: [{ id: 't', messages: [{ id: '1', role: 'user', content: 'a' }, { id: '2', role: 'user', content: 'b' }, { id: '3', role: 'assistant', content: '', status: 'error' }, { id: '4', role: 'assistant', content: 'ok', status: 'complete' }] }] };
    const ctx = Chats.contextOf(doc.threads[0]);
    assert.deepEqual(ctx.map((m) => m.role), ['user', 'assistant']);
    assert.equal(ctx[0].content, 'a\n\nb');
  });
});

describe('code-runner import rewriting', () => {
  const ctx = { self: {} };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, 'public/sandbox/esm.js'), 'utf8'), ctx);
  const esm = ctx.self.__esmToCjs;

  test('converts the supported import forms and keeps line numbers', () => {
    assert.equal(esm("import { EventEmitter } from 'node:events';"), 'const { EventEmitter } = require("node:events");');
    assert.equal(esm("import fs from 'node:fs'"), 'const fs = require("node:fs");');
    assert.equal(esm("import * as path from 'node:path';"), 'const path = require("node:path");');
    assert.equal(esm("import { a as b, c } from 'x';"), 'const { a : b, c } = require("x");');
    assert.match(esm("import def, { named } from 'm';"), /const __m\d+ = require\("m"\); const def = __m\d+\.default \?\? __m\d+; const \{ named \} = __m\d+;/);
    assert.equal(esm("import 'polyfill';"), 'require("polyfill");');
    const multi = "import {\n  a,\n  b,\n} from 'm';\nconsole.log(1);";
    assert.equal(esm(multi).split('\n').length, multi.split('\n').length);
    assert.equal(esm('const important = 1; // import x from y'), 'const important = 1; // import x from y');
  });

  test('hostile whitespace cannot stall it (ReDoS regression: the unbounded version took 1 s at 1,600 spaces)', () => {
    const evil = ['import' + ' '.repeat(20000), 'import ' + 'a '.repeat(9000), 'import {' + ' '.repeat(19000), 'import' + '\n'.repeat(15000) + 'x', ('import x' + ' '.repeat(30) + '\n').repeat(500), ('import {' + 'a,'.repeat(150) + '\n').repeat(60)];
    for (const input of evil) {
      const t0 = performance.now();
      esm(input);
      const ms = performance.now() - t0;
      assert.ok(ms < 250, `${ms.toFixed(0)} ms for ${JSON.stringify(input.slice(0, 20))}…`);
    }
  });
});
