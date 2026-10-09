class FlatRate { cost() { return 5; } }
class ByWeight { cost(parcel) { return 2 + parcel.kg * 1.5; } }
class FreeOver {
  constructor(limit) { this.limit = limit; }
  cost(parcel) { return parcel.value >= this.limit ? 0 : 5; }
}
class Shipping { // the context: it never checks which strategy it holds
  #strategy;
  constructor(strategy) { this.#strategy = strategy; }
  setStrategy(strategy) { this.#strategy = strategy; }
  quote(parcel) { return this.#strategy.cost(parcel); }
}
const parcel = { kg: 4, value: 60 };
const shipping = new Shipping(new FlatRate());
console.log('flat', shipping.quote(parcel));
shipping.setStrategy(new ByWeight());
console.log('weight', shipping.quote(parcel));
shipping.setStrategy(new FreeOver(50));
console.log('free over 50', shipping.quote(parcel));
