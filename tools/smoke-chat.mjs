// One real round-trip to DeepSeek using the key in .env: model listed, one short streamed answer, thread saved.
// This is the only script that spends (a tiny amount of) your DeepSeek credit.   npm run smoke:chat
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4012;
const DATA = join(root, '.tmp', 'smoke-data');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
rmSync(DATA, { recursive: true, force: true });

const server = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: String(PORT), DATA_DIR: '.tmp/smoke-data', LOG: 'silent' }, stdio: 'ignore' });
let exit = 1;
try {
  let health;
  for (let i = 0; i < 40; i++) { try { health = await (await fetch(`http://localhost:${PORT}/api/health`)).json(); if (health.tutor.modelOk !== null) break; } catch { /* starting */ } await sleep(300); }
  console.log(`tutor configured: ${health?.tutor?.configured} · model: ${health?.tutor?.model} · model listed by DeepSeek: ${health?.tutor?.modelOk}`);
  if (!health?.tutor?.configured) throw new Error('No DEEPSEEK_API_KEY in .env');
  if (!health.tutor.modelOk) throw new Error('DeepSeek does not list the configured model (check DEEPSEEK_MODEL and the key).');

  const res = await fetch(`http://localhost:${PORT}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: `http://localhost:${PORT}` },
    body: JSON.stringify({ topicId: 'c02-t09', clientMsgId: 'smoke-run-0001', message: 'In one short sentence: why does Node run promise callbacks before setTimeout callbacks?', mode: 'ask' }),
  });
  if (!res.ok) throw new Error(`chat failed: ${res.status} ${await res.text()}`);
  const text = await res.text();
  const answer = [...text.matchAll(/event: delta\ndata: (.*)\n/g)].map((m) => JSON.parse(m[1]).t).join('');
  const done = JSON.parse(/event: done\ndata: (.*)\n/.exec(text)[1]);
  console.log(`streamed (${done.usage?.total_tokens ?? '?'} tokens, status ${done.status}):\n  ${answer.trim()}`);
  if (done.status !== 'complete' || answer.length < 20) throw new Error('unexpected answer');
  await sleep(300);
  const file = join(DATA, 'chats', 'c02-t09.json');
  if (!existsSync(file)) throw new Error('chat was not saved');
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  console.log(`saved: ${saved.threads[0].messages.length} messages in data/chats/c02-t09.json (smoke copy)`);
  console.log('\n✔ smoke test passed');
  exit = 0;
} catch (e) {
  console.error(`\n✖ ${e.message}`);
} finally {
  server.kill('SIGTERM');
  await sleep(300);
  rmSync(DATA, { recursive: true, force: true });
  process.exit(exit);
}
