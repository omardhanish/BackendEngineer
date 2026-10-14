// UI state for the action area of the book detail screen, as a reducer.
const initial = { step: 'IDLE', mode: 'BORROW', key: null,
  loanId: null, message: null };

function reduce(s, e) {
  switch (e.type) {
    case 'LOADED':                      // free copies decide the button
      return { ...s, mode: e.freeCopies > 0 ? 'BORROW' : 'RESERVE' };
    case 'BORROW_CLICKED':
      if (s.step !== 'IDLE' || s.mode !== 'BORROW') return s;
      return { ...s, step: 'BORROWING', message: null,
        key: s.key ?? e.key };          // first key wins until done
    case 'BORROW_OK':
      return { ...s, step: 'BORROWED', loanId: e.loanId,
        message: `Due back ${e.dueOn}` };
    case 'NO_COPY':                     // 409: someone was faster
      return { ...s, step: 'IDLE', mode: 'RESERVE', key: null,
        message: 'Last copy just went. Reserve it instead?' };
    case 'NETWORK_ERROR':               // retry keeps the same key
      return { ...s, step: 'IDLE', message: 'Network error. Try again.' };
    case 'FAILED':                      // 400, limit, 500: start over
      return { ...s, step: 'IDLE', key: null, message: e.error };
    case 'RESERVE_CLICKED':
      if (s.step !== 'IDLE' || s.mode !== 'RESERVE') return s;
      return { ...s, step: 'RESERVING', message: null };
    case 'RESERVE_OK':
    case 'ALREADY_RESERVED':            // 409 here still means success
      return { ...s, step: 'RESERVED',
        message: 'You are in the queue. We will notify you.' };
    default:
      return s;
  }
}

const events = [
  { type: 'LOADED', freeCopies: 1 },
  { type: 'BORROW_CLICKED', key: 'k-1' },
  { type: 'BORROW_CLICKED', key: 'k-2' },
  { type: 'NETWORK_ERROR' }, { type: 'BORROW_CLICKED', key: 'k-3' },
  { type: 'NO_COPY' }, { type: 'BORROW_CLICKED', key: 'k-4' },
  { type: 'RESERVE_CLICKED' }, { type: 'RESERVE_CLICKED' },
  { type: 'ALREADY_RESERVED' },
];
let state = initial;
for (const e of events) {
  state = reduce(state, e);
  console.log(e.type.padEnd(16), state.step.padEnd(10),
    state.mode.padEnd(8), state.key ?? '-', state.message ?? '');
}
