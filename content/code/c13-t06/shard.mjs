const N = 3;
const fnv = (s) => [...s].reduce(
  (h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const byHash = (id) => fnv(`user-${id}`) % N;
const byRange = (id) => Math.min(Math.floor(id / 100), N - 1);

const newIds = [301, 302, 303, 304, 305, 306];
const spread = (pick) => {
  const counts = Array(N).fill(0);
  for (const id of newIds) counts[pick(id)]++;
  return counts.join(',');
};
console.log('range:', spread(byRange));
console.log('hash: ', spread(byHash));
