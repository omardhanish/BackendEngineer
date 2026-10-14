// Screen state for search, room choice and checkout, as a pure reducer.
let nextKey = 1;  // demo only: real code uses crypto.randomUUID()
const initial = { step: 'SEARCH', searchId: 0, results: [], roomType: null,
  reservationId: null, holdKey: null, payKey: null, error: null };

function reduce(s, e) {
  switch (e.type) {
    case 'DATES_CHANGED':                     // a new search replaces old
      return { ...initial, step: 'SEARCHING', searchId: s.searchId + 1 };
    case 'RESULTS':
      if (e.searchId !== s.searchId) return s;  // stale answer: ignore
      return { ...s, step: e.rooms.length ? 'RESULTS' : 'EMPTY',
        results: e.rooms, error: null };
    case 'ROOM_CHOSEN': {
      if (s.step !== 'RESULTS') return s;     // a second click is ignored
      const same = s.roomType === e.roomType && s.holdKey;
      return { ...s, step: 'HOLDING', roomType: e.roomType, error: null,
        holdKey: same ? s.holdKey : `rk-${nextKey++}` };
    }
    case 'HOLD_FAILED':                       // retry reuses the key
      return { ...s, step: 'RESULTS', error: 'Could not reserve. Retry.' };
    case 'SOLD_OUT':                          // 409: someone took the last
      return { ...s, step: 'RESULTS', holdKey: null,
        results: s.results.filter((r) => r !== s.roomType),
        error: 'That room type just sold out. Pick another.' };
    case 'HOLD_OK':
      return { ...s, step: 'PAYING', reservationId: e.id };
    case 'PAY_CLICKED':
      if (s.step !== 'PAYING') return s;
      return { ...s, step: 'CONFIRMING', error: null,
        payKey: s.payKey ?? `pk-${nextKey++}` };
    case 'PAY_UNKNOWN':                       // timeout: retry, same key
      return { ...s, step: 'PAYING', error: 'Still checking. Try again.' };
    case 'CONFIRMED':
      return { ...s, step: 'DONE', error: null };
    case 'HOLD_EXPIRED':
      if (s.step === 'DONE' || s.step === 'CONFIRMING') return s;
      return { ...initial, error: 'Your hold expired. Search again.' };
    default:
      return s;
  }
}

const events = [
  { type: 'DATES_CHANGED' }, { type: 'DATES_CHANGED' },
  { type: 'RESULTS', searchId: 1, rooms: ['DLX'] },
  { type: 'RESULTS', searchId: 2, rooms: ['DLX', 'TWN'] },
  { type: 'ROOM_CHOSEN', roomType: 'DLX' }, { type: 'SOLD_OUT' },
  { type: 'ROOM_CHOSEN', roomType: 'TWN' },
  { type: 'ROOM_CHOSEN', roomType: 'TWN' }, { type: 'HOLD_FAILED' },
  { type: 'ROOM_CHOSEN', roomType: 'TWN' }, { type: 'HOLD_OK', id: 'RS-2' },
  { type: 'PAY_CLICKED' }, { type: 'PAY_UNKNOWN' }, { type: 'PAY_CLICKED' },
  { type: 'HOLD_EXPIRED' }, { type: 'CONFIRMED' },
];
let state = initial;
for (const e of events) {
  state = reduce(state, e);
  console.log(e.type.padEnd(13), state.step.padEnd(10),
    JSON.stringify(state.results), state.holdKey ?? '-',
    state.payKey ?? '-', state.error ?? '');
}
