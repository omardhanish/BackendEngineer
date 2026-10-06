const parse = (v) => v.split('.').map(Number);
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

function accepts(range, version) {
  const base = parse(range.slice(1));
  const v = parse(version);
  if (cmp(v, base) < 0) return false; // older than the range start
  if (v[0] !== base[0]) return false; // a new major is never accepted
  return range[0] === '^' || v[1] === base[1]; // ~ also pins the minor
}

for (const v of ['5.2.0', '5.2.9', '5.9.0', '6.0.0']) {
  console.log(v, accepts('^5.2.1', v), accepts('~5.2.1', v));
}
