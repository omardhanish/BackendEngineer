// React: renders reducer state and runs the request; no booking rules here.
export function BookingDialog({ query, state, dispatch, api }) {
  useEffect(() => {
    if (state.step !== 'SUBMITTING') return;   // one request per submit
    api.post('/bookings', { roomId: state.roomId, ...query },
      { 'Idempotency-Key': state.key })        // same key on every retry
      .then((res) => dispatch(res.status === 409 ? { type: 'BOOK_CONFLICT' }
        : res.ok ? { type: 'BOOK_OK', booking: res.body }
        : { type: 'BOOK_FAILED' }))
      .catch(() => dispatch({ type: 'BOOK_FAILED' }));
  }, [state.step]);

  if (state.step === 'SEARCHING') return <Spinner label="Finding rooms" />;
  if (state.step === 'EMPTY') return <p>No free room fits that time.</p>;
  const busy = state.step === 'SUBMITTING';
  return (
    <form onSubmit={(ev) => { ev.preventDefault();
      dispatch({ type: 'SUBMIT', newKey: crypto.randomUUID() }); }}>
      {state.error && <p role="alert">{state.error}</p>}
      <RoomList rooms={state.rooms} selected={state.roomId}
        onPick={(roomId) => dispatch({ type: 'PICK', roomId })} />
      <button disabled={!state.roomId || busy}>
        {busy ? 'Booking…' : 'Book room'}
      </button>
    </form>
  );
}
