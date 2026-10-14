// React component: renders cart state and dispatches; no business rules.
export function CartPage({ cart, state, dispatch, api }) {
  const inFlight = useRef(false);   // blocks clicks before the re-render
  async function changeQty(sku, qty) {
    dispatch({ type: 'QTY_CHANGED', sku, qty });      // show it at once
    const res = await api.setQty(sku, qty).catch(() => null);
    dispatch(res?.ok ? { type: 'QTY_SAVED', sku, qty }
      : { type: 'QTY_FAILED', sku });
  }
  async function placeOrder() {
    if (inFlight.current) return;
    inFlight.current = true;
    const key = state.key ?? crypto.randomUUID();     // reused on retry
    dispatch({ type: 'CHECKOUT_CLICKED', key });
    const res = await api.checkout(key, cart.totalMinor).catch(() => null);
    inFlight.current = false;
    if (!res) return dispatch({ type: 'NETWORK_ERROR' });
    if (res.body.error === 'PRICE_CHANGED')
      return dispatch({ type: 'PRICE_CHANGED' });
    if (res.ok)                                       // 201 or 200 replay
      return dispatch({ type: 'ORDER_PLACED', orderId: res.body.id });
    dispatch({ type: 'CHECKOUT_FAILED', code: res.body.error });
  }
  if (!cart) return <Spinner label="Loading cart" />;
  if (!cart.items.length) return <EmptyCart />;
  return (
    <section>
      {state.error && <p role="alert">{state.error}</p>}
      {cart.items.map((line) => (
        <CartLine key={line.sku} line={line}
          qty={state.shown[line.sku] ?? 0} onQty={changeQty} />
      ))}
      <Total minor={cart.totalMinor} />
      <button disabled={state.step !== 'CART'} onClick={placeOrder}>
        Place order
      </button>
    </section>
  );
}
