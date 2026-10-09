const price = () => new Promise((r) => setTimeout(() => r(5), 10)); // slow
class Inventory {
  #stock = new Map([['mug', 1]]);
  reserve(sku) {                             // no await inside: one unit
    const left = this.#stock.get(sku) ?? 0;
    if (left < 1) return null;
    this.#stock.set(sku, left - 1);
    return Object.freeze({ sku, left: left - 1 }); // a value, not shared
  }
}
const inv = new Inventory();
async function checkout(order) {
  const cost = await price();                // slow work outside the unit
  const hold = inv.reserve('mug');
  return hold ? `${order}: paid ${cost}` : `${order}: sold out`;
}
Promise.all([checkout('order 1'), checkout('order 2')])
  .then((r) => console.log(r));
