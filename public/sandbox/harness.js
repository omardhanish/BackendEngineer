// Test harness for challenge pages. Plain JavaScript with no imports, so the SAME text runs in the in-page
// runner (prepended to the learner's code and the tests) and in Node (tools/lib/challenges.mjs, which proves that
// every solution passes and every starter fails). Tests use test(name, fn) and eq(actual, expected).
const __results = [];
const __pending = [];
function __show(v) {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'bigint') return v + 'n';
  if (typeof v === 'function') return '[Function ' + (v.name || 'anonymous') + ']';
  if (typeof v === 'undefined') return 'undefined';
  if (typeof v === 'symbol') return String(v);
  if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
  if (v instanceof Error) return v.name + ': ' + v.message;
  try {
    const text = JSON.stringify(v, function (k, x) { return typeof x === 'bigint' ? x + 'n' : x === undefined ? '__undefined__' : x; });
    return text === undefined ? String(v) : text.replace(/"__undefined__"/g, 'undefined');
  } catch (e) { return String(v); }
}
function __same(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(function (k) { return Object.prototype.hasOwnProperty.call(b, k) && __same(a[k], b[k]); });
}
function eq(actual, expected, label) {
  if (!__same(actual, expected)) throw new Error((label ? label + ': ' : '') + 'expected ' + __show(expected) + ' but got ' + __show(actual));
}
function test(name, fn) {
  const slot = __pending.length;
  const p = (async function () {
    try { await fn(); __results[slot] = { name: name, ok: true }; }
    catch (e) { __results[slot] = { name: name, ok: false, msg: String((e && e.message) || e).slice(0, 300) }; }
  })();
  __pending.push(p);
  return p;
}
async function __finish() {
  await Promise.all(__pending);
  console.log('@@RESULTS ' + JSON.stringify(__results));
}
