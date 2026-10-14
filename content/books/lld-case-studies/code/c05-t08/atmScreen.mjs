// ATM screen flow as a pure reducer: one state object, one event at a time.
let nextKey = 1;  // demo only: real code uses crypto.randomUUID()
const start = { screen: 'INSERT_CARD', amount: 0, payKey: null,
  txId: null, message: '' };

function reduce(s, e) {
  switch (e.type) {
    case 'CARD_READ':
      return s.screen === 'INSERT_CARD' ? { ...s, screen: 'PIN' } : s;
    case 'PIN_WRONG':                          // the server counts tries
      if (e.left === 0) return { ...start, message: 'Card retained.' };
      return { ...s, message: `Wrong PIN. ${e.left} left.` };
    case 'PIN_OK':
      return { ...s, screen: 'AMOUNT', message: '' };
    case 'AMOUNT_CONFIRMED':
      if (s.screen !== 'AMOUNT') return s;     // a second press is ignored
      return { ...s, screen: 'PROCESSING', amount: e.amount, message: '',
        payKey: s.payKey && s.amount === e.amount ? s.payKey
          : `wd-${nextKey++}` };            // new amount, new key
    case 'NETWORK_ERROR':                      // retry keeps the same key
      return { ...s, screen: 'AMOUNT', message: 'No reply. Try again.' };
    case 'DECLINED':
      return { ...s, screen: 'AMOUNT', payKey: null, message: e.reason };
    case 'APPROVED':
      return { ...s, screen: 'TAKE_CASH', txId: e.txId };
    case 'CASH_TAKEN':
      return { ...start, message: 'Take your card.' };
    case 'TIMEOUT':
      return s.screen === 'PROCESSING' ? s : { ...start,
        message: 'Session ended.' };
    default:
      return s;
  }
}

const events = [
  { type: 'CARD_READ' }, { type: 'PIN_WRONG', left: 2 }, { type: 'PIN_OK' },
  { type: 'AMOUNT_CONFIRMED', amount: 900000 },
  { type: 'DECLINED', reason: 'Insufficient funds.' },
  { type: 'AMOUNT_CONFIRMED', amount: 250000 },
  { type: 'AMOUNT_CONFIRMED', amount: 250000 },
  { type: 'NETWORK_ERROR' }, { type: 'AMOUNT_CONFIRMED', amount: 250000 },
  { type: 'APPROVED', txId: 'TX-2' }, { type: 'CASH_TAKEN' },
];
let state = start;
for (const e of events) {
  state = reduce(state, e);
  console.log(e.type.padEnd(16), state.screen.padEnd(11),
    state.payKey ?? '-', state.message);
}
