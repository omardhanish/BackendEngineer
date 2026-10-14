// React component: renders reducer state, sends presses, listens to a feed.
import { useReducer, useEffect } from 'react';
import { reduce, initial } from './hallPanel.mjs';
export function HallPanel({ buildingId, floor, hasUp, hasDown, api }) {
  const [state, dispatch] = useReducer(reduce, initial);
  useEffect(() => {                         // server-sent status events
    const feed = api.watchFloor(buildingId, floor, (ev) => dispatch(ev));
    return () => feed.close();
  }, [api, buildingId, floor]);
  async function press(dir) {
    if (state[dir].light !== 'OFF') return;
    dispatch({ type: 'PRESS', dir });
    const res = await api.hallCall(buildingId, floor, dir).catch(() => null);
    if (!res?.ok) return dispatch({ type: 'SEND_FAILED', dir });
    dispatch({ type: 'SENT', dir, callId: res.body.id,
      car: res.body.elevatorId });
  }
  const button = (dir, label) => (
    <button aria-pressed={state[dir].light !== 'OFF'}
      className={state[dir].light} onClick={() => press(dir)}>
      {label} {state[dir].car && <small>{state[dir].car}</small>}
    </button>
  );
  return (
    <section aria-label={`Floor ${floor} call panel`}>
      {hasUp && button('UP', '▲')}
      {hasDown && button('DOWN', '▼')}
      {state.error && <p role="alert">{state.error}</p>}
    </section>
  );
}
