import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import { server } from './task-server.mjs';

await new Promise((resolve) => server.listen(0, resolve));
const base = `http://localhost:${server.address().port}`;

// Send one request. Resolves with the status, content type and body text.
const call = async (path, method = 'GET', body) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(1000),
  }).catch(() => {
    throw new Error(`${method} ${path} got no reply: does every path end?`);
  });
  const text = await res.text();
  return { status: res.status, type: res.headers.get('content-type'), text };
};
const jsonOf = (r) => {
  assert.match(r.type ?? '', /application\/json/, 'the reply is not JSON');
  return JSON.parse(r.text);
};
const add = async (title) => {
  const r = await call('/tasks', 'POST', JSON.stringify({ title }));
  assert.equal(r.status, 201, `POST /tasks answered ${r.status}, not 201`);
  return jsonOf(r);
};
const remove = (id) => call(`/tasks/${id}`, 'DELETE');
const list = async () => {
  const r = await call('/tasks');
  assert.equal(r.status, 200, `GET /tasks answered ${r.status}, not 200`);
  return jsonOf(r);
};

let failed = 0;
const show = (value) => inspect(value, { breakLength: Infinity });
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failed += 1;
    const why = err.generatedMessage
      ? `expected ${show(err.expected)}, got ${show(err.actual)}`
      : err.message.split('\n')[0];
    console.log(`FAIL ${name}: ${why}`);
  }
};

await check('GET /tasks starts as an empty array', async () => {
  assert.deepEqual(await list(), []);
});
await check('POST /tasks creates a task', async () => {
  const task = await add('Buy tea');
  assert.notEqual(task.id, undefined, 'the new task has no id');
  assert.deepEqual(task, { id: task.id, title: 'Buy tea', done: false });
});
await check('GET /tasks lists a created task', async () => {
  const task = await add('Water plants');
  assert.deepEqual((await list()).find((t) => t.id === task.id), task);
});
await check('a missing or empty title is a 400, nothing stored', async () => {
  const before = (await list()).length;
  const missing = await call('/tasks', 'POST', '{}');
  const empty = await call('/tasks', 'POST', '{"title":""}');
  assert.deepEqual([missing.status, empty.status], [400, 400]);
  assert.equal((await list()).length, before, 'a rejected task was stored');
});
await check('ids stay unique after a DELETE', async () => {
  const a = await add('Same title');
  const b = await add('Same title');
  await remove(a.id);
  const c = await add('Same title');
  assert.equal(new Set([b.id, c.id]).size, 2, 'a new task reused an id');
  assert.notEqual(a.id, b.id, 'two tasks share an id');
});
await check('DELETE /tasks/:id answers 204 with no body', async () => {
  const task = await add('Temporary');
  const r = await remove(task.id);
  assert.deepEqual([r.status, r.text], [204, '']);
  const left = (await list()).filter((t) => t.id === task.id);
  assert.equal(left.length, 0, 'the deleted task is still listed');
});
await check('an unknown id is a 404 and removes nothing', async () => {
  const keep = await add('Keep me');
  const gone = await add('Gone');
  await remove(gone.id);
  const ids = [gone.id, 987654, -1, 'abc'];
  const codes = [];
  for (const id of ids) codes.push((await remove(id)).status);
  assert.deepEqual(codes, [404, 404, 404, 404]);
  assert.ok((await list()).some((t) => t.id === keep.id), 'a task vanished');
});
await check('other paths and methods get a 404 JSON reply', async () => {
  const misses = [
    ['GET', '/nope'],
    ['PUT', '/tasks'],
    ['DELETE', '/tasks/1/x'],
  ];
  for (const [method, path] of misses) {
    const r = await call(path, method);
    assert.equal(r.status, 404, `${method} ${path} answered ${r.status}`);
    jsonOf(r);
  }
});
await check('bad JSON is a 400 and the server survives', async () => {
  const r = await call('/tasks', 'POST', '{"title":');
  assert.equal(r.status, 400);
  assert.equal((await call('/tasks')).status, 200);
});

server.close();
server.closeAllConnections();
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exitCode = failed ? 1 : 0;
