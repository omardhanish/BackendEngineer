class Counter {
  static #instance;
  #hits = 0;
  constructor() {
    if (Counter.#instance) throw new Error('use Counter.get()');
  }
  static get() { return (Counter.#instance ??= new Counter()); }
  hit() { return ++this.#hits; }
}
Counter.get().hit();
console.log(Counter.get().hit());
try { new Counter(); } catch (e) { console.log(e.message); }
