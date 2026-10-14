// Screen state for search -> fare -> passengers -> pay, as a pure reducer.
// Handlers call crypto.randomUUID() before dispatch; the demo uses fixed keys.
const initial = { step: 'RESULTS', fare: null, pax: [], holdKey: null,
  pnr: null, payKey: null, error: null };

function reduce(s, e) {
  switch (e.type) {
    case 'SELECT_FARE':
      if (s.step !== 'RESULTS') return s;
      return { ...s, step: 'PASSENGERS', fare: e.fare, error: null,
        holdKey: e.key };                     // one key per hold attempt
    case 'PAX_INVALID':
      return { ...s, error: 'Every passenger needs a name.' };
    case 'SUBMIT_PAX':
      if (s.step !== 'PASSENGERS') return s;     // double click ignored
      return { ...s, step: 'HOLDING', pax: e.pax, error: null };
    case 'HOLD_FAILED':                          // retry reuses holdKey
      return { ...s, step: 'PASSENGERS', error: 'Could not hold. Retry.' };
    case 'HOLD_SOLD_OUT':                        // 409: pick another fare
      return { ...initial, error: `${s.fare} just sold out.` };
    case 'HOLD_OK':
      return { ...s, step: 'PAYING', pnr: e.pnr, payKey: e.payKey };
    case 'PAY_CLICKED':
      if (s.step !== 'PAYING') return s;
      return { ...s, step: 'SUBMITTING', error: null };
    case 'PAY_FAILED':
      return { ...s, step: 'PAYING', error: 'Payment failed. Try again.' };
    case 'TICKETED':
      return { ...s, step: 'DONE', error: null };
    case 'HOLD_EXPIRED':
      if (s.step === 'DONE' || s.step === 'SUBMITTING') return s;
      return { ...initial, error: 'Your hold expired. Search again.' };
    default:
      return s;
  }
}

const asha = [{ name: 'Asha' }];
const events = [
  { type: 'SELECT_FARE', fare: 'Y-SAVER', key: 'hk-1' },
  { type: 'SUBMIT_PAX', pax: asha }, { type: 'HOLD_SOLD_OUT' },
  { type: 'SELECT_FARE', fare: 'Y-FLEX', key: 'hk-2' },
  { type: 'PAX_INVALID' }, { type: 'SUBMIT_PAX', pax: asha },
  { type: 'SUBMIT_PAX', pax: asha }, { type: 'HOLD_FAILED' },
  { type: 'SUBMIT_PAX', pax: asha },
  { type: 'HOLD_OK', pnr: 'PNR-4', payKey: 'pk-3' },
  { type: 'PAY_CLICKED' }, { type: 'PAY_FAILED' }, { type: 'PAY_CLICKED' },
  { type: 'TICKETED' }, { type: 'HOLD_EXPIRED' },
];
let state = initial;
for (const e of events) {
  state = reduce(state, e);
  console.log(e.type.padEnd(18), state.step.padEnd(10),
    state.holdKey ?? '-', state.payKey ?? '-', state.error ?? '');
}
