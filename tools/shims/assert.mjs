// Small `assert` for the in-browser runner (also used by challenge tests).
import { inspect } from './inspect.mjs';

export class AssertionError extends Error {
  constructor({ message, actual, expected, operator, generated }) {
    super(message);
    this.name = 'AssertionError';
    this.code = 'ERR_ASSERTION';
    Object.assign(this, { actual, expected, operator, generatedMessage: generated });
  }
}

const tag = (v) => Object.prototype.toString.call(v);

export function deepEqual(a, b, strict = true, seen = new Map()) {
  if (strict ? Object.is(a, b) : a == b || (a !== a && b !== b)) return true; // eslint-disable-line eqeqeq
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (tag(a) !== tag(b)) return false;
  if (seen.get(a) === b) return true;
  seen.set(a, b);
  if (a instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp) return String(a) === String(b);
  if (a instanceof Error) return a.name === b.name && a.message === b.message;
  if (a instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) if (!b.has(k) || !deepEqual(v, b.get(k), strict, seen)) return false;
    return true;
  }
  if (a instanceof Set) {
    if (a.size !== b.size) return false;
    outer: for (const v of a) {
      if (b.has(v)) continue;
      for (const w of b) if (deepEqual(v, w, strict, seen)) continue outer;
      return false;
    }
    return true;
  }
  if (ArrayBuffer.isView(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  const ka = Reflect.ownKeys(a).filter((k) => Object.prototype.propertyIsEnumerable.call(a, k));
  const kb = Reflect.ownKeys(b).filter((k) => Object.prototype.propertyIsEnumerable.call(b, k));
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k], strict, seen)) return false;
  }
  return true;
}

function fail(actual, expected, message, operator, defaultMessage) {
  if (message instanceof Error) throw message;
  throw new AssertionError({ message: message ?? defaultMessage, actual, expected, operator, generated: message == null });
}

const matches = (err, expected) => {
  if (expected === undefined) return true;
  if (typeof expected === 'function') {
    if (expected.prototype !== undefined && err instanceof expected) return true;
    if (Error.isPrototypeOf(expected)) return false;
    return expected.call({}, err) === true;
  }
  if (expected instanceof RegExp) return expected.test(String(err));
  if (typeof expected === 'object') return Object.keys(expected).every((k) => (expected[k] instanceof RegExp ? expected[k].test(err[k]) : deepEqual(err[k], expected[k])));
  return true;
};

export function makeAssert() {
  const ok = (v, m) => { if (!v) fail(v, true, m, '==', `The expression evaluated to a falsy value:\n\n  assert.ok(${inspect(v)})\n`); };
  const assert = (v, m) => ok(v, m);
  Object.assign(assert, {
    ok,
    AssertionError,
    fail: (m = 'Failed') => fail(undefined, undefined, m, 'fail', 'Failed'),
    equal: (a, b, m) => { if (!(a == b || (a !== a && b !== b))) fail(a, b, m, '==', `${inspect(a)} == ${inspect(b)}`); }, // eslint-disable-line eqeqeq
    notEqual: (a, b, m) => { if (a == b) fail(a, b, m, '!=', `${inspect(a)} != ${inspect(b)}`); }, // eslint-disable-line eqeqeq
    strictEqual: (a, b, m) => { if (!Object.is(a, b)) fail(a, b, m, 'strictEqual', `Expected values to be strictly equal:\n\n${inspect(a)} !== ${inspect(b)}\n`); },
    notStrictEqual: (a, b, m) => { if (Object.is(a, b)) fail(a, b, m, 'notStrictEqual', `Expected "actual" to be strictly unequal to: ${inspect(b)}`); },
    deepEqual: (a, b, m) => { if (!deepEqual(a, b, false)) fail(a, b, m, 'deepEqual', `Expected values to be loosely deep-equal:\n\n${inspect(a)}\n\nshould loosely deep-equal\n\n${inspect(b)}`); },
    deepStrictEqual: (a, b, m) => { if (!deepEqual(a, b, true)) fail(a, b, m, 'deepStrictEqual', `Expected values to be strictly deep-equal:\n${inspect(a)}\n\nshould equal\n\n${inspect(b)}`); },
    notDeepStrictEqual: (a, b, m) => { if (deepEqual(a, b, true)) fail(a, b, m, 'notDeepStrictEqual', `Expected "actual" not to be strictly deep-equal to: ${inspect(b)}`); },
    match: (s, re, m) => { if (!re.test(s)) fail(s, re, m, 'match', `The input did not match the regular expression ${inspect(re)}. Input:\n\n${inspect(s)}\n`); },
    ifError: (e) => { if (e !== null && e !== undefined) throw e; },
    throws(fn, expected, m) {
      let threw = false;
      let err;
      try { fn(); } catch (e) { threw = true; err = e; }
      if (!threw) fail(undefined, expected, typeof expected === 'string' ? expected : m, 'throws', 'Missing expected exception.');
      if (typeof expected !== 'string' && !matches(err, expected)) throw err;
    },
    doesNotThrow(fn, m) {
      try { fn(); } catch (e) { fail(e, undefined, typeof m === 'string' ? m : undefined, 'doesNotThrow', `Got unwanted exception.\nActual message: "${e && e.message}"`); }
    },
    async rejects(p, expected, m) {
      let threw = false;
      let err;
      try { await (typeof p === 'function' ? p() : p); } catch (e) { threw = true; err = e; }
      if (!threw) fail(undefined, expected, m, 'rejects', 'Missing expected rejection.');
      if (!matches(err, expected)) throw err;
    },
  });
  assert.strict = assert;
  return assert;
}
