// React component: renders state and dispatches; no booking rules here.
export function PassengerForm({ flight, paxCount, state, dispatch, api }) {
  const [pax, setPax] = useState(() =>
    Array.from({ length: paxCount }, () => ({ name: '', docNo: '' })));
  async function submit(ev) {
    ev.preventDefault();
    if (state.step !== 'PASSENGERS') return;     // second submit ignored
    if (pax.some((p) => !p.name.trim()))
      return dispatch({ type: 'PAX_INVALID' });
    dispatch({ type: 'SUBMIT_PAX', pax });
    let res;                          // holdKey was made on SELECT_FARE
    try {
      res = await api.holdFare(flight.id, state.fare, pax, state.holdKey);
    } catch { return dispatch({ type: 'HOLD_FAILED' }); }
    if (res.status === 409) return dispatch({ type: 'HOLD_SOLD_OUT' });
    if (!res.ok) return dispatch({ type: 'HOLD_FAILED' });
    dispatch({ type: 'HOLD_OK', pnr: res.body.pnr,
      payKey: crypto.randomUUID() });          // key made before dispatch
  }
  return (
    <form onSubmit={submit}>
      <h2>{flight.flightNo} · {state.fare}</h2>
      {state.error && <p role="alert">{state.error}</p>}
      {pax.map((p, i) => (
        <PassengerFields key={i} index={i} value={p}
          onChange={(v) => setPax(pax.map((x, j) => (j === i ? v : x)))} />
      ))}
      <button disabled={state.step !== 'PASSENGERS'}>Hold fare</button>
    </form>
  );
}
