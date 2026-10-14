import { useReducer, useEffect } from 'react';
import { reduce, initial } from './pay.mjs';   // exported in the app
// React screen: the reducer from pay.mjs owns the rules; effects call the API.
export function CheckoutPage({ order, api }) {
  const [state, dispatch] = useReducer(reduce, initial);

  useEffect(() => {                      // one request per SUBMITTING
    if (state.step !== 'SUBMITTING') return;
    api.createPayment(state.payKey, order, state.method)
      .then((p) => dispatch({ type: 'RESPONSE', status: p.status,
        paymentId: p.id }))
      .catch(() => dispatch({ type: 'NETWORK_ERROR' }));
  }, [state.step]);

  useEffect(() => {                      // poll while UPI waits
    if (state.step !== 'AWAITING_APPROVAL') return;
    const t = setTimeout(() => api.getPayment(state.paymentId)
      .then((p) => dispatch({ type: 'POLL', status: p.status }))
      .catch(() => dispatch({ type: 'POLL', status: 'PROCESSING' })), 3000);
    return () => clearTimeout(t);
  }, [state.step, state.polls]);

  if (state.step === 'PAID') return <Receipt order={order} />;
  const canPay = ['CHOOSING', 'RETRY'].includes(state.step);
  return (
    <section>
      <OrderSummary order={order} />
      <MethodPicker value={state.method}
        disabled={state.step !== 'CHOOSING'}
        onChange={(m) => dispatch({ type: 'METHOD_SELECTED', method: m })} />
      {state.error && <p role="alert">{state.error}</p>}
      {state.step === 'AWAITING_APPROVAL' &&
        <p>Approve the request in your UPI app.</p>}
      <button disabled={!canPay || !state.method}
        onClick={() => dispatch({ type: 'PAY_CLICKED',
          newKey: crypto.randomUUID() })}>
        {canPay ? `Pay ${order.totalLabel}` : 'Processing…'}
      </button>
    </section>
  );
}
