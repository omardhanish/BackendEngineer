// Screen state for the pay station, as a pure reducer.
let keys = 0;   // demo only: real code uses crypto.randomUUID()
const newKey = () => `pk-${++keys}`;
const initial = { step: 'IDLE', ticketId: null, amountMinor: null,
  payKey: null, error: null };

function reduce(s, e) {
  switch (e.type) {
    case 'SCANNED':
      if (s.step !== 'IDLE') return s;
      return { ...initial, step: 'QUOTING', ticketId: e.ticketId };
    case 'QUOTE_FAILED':
      if (s.step !== 'QUOTING') return s;
      return { ...initial, error: 'Could not read ticket. Scan again.' };
    case 'QUOTE_OK':                     // a new amount needs a new key
      if (s.step !== 'QUOTING') return s;
      return { ...s, step: 'QUOTED', amountMinor: e.amountMinor, error: null,
        payKey: e.amountMinor === s.amountMinor ? s.payKey : null };
    case 'QUOTE_STALE':                  // a new billed hour started
      return s.step === 'QUOTED' ? { ...s, step: 'QUOTING' } : s;
    case 'PAY_CLICKED':
      if (s.step !== 'QUOTED') return s; // double taps end here
      return { ...s, step: 'PAYING', error: null,
        payKey: s.payKey ?? newKey() };
    case 'PAY_FAILED':                   // keep the key for the retry
      if (s.step !== 'PAYING') return s;
      return { ...s, step: 'QUOTED', error: 'Payment failed. Try again.' };
    case 'PAY_OK':
      return s.step === 'PAYING' ? { ...s, step: 'PAID' } : s;
    case 'DRIVER_LEFT':
      return initial;
    default:
      return s;
  }
}

const events = [
  { type: 'SCANNED', ticketId: 1 }, { type: 'QUOTE_OK', amountMinor: 15000 },
  { type: 'PAY_CLICKED' }, { type: 'PAY_CLICKED' }, { type: 'PAY_FAILED' },
  { type: 'PAY_CLICKED' }, { type: 'PAY_FAILED' }, { type: 'QUOTE_STALE' },
  { type: 'QUOTE_OK', amountMinor: 20000 }, { type: 'PAY_CLICKED' },
  { type: 'PAY_OK' }, { type: 'SCANNED', ticketId: 9 },
];
let state = initial;
for (const e of events) {
  state = reduce(state, e);
  console.log(e.type.padEnd(12), state.step.padEnd(8),
    String(state.amountMinor ?? '-').padEnd(6), state.payKey ?? '-',
    state.error ?? '');
}
