const queue = ['j1', 'j2'];
const done = new Set(); // in production: a table, written with the work
let ackLost = true;

while (queue.length) {
  const id = queue.shift();
  if (done.has(id)) { console.log('skip', id); continue; }
  console.log('email for', id);
  done.add(id);
  // pretend j2's ack never arrives: the queue delivers it again
  if (id === 'j2' && ackLost) { ackLost = false; queue.push(id); }
}
