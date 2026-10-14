import { useState } from 'react';
// React: renders the grid and the panel; booking rules stay on the server.
export function SlotGrid({ court, date, slots, api, onBooked, onTaken }) {
  const [picked, setPicked] = useState([]);       // hours, kept contiguous
  const [step, setStep] = useState('SELECTING');
  const [error, setError] = useState(null);
  async function book() {
    setStep('SUBMITTING'); setError(null);
    try {
      const res = await api.book({ courtId: court.id, hours: picked.length,
        startsAt: picked[0].startsAt });
      if (res.status === 409) {
        setError('That hour was just taken.'); setPicked([]); onTaken();
        return setStep('SELECTING');           // parent refetches via onTaken
      }
      if (res.status >= 400) {                      // 400, 500: stay here
        setError('Booking failed. Try again.');
        return setStep('SELECTING');
      }
      onBooked(res.body);                           // go to payment screen
    } catch {
      setError('Could not reach the server. Try again.');
      setStep('SELECTING');
    }
  }
  if (!slots) return <Spinner label="Loading slots" />;
  if (slots.length === 0) return <p>No open hours on {date}.</p>;
  return (
    <section>
      {error && <p role="alert">{error}</p>}
      <HourRow slots={slots} picked={picked}
        onPick={(s) => setPicked(extendContiguous(picked, s, 3))} />
      <PricePreview hours={picked} />
      <button disabled={!picked.length || step === 'SUBMITTING'}
        onClick={book}>
        {step === 'SUBMITTING' ? 'Booking…' : `Book ${picked.length}h`}
      </button>
    </section>
  );
}
