// Screen state for "find a room, then book it". Pure: no fetch, no DOM.
const initial = { step: 'IDLE', rooms: [], roomId: null, key: null,
  error: null };

function reduce(s, e) {
  switch (e.type) {
    case 'SEARCH':
      return { ...initial, step: 'SEARCHING' };
    case 'SEARCH_OK':
      return { ...s, step: e.rooms.length ? 'RESULTS' : 'EMPTY',
        rooms: e.rooms };
    case 'PICK':
      if (s.step !== 'RESULTS') return s;
      return { ...s, roomId: e.roomId, error: null,
        key: e.roomId === s.roomId ? s.key : null };  // new room, new key
    case 'SUBMIT':                    // second click while busy: ignored
      if (s.step !== 'RESULTS' || !s.roomId) return s;
      return { ...s, step: 'SUBMITTING', key: s.key ?? e.newKey };
    case 'BOOK_OK':
      return { ...s, step: 'BOOKED', error: null };
    case 'BOOK_CONFLICT': {           // 409: someone else got the room
      const rooms = s.rooms.filter((r) => r !== s.roomId);
      return { ...s, step: rooms.length ? 'RESULTS' : 'EMPTY', rooms,
        roomId: null, key: null, error: 'Room was just taken.' }; }
    case 'BOOK_FAILED':               // network error: same key on retry
      return { ...s, step: 'RESULTS', error: 'Could not reach server.' };
    default:
      return s;
  }
}

let n = 0;                            // production: crypto.randomUUID()
const submit = () => ({ type: 'SUBMIT', newKey: `bk-${++n}` });
let s = initial;
const events = [
  { type: 'SEARCH' }, { type: 'SEARCH_OK', rooms: ['R-1', 'R-2', 'R-3'] },
  { type: 'PICK', roomId: 'R-1' }, submit(), submit(),
  { type: 'BOOK_CONFLICT' }, { type: 'PICK', roomId: 'R-2' },
  submit(), { type: 'BOOK_FAILED' }, submit(), { type: 'BOOK_OK' },
];
for (const e of events) {
  s = reduce(s, e);
  console.log(e.type.padEnd(13), s.step.padEnd(10), 'room', s.roomId ?? '-',
    'key', s.key ?? '-', 'rooms', s.rooms.join(','));
}
