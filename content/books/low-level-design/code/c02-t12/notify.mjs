import { EventEmitter } from 'node:events';
import { makeChannel } from './channels.mjs';

const templates = { // one text builder per event type
  'order.shipped': (e) => `order ${e.orderId} is on its way`,
};
class NotificationService {
  #channels = new Map(); // each channel is built once, on first use
  #channel(name) {
    if (!this.#channels.has(name)) {
      this.#channels.set(name, makeChannel[name]());
    }
    return this.#channels.get(name);
  }
  notify(type, event) {
    const text = templates[type](event);
    for (const name of event.user.prefers) {
      console.log(this.#channel(name).send(event.user, text));
    }
  }
}
const bus = new EventEmitter(); // Observer: order code only emits events
const service = new NotificationService();
bus.on('order.shipped', (e) => service.notify('order.shipped', e));

const ada = { id: 'u1', email: 'ada@example.com', prefers: ['email', 'push'] };
const lin = { id: 'u2', phone: '555-0101', prefers: ['sms'] };
bus.emit('order.shipped', { orderId: 41, user: ada });
bus.emit('order.shipped', { orderId: 42, user: ada });
bus.emit('order.shipped', { orderId: 43, user: lin });
