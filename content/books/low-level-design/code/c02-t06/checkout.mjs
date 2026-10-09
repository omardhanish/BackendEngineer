class Stock { reserve(sku) { return `reserved ${sku}`; } }
class Payments { charge(cents) { return `charged ${cents}`; } }
class Shipping { label(sku) { return `label for ${sku}`; } }
class CheckoutFacade {
  #stock = new Stock(); #pay = new Payments(); #ship = new Shipping();
  placeOrder(sku, cents) {
    return [
      this.#stock.reserve(sku),
      this.#pay.charge(cents),
      this.#ship.label(sku),
    ];
  }
}
console.log(new CheckoutFacade().placeOrder('book-42', 1999).join('; '));
