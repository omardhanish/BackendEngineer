import { EventEmitter } from 'node:events';

class ChatRoom extends EventEmitter {
  join(name) {
    const inbox = ({ from, text }) => {
      if (from !== name) console.log(`${name} got "${text}" from ${from}`);
    };
    this.on('message', inbox);
    this.emit('join', name);
    return () => {
      this.off('message', inbox);
      this.emit('leave', name);
    };
  }
  say(from, text) {
    this.emit('message', { from, text });
  }
}

const room = new ChatRoom();
room.on('join', (name) => console.log(`* ${name} joined`));
room.on('leave', (name) => console.log(`* ${name} left`));

room.join('Ana');
const leaveBen = room.join('Ben');
room.say('Ana', 'hi Ben');
room.say('Ben', 'hi Ana');
leaveBen();
console.log('inboxes:', room.listenerCount('message'));
