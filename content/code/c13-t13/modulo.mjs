const hash = (s) =>
  [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const keys = Array.from({ length: 1000 }, (_, i) => `user:${i}`);

for (const [from, to] of [[3, 4], [10, 11]]) {
  const moved = keys.filter((k) => hash(k) % from !== hash(k) % to).length;
  console.log(`${from} -> ${to} servers: ${moved} of ${keys.length} move`);
}
