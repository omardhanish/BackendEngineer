class Money {
  #cents;
  constructor(cents) {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new RangeError(`invalid cents: ${cents}`);
    }
    this.#cents = cents;
  }
  get cents() { return this.#cents; }
  add(other) { return new Money(this.#cents + other.cents); }
}
console.log(new Money(250).add(new Money(100)).cents);
try { new Money(-5); } catch (e) { console.log(e.name, e.message); }
