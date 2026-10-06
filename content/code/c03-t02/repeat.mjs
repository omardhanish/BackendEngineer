let nextId = 100;
const calls = {
  PUT: (orders) => orders.set(7, 'tea'),          // replace order 7
  POST: (orders) => orders.set(nextId++, 'tea'),  // create a new order
  DELETE: (orders) => orders.delete(7),           // remove order 7
};

for (const [method, call] of Object.entries(calls)) {
  const orders = new Map([[7, 'tea']]);
  call(orders);
  const once = orders.size;
  call(orders);
  console.log(method, 'once:', once, 'twice:', orders.size);
}
