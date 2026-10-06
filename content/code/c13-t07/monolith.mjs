const payments = {
  charge: (amount) => amount > 0,
};

const orders = {
  place(amount) {
    // A plain function call: same process, no network.
    return payments.charge(amount) ? 'order placed' : 'payment declined';
  },
};

console.log(orders.place(20));
console.log(orders.place(0));
