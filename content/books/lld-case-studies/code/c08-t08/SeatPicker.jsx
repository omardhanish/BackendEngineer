// React component: owns no booking rules, only renders state and dispatches.
export function SeatPicker({ show, seats, state, dispatch, api }) {
  async function holdSelected() {
    dispatch({ type: 'HOLD_CLICKED' });
    let res;
    try { res = await api.hold(show.id, state.selected); }
    catch { return dispatch({ type: 'HOLD_FAILED' }); } // network error
    if (res.status === 409) return dispatch({ type: 'HOLD_CONFLICT' });
    if (!res.ok) return dispatch({ type: 'HOLD_FAILED' });
    const { holdId, heldUntil } = res.body;
    dispatch({ type: 'HOLD_OK', holdId, heldUntil });
  }
  if (!seats) return <Spinner label="Loading seats" />;
  return (
    <section>
      <h2>{show.movieTitle} · {show.startsAtLabel}</h2>
      {state.error && <p role="alert">{state.error}</p>}
      <SeatGrid seats={seats} selected={state.selected}
        onToggle={(seat) => dispatch({ type: 'TOGGLE_SEAT', seat })} />
      <button disabled={state.selected.length === 0 ||
        state.step !== 'PICKING'} onClick={holdSelected}>
        Hold {state.selected.length} seats
      </button>
    </section>
  );
}
