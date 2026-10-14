// React component: renders results; an effect sends the hold request.
export function RoomResults({ stay, state, dispatch, api }) {
  useEffect(() => {
    if (state.step !== 'HOLDING') return;
    api.reserve({ roomType: state.roomType, ...stay }, state.holdKey)
      .then((res) => res.status === 409 && res.body.error === 'SOLD_OUT'
        ? dispatch({ type: 'SOLD_OUT' })
        : res.ok ? dispatch({ type: 'HOLD_OK', id: res.body.id })
        : dispatch({ type: 'HOLD_FAILED' }))
      .catch(() => dispatch({ type: 'HOLD_FAILED' }));  // network error
  }, [state.step]);

  if (state.step === 'SEARCHING') return <Spinner label="Finding rooms" />;
  if (state.step === 'EMPTY') return <p>No rooms for these dates.</p>;
  return (
    <section>
      {state.error && <p role="alert">{state.error}</p>}
      {state.results.map((type) => (
        <RoomCard key={type} type={type} nights={stay.nights}
          busy={state.step === 'HOLDING' && state.roomType === type}
          disabled={state.step !== 'RESULTS'}
          onChoose={() => dispatch({ type: 'ROOM_CHOSEN', roomType: type })}
        />
      ))}
    </section>
  );
}
