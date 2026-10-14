import { useState, useRef } from 'react';
// React component: renders one request's states; rules live in the client.
export function BookSlotButton({ slot, api, onBooked }) {
  const [state, setState] = useState({ phase: 'idle', error: null });
  const key = useRef(null);                // one key per booking intent
  if (!key.current) key.current = crypto.randomUUID();  // created once
  const busy = state.phase === 'submitting';

  async function book() {
    if (busy) return;                       // second click does nothing
    setState({ phase: 'submitting', error: null });
    const res = await api('POST', '/appointments', { slotId: slot.id },
      { key: key.current });                // a manual retry reuses it
    if (res.ok) return onBooked(res.data);  // parent moves to confirmation
    setState({ phase: 'idle', error: res.code === 'SLOT_TAKEN'
      ? 'Someone just took this slot. Pick another.'
      : 'Could not book. Check your connection and try again.' });
  }
  return (
    <div>
      {state.error && <p role="alert">{state.error}</p>}
      <button disabled={busy} onClick={book}>
        {busy ? 'Booking…' : `Book ${slot.label}`}
      </button>
    </div>
  );
}
