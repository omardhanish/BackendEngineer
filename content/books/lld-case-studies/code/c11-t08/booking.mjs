// Screen state for search, pick a time, confirm. A pure reducer.
let nextKey = 1;  // demo only: real code uses crypto.randomUUID()
const initial = { step: 'SEARCH', party: 2, slots: [], picked: null,
  key: null, error: null };

function reduce(s, e) {
  switch (e.type) {
    case 'SEARCH':
      return { ...initial, party: e.party, step: 'LOADING' };
    case 'SLOTS_OK':
      return { ...s, step: e.slots.length ? 'CHOOSING' : 'EMPTY',
        slots: e.slots };
    case 'PICK':                 // a new choice is a new request
      if (s.step !== 'CHOOSING') return s;
      return { ...s, picked: e.time, key: null, error: null };
    case 'CONFIRM_CLICKED':
      if (s.step !== 'CHOOSING' || !s.picked) return s;  // no double
      return { ...s, step: 'SUBMITTING', error: null,
        key: s.key ?? e.key };     // keep the first key on retry
    case 'REQUEST_FAILED':       // network or 5xx: same key on retry
      return { ...s, step: 'CHOOSING', error: 'Could not book. Try again.' };
    case 'NO_TABLE':             // 409: that time just went
      return { ...s, step: 'CHOOSING', picked: null, key: null,
        slots: s.slots.filter((t) => t !== s.picked),
        error: 'That time was just taken. Pick another.' };
    case 'BOOKED':
      return { ...s, step: 'DONE', error: null, id: e.id };
    default:
      return s;
  }
}

const events = [
  { type: 'SEARCH', party: 4 },
  { type: 'SLOTS_OK', slots: ['19:00', '19:30', '20:00'] },
  { type: 'PICK', time: '19:00' }, { type: 'CONFIRM_CLICKED' },
  { type: 'CONFIRM_CLICKED' }, { type: 'REQUEST_FAILED' },
  { type: 'CONFIRM_CLICKED' }, { type: 'NO_TABLE' },
  { type: 'PICK', time: '19:30' }, { type: 'CONFIRM_CLICKED' },
  { type: 'BOOKED', id: 'RV-7' },
];
let state = initial;
for (let e of events) {
  if (e.type === 'CONFIRM_CLICKED')   // as the component does it
    e = { ...e, key: state.key ?? `rk-${nextKey++}` };
  state = reduce(state, e);
  console.log(e.type.padEnd(15), state.step.padEnd(10),
    (state.picked ?? '-').padEnd(5), state.key ?? '-',
    JSON.stringify(state.slots), state.error ?? '');
}
