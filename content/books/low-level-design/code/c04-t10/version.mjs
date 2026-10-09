class StockStore {                           // the store owns the rule
  #rows = new Map([['mug', { qty: 1, version: 0 }]]);
  async read(sku) { await null; return { ...this.#rows.get(sku) }; }
  async update(sku, version, qty) {          // write only if unchanged
    await null;
    if (this.#rows.get(sku).version !== version) return false;
    this.#rows.set(sku, { qty, version: version + 1 });
    return true;
  }
}
const store = new StockStore();
async function buy(order) {
  for (let tries = 0; tries < 3; tries++) {  // bounded retry
    const { qty, version } = await store.read('mug');
    if (qty < 1) return `${order}: sold out`;
    if (await store.update('mug', version, qty - 1)) return `${order}: sold`;
  }
  return `${order}: busy, try again`;
}
Promise.all([buy('order 1'), buy('order 2')]).then((r) => console.log(r));
