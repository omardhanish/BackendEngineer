// Screen state for one floor's hall panel, as a pure reducer.
const off = { light: 'OFF', callId: null, car: null };
const initial = { UP: off, DOWN: off, error: null };

function reduce(s, e) {
  const b = s[e.dir];
  switch (e.type) {
    case 'PRESS':                           // repeat presses do nothing
      if (b.light !== 'OFF') return s;
      return { ...s, [e.dir]: { ...off, light: 'SENDING' }, error: null };
    case 'SENT':                            // 201 new call or 200 replay
      return { ...s, [e.dir]: { light: 'LIT', callId: e.callId,
        car: e.car } };
    case 'SEND_FAILED':
      return { ...s, [e.dir]: off, error: 'Not sent. Press again.' };
    case 'ASSIGNED':                        // from the status feed
    case 'ARRIVED': {
      const dir = ['UP', 'DOWN'].find((d) => s[d].callId === e.callId);
      if (!dir) return s;                   // stale or unknown call
      const next = e.type === 'ARRIVED' ? off : { ...s[dir], car: e.car };
      return { ...s, [dir]: next };
    }
    default:
      return s;
  }
}

const show = (b) => b.light + (b.car ? `(${b.car})` : '');
const events = [
  { type: 'PRESS', dir: 'UP' }, { type: 'PRESS', dir: 'UP' },
  { type: 'SENT', dir: 'UP', callId: 'HC-1', car: 'E2' },
  { type: 'PRESS', dir: 'DOWN' }, { type: 'SEND_FAILED', dir: 'DOWN' },
  { type: 'PRESS', dir: 'DOWN' },
  { type: 'SENT', dir: 'DOWN', callId: 'HC-2', car: null },
  { type: 'ASSIGNED', callId: 'HC-1', car: 'E1' },
  { type: 'ASSIGNED', callId: 'HC-2', car: 'E1' },
  { type: 'ARRIVED', callId: 'HC-1' }, { type: 'ARRIVED', callId: 'HC-9' },
];
let state = initial;
for (const e of events) {
  state = reduce(state, e);
  console.log(e.type.padEnd(11), (e.dir ?? e.callId).padEnd(5),
    'UP:' + show(state.UP).padEnd(9), 'DOWN:' + show(state.DOWN).padEnd(9),
    state.error ?? '');
}
