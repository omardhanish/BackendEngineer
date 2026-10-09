const recent = new Map([['a', 1], ['b', 2], ['c', 3]]);
// A read moves the key to the newest end: delete, then set again.
const v = recent.get('a');
recent.delete('a');
recent.set('a', v);
// The first key in iteration order is the least recently used.
const oldest = recent.keys().next().value;
recent.delete(oldest);
recent.set('d', 4);
console.log([...recent.keys()].join(' '));
