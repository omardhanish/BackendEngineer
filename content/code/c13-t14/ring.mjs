import { createHash } from 'node:crypto';

const hash = (s) => createHash('sha1').update(s).digest().readUInt32BE(0);
const keys = Array.from({ length: 1000 }, (_, i) => `user:${i}`);

function makeRing(servers, vnodes) {
  const points = servers.flatMap((s) =>
    Array.from({ length: vnodes }, (_, i) => ({ s, at: hash(`${s}#${i}`) })));
  points.sort((a, b) => a.at - b.at);
  return (key) => (points.find((p) => p.at >= hash(key)) ?? points[0]).s;
}
const load = (owner) => {
  const n = {};
  for (const k of keys) { const s = owner(k); n[s] = (n[s] ?? 0) + 1; }
  return JSON.stringify(n);
};
console.log('1 point each:', load(makeRing(['A', 'B', 'C'], 1)));
console.log('200 points each:', load(makeRing(['A', 'B', 'C'], 200)));

const before = makeRing(['A', 'B', 'C'], 200);
const after = makeRing(['A', 'B', 'C', 'D'], 200);
const moved = (a, b) => keys.filter((k) => a(k) !== b(k)).length;
console.log('ring moved:', moved(before, after));
console.log('mod moved:', moved((k) => hash(k) % 3, (k) => hash(k) % 4));
