import { useEffect } from 'react';

// React component: renders state and dispatches; owns no fee rules.
export function PayStation({ state, dispatch, api }) {
  useEffect(() => {                         // fetch a quote once
    if (state.step !== 'QUOTING') return;
    api.fee(state.ticketId)
      .then((q) => dispatch({ type: 'QUOTE_OK', amountMinor: q.amountMinor }))
      .catch(() => dispatch({ type: 'QUOTE_FAILED' }));
  }, [state.step, state.ticketId]);

  useEffect(() => {                         // one request per PAYING step
    if (state.step !== 'PAYING') return;
    api.pay(state.ticketId, state.payKey)   // sends Idempotency-Key
      .then((res) => dispatch({ type: res.ok ? 'PAY_OK' : 'PAY_FAILED' }))
      .catch(() => dispatch({ type: 'PAY_FAILED' }));
  }, [state.step, state.payKey]);

  if (state.step === 'IDLE') return <ScanPrompt error={state.error}
    onScan={(ticketId) => dispatch({ type: 'SCANNED', ticketId })} />;
  if (state.step === 'QUOTING') return <Spinner label="Reading ticket" />;
  if (state.step === 'PAID') return <p>Paid. Please drive to the exit.</p>;
  return (
    <section>
      <FeeQuote amountMinor={state.amountMinor} />
      {state.error && <p role="alert">{state.error}</p>}
      <button disabled={state.step === 'PAYING'}
        onClick={() => dispatch({ type: 'PAY_CLICKED' })}>
        {state.step === 'PAYING' ? 'Paying' : 'Pay now'}
      </button>
    </section>
  );
}
