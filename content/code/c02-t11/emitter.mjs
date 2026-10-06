import { EventEmitter } from 'node:events';

const shop = new EventEmitter();
shop.on('order', (id) => console.log('kitchen: cook', id));
shop.on('order', (id) => console.log('billing: charge', id));
shop.once('order', (id) => console.log('first order bonus for', id));

shop.emit('order', 1);
shop.emit('order', 2);
console.log('listeners:', shop.listenerCount('order'));
