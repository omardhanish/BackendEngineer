class Item {
  constructor(name, price) { this.name = name; this.price = price; }
  total() { return this.price; }
}
class Bundle {
  #parts = [];
  constructor(name) { this.name = name; }
  add(part) { this.#parts.push(part); return this; }
  total() { return this.#parts.reduce((sum, p) => sum + p.total(), 0); }
}
const drinks = new Bundle('drinks').add(new Item('cola', 2));
const combo = new Bundle('combo').add(new Item('burger', 7)).add(drinks);
for (const node of [new Item('fries', 3), drinks, combo])
  console.log(node.name, node.total());
