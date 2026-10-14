// Screen state for the seat picker and checkout, as a pure reducer.
let nextKey = 1;  // demo only: real code uses crypto.randomUUID()
const initial = { step: 'PICKING', selected: [], holdId: null,
  heldUntil: null, payKey: null, error: null };

function reduce(s, e) {
  switch (e.type) {
    case 'TOGGLE_SEAT':
      if (s.step !== 'PICKING') return s;
      return { ...s, error: null, selected: s.selected.includes(e.seat)
        ? s.selected.filter((x) => x !== e.seat) : [...s.selected, e.seat] };
    case 'HOLD_CLICKED':
      if (s.step !== 'PICKING' || !s.selected.length) return s;
      return { ...s, step: 'HOLDING', error: null };
    case 'HOLD_OK':
      return { ...s, step: 'PAYING', holdId: e.holdId,
        heldUntil: e.heldUntil };
    case 'HOLD_CONFLICT':
      return { ...s, step: 'PICKING', selected: [],
        error: 'Seats just taken. Pick again.' };
    case 'HOLD_FAILED':
      return { ...s, step: 'PICKING',
        error: 'Could not hold seats. Try again.' };
    case 'PAY_CLICKED':
      if (s.step !== 'PAYING') return s;      // second click is ignored
      return { ...s, step: 'SUBMITTING', error: null,
        payKey: s.payKey ?? `ck-${nextKey++}` };
    case 'PAY_FAILED':                        // retry keeps the same key
      return { ...s, step: 'PAYING', error: 'Payment failed. Try again.' };
    case 'BOOKED':
      return { ...s, step: 'DONE', error: null, bookingId: e.bookingId };
    case 'HOLD_EXPIRED':
      if (s.step === 'DONE') return s;
      return { ...initial, error: 'Your hold expired. Pick seats again.' };
    default:
      return s;
  }
}

const events = [
  { type: 'TOGGLE_SEAT', seat: 'A1' }, { type: 'TOGGLE_SEAT', seat: 'A2' },
  { type: 'HOLD_CLICKED' }, { type: 'HOLD_CONFLICT' },
  { type: 'TOGGLE_SEAT', seat: 'B4' }, { type: 'HOLD_CLICKED' },
  { type: 'HOLD_FAILED' }, { type: 'HOLD_CLICKED' },
  { type: 'HOLD_OK', holdId: 'H-2', heldUntil: '2026-01-15T18:10:00.000Z' },
  { type: 'PAY_CLICKED' }, { type: 'PAY_CLICKED' },
  { type: 'PAY_FAILED' }, { type: 'PAY_CLICKED' },
  { type: 'BOOKED', bookingId: 'BK-1' }, { type: 'HOLD_EXPIRED' },
];
let state = initial;
for (const e of events) {
  state = reduce(state, e);
  console.log(e.type.padEnd(13), state.step.padEnd(10),
    JSON.stringify(state.selected), state.payKey ?? '-', state.error ?? '');
}
