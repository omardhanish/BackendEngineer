import { EventEmitter } from 'node:events';

const bus = new EventEmitter();

bus.on('OrderPlaced', (o) => console.log('email: receipt for', o.id));
bus.on('OrderPlaced', (o) => console.log('stock: reserve', o.item));

function placeOrder(order) {
  console.log('orders: saved', order.id);
  bus.emit('OrderPlaced', order);
}

placeOrder({ id: 'o-1', item: 'book' });
