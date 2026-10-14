// React component: the reducer decides, an effect performs the API call.
import { useEffect } from 'react';
export function AmountScreen({ state, dispatch, api, sessionId }) {
  useEffect(() => {
    if (state.screen !== 'PROCESSING') return;
    api.withdraw(sessionId, state.amount, state.payKey)  // Idempotency-Key
      .then((res) => {
        if (res.status === 409) dispatch({ type: 'DECLINED',
          reason: 'Insufficient funds.' });
        else if (res.ok) dispatch({ type: 'APPROVED', txId: res.body.txId });
        else if (res.status >= 500) dispatch({ type: 'NETWORK_ERROR' });
        else dispatch({ type: 'DECLINED', reason: 'Request refused.' });
      })
      .catch(() => dispatch({ type: 'NETWORK_ERROR' }));
  }, [state.screen, state.payKey]);

  const busy = state.screen !== 'AMOUNT';
  return (
    <section>
      <h2>Choose an amount</h2>
      {state.message && <p role="alert">{state.message}</p>}
      {busy && <p aria-live="polite">Processing. Please wait.</p>}
      {[50000, 100000, 250000].map((a) => (
        <button key={a} disabled={busy}
          onClick={() => dispatch({ type: 'AMOUNT_CONFIRMED', amount: a })}>
          Rs {a / 100}
        </button>
      ))}
    </section>
  );
}
