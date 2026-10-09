// Protected Variations: callers see one stable shape, calc(amount)
class FlatTax { calc(amount) { return amount * 0.2; } }
class NoTax { calc() { return 0; } }
// Pure Fabrication + Indirection: not a domain thing, it just routes
class TaxService {
  #rules;
  constructor(rules) { this.#rules = rules; }
  taxFor(region, amount) { return this.#rules[region].calc(amount); }
}
const tax = new TaxService({ uk: new FlatTax(), gi: new NoTax() });
console.log(tax.taxFor('uk', 50), tax.taxFor('gi', 50)); // Polymorphism
