import { EventEmitter } from 'node:events';

const topic = new EventEmitter();
for (const name of ['billing', 'email', 'analytics']) {
  topic.on('order.placed', (id) => console.log(name, 'got order', id));
}
topic.emit('order.placed', 1); // every subscriber gets a copy

const queue = [2, 3, 4];
const take = (worker) => console.log(worker, 'took order', queue.shift());
take('w1'); take('w2'); take('w1'); // each order goes to one worker
