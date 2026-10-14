// React component: renders reducer state and dispatches; no booking rules.
export function ReservationPanel({ restaurantId, state, dispatch, api }) {
  async function confirm() {
    if (state.step !== 'CHOOSING' || !state.picked) return;
    const key = state.key ?? crypto.randomUUID();
    dispatch({ type: 'CONFIRM_CLICKED', key });
    let res;
    try {
      res = await api.book(restaurantId, { partySize: state.party,
        startsAt: state.picked }, key);          // sends Idempotency-Key
    } catch { return dispatch({ type: 'REQUEST_FAILED' }); }
    if (res.body?.error === 'NO_TABLE') return dispatch({ type: 'NO_TABLE' });
    if (!res.ok) return dispatch({ type: 'REQUEST_FAILED' });
    dispatch({ type: 'BOOKED', id: res.body.id });
  }
  if (state.step === 'LOADING') return <Spinner label="Finding times" />;
  if (state.step === 'EMPTY') return <p>No tables free. Try another day.</p>;
  return (
    <section>
      {state.error && <p role="alert">{state.error}</p>}
      <SlotList slots={state.slots} picked={state.picked}
        onPick={(time) => dispatch({ type: 'PICK', time })} />
      <button disabled={!state.picked || state.step === 'SUBMITTING'}
        onClick={confirm}>
        {state.step === 'SUBMITTING' ? 'Booking…' : 'Confirm table'}
      </button>
    </section>
  );
}
