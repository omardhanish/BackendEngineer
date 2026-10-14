// API client: one place for errors, retries and the Idempotency-Key.
let keySeq = 1;   // demo only: real code uses crypto.randomUUID()

function createClient(send, { retries = 2, baseDelayMs = 200 } = {}) {
  return async function request(method, path, body, opts = {}) {
    // Same key on every retry; the caller may pass one for its own retries.
    const key = opts.key ??
      (method === 'POST' ? `key-${keySeq++}` : undefined);
    for (let attempt = 1; ; attempt++) {
      let res;
      try { res = await send({ method, path, body, key }); }
      catch { res = { status: 0, body: { error: { code: 'NETWORK' } } }; }
      console.log(` ${method} ${path} ${key ?? ''} -> ${res.status}`);
      if (res.status >= 200 && res.status < 300) {
        return { ok: true, data: res.body };
      }
      const transient = res.status === 0 || res.status >= 500;
      if (!transient || attempt > retries) {
        return { ok: false, code: res.body.error.code, canRetry: transient };
      }
      const wait = baseDelayMs * 2 ** (attempt - 1);
      console.log(`   retry ${attempt}, would wait ${wait} ms`);
    }
  };
}

// A fake server so the client runs in the page with no network.
const byKey = new Map();
let calls = 0;
async function fakeServer({ method, path, body, key }) {
  calls++;
  if (method === 'GET') {
    return calls === 1 ? { status: 503, body: { error: { code: 'BUSY' } } }
      : { status: 200, body: { items: ['SL-1', 'SL-2'] } };
  }
  if (byKey.has(key)) return { status: 200, body: byKey.get(key) };
  if (body.slotId === 'SL-2') {
    return { status: 409, body: { error: { code: 'SLOT_TAKEN' } } };
  }
  byKey.set(key, { id: `AP-${byKey.size + 1}`, slotId: body.slotId });
  if (byKey.size === 1) throw new Error('connection reset'); // reply lost
  return { status: 201, body: byKey.get(key) };
}

const api = createClient(fakeServer);
const show = async (label, p) => console.log(label, JSON.stringify(await p));
await show('load slots', api('GET', '/doctors/D-1/slots'));
await show('book SL-1', api('POST', '/appointments', { slotId: 'SL-1' }));
await show('book SL-2', api('POST', '/appointments', { slotId: 'SL-2' }));
