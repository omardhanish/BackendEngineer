// Fake server: stores bookings by Idempotency-Key, like page 7's API.
const byKey = new Map(), taken = new Set(['17:00']);
let loseNextResponse = true;          // the first reply gets lost in transit
async function fakeApi(body, key) {
  const replay = byKey.has(key);
  if (!replay && taken.has(body.startsAt)) return { status: 409 };
  if (!replay) byKey.set(key, { id: `BK-${byKey.size + 1}` });
  if (loseNextResponse) { loseNextResponse = false;
    throw new Error('network timeout'); }      // saved, but reply lost
  return { status: replay ? 200 : 201, body: byKey.get(key) };
}

// API client: one key per user action, reused on every retry of it.
let keySeq = 0;                       // demo only: use crypto.randomUUID()
function createClient(send, retries = 2) {
  let inFlight = null;
  return {
    book(body) {
      if (inFlight) return inFlight;  // double click: same request
      const key = `ik-${++keySeq}`;
      inFlight = (async () => {
        for (let attempt = 1; ; attempt++) {
          try { return await send(body, key); }
          catch (e) {
            console.log(`  attempt ${attempt} (${key}): ${e.message}`);
            if (attempt > retries) throw e;
          }
        }
      })().finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}

// Screen step for the booking panel after SUBMITTING.
function nextStep(res) {
  if (res.status === 201 || res.status === 200) return `HELD ${res.body.id}`;
  if (res.status === 409) return 'TAKEN: refresh grid, pick again';
  return 'ERROR: try again';
}

const api = createClient(fakeApi);
for (const startsAt of ['18:00', '17:00']) {
  console.log(`book ${startsAt}: SELECTING -> SUBMITTING`);
  const first = api.book({ courtId: 'C-1', startsAt, hours: 1 });
  const second = api.book({ courtId: 'C-1', startsAt, hours: 1 });
  console.log('  double click shares one request:', first === second);
  const res = await first;
  console.log(`  status ${res.status} -> ${nextStep(res)}`);
}
console.log('bookings stored on the server:', byKey.size);
