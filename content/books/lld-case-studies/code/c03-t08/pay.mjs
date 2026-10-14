// Checkout screen state for one order, as a pure reducer.
// The click handler makes newKey with crypto.randomUUID().
const MAX_POLLS = 3;
const initial = { step: 'CHOOSING', method: null, payKey: null,
  paymentId: null, polls: 0, error: null };

function reduce(s, e) {
  switch (e.type) {
    case 'METHOD_SELECTED':
      if (s.step !== 'CHOOSING') return s;
      return { ...s, method: e.method, payKey: null, error: null };
    case 'PAY_CLICKED':
      if (!['CHOOSING', 'RETRY'].includes(s.step) || !s.method) return s;
      return { ...s, step: 'SUBMITTING', error: null, polls: 0,
        payKey: s.payKey ?? e.newKey };
    case 'NETWORK_ERROR':     // outcome unknown: same key, method locked
      return { ...s, step: 'RETRY', error: 'Connection lost. Retry.' };
    case 'RESPONSE':
    case 'POLL':
      if (e.status === 'SUCCEEDED')
        return { ...s, step: 'PAID', error: null };
      if (e.status === 'FAILED')    // final: the next try is a new payment
        return { ...s, step: 'CHOOSING', payKey: null, paymentId: null,
          polls: 0, error: 'Payment declined. Try another method.' };
      if (s.polls + 1 >= MAX_POLLS)  // stop polling; the webhook decides
        return { ...s, step: 'PENDING', error: 'We will notify you.' };
      return { ...s, step: 'AWAITING_APPROVAL',
        paymentId: e.paymentId ?? s.paymentId,
        polls: e.type === 'POLL' ? s.polls + 1 : 0 };
    default:
      return s;
  }
}

const click = (key) => ({ type: 'PAY_CLICKED', newKey: key });
const events = [
  { type: 'METHOD_SELECTED', method: 'CARD' }, click('pk-1'),
  click('pk-2'), { type: 'RESPONSE', status: 'FAILED' },
  { type: 'METHOD_SELECTED', method: 'UPI' }, click('pk-3'),
  { type: 'NETWORK_ERROR' }, click('pk-4'),
  { type: 'RESPONSE', status: 'PROCESSING', paymentId: 'P-2' },
  { type: 'POLL', status: 'PROCESSING' }, { type: 'POLL', status: 'SUCCEEDED' },
  click('pk-5'),
];
let state = initial;
for (const e of events) {
  state = reduce(state, e);
  console.log(e.type.padEnd(15), state.step.padEnd(17),
    state.method ?? '-', state.payKey ?? '-', state.error ?? '');
}
