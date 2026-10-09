class Customer {
  #id; #name;
  constructor(id, name) { this.#id = id; this.#name = name; }
  get id() { return this.#id; }
  get name() { return this.#name; }
  rename(name) { this.#name = name; }
  equals(other) { return other.id === this.id; }
}
const ana = new Customer('c-7', 'Ana Silva');
const sameAna = new Customer('c-7', 'Ana Costa');
console.log(ana.equals(sameAna));
ana.rename('Ana Costa');
console.log(ana.name, ana.equals(new Customer('c-8', 'Ana Costa')));
