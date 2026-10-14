// Cart screen state as a pure reducer: optimistic edits, safe checkout.
const initial = { step: 'CART', shown: {}, saved: {}, key: null,
  error: null };

function setQty(map, sku, qty) {
  const next = { ...map };
  if (qty > 0) next[sku] = qty; else delete next[sku];
  return next;
}

function reduce(s, e) {
  switch (e.type) {
    case 'QTY_CHANGED':                       // optimistic: show it now
      if (s.step !== 'CART') return s;
      return { ...s, shown: setQty(s.shown, e.sku, e.qty), error: null };
    case 'QTY_SAVED':
      return { ...s, saved: setQty(s.saved, e.sku, e.qty) };
    case 'QTY_FAILED':                        // roll back to server truth
      return { ...s, shown: setQty(s.shown, e.sku, s.saved[e.sku] ?? 0),
        error: `Could not update ${e.sku}.` };
    case 'CHECKOUT_CLICKED':
      if (s.step !== 'CART' || !Object.keys(s.shown).length) return s;
      return { ...s, step: 'PLACING', error: null,
        key: s.key ?? e.key };                // keep the first key
    case 'NETWORK_ERROR':
      return { ...s, step: 'CART', error: 'Connection lost. Try again.' };
    case 'PRICE_CHANGED':
      return { ...s, step: 'CART', error: 'Prices changed. Check the total.' };
    case 'CHECKOUT_FAILED':                   // refused: no order was stored
      return { ...s, step: 'CART', error: `Checkout failed: ${e.code}.` };
    case 'ORDER_PLACED':
      return { ...s, step: 'PAYING', orderId: e.orderId, error: null };
    default:
      return s;
  }
}

const events = [
  { type: 'QTY_CHANGED', sku: 'MUG', qty: 2 },
  { type: 'QTY_SAVED', sku: 'MUG', qty: 2 },
  { type: 'QTY_CHANGED', sku: 'TEE', qty: 3 },
  { type: 'QTY_FAILED', sku: 'TEE' },
  { type: 'QTY_CHANGED', sku: 'TEE', qty: 1 },
  { type: 'QTY_SAVED', sku: 'TEE', qty: 1 },
  { type: 'CHECKOUT_CLICKED', key: 'ck-1' },
  { type: 'CHECKOUT_CLICKED', key: 'ck-2' },  // a double click
  { type: 'NETWORK_ERROR' },
  { type: 'CHECKOUT_CLICKED', key: 'ck-3' },  // the shopper retries
  { type: 'CHECKOUT_FAILED', code: 'OUT_OF_STOCK' },
  { type: 'CHECKOUT_CLICKED', key: 'ck-4' },  // tries once more
  { type: 'ORDER_PLACED', orderId: 'OR-1' },
  { type: 'QTY_CHANGED', sku: 'MUG', qty: 5 },
];
let state = initial;
for (const e of events) {
  state = reduce(state, e);
  console.log(e.type.padEnd(16), state.step.padEnd(7),
    JSON.stringify(state.shown), state.key ?? '-', state.error ?? '');
}
