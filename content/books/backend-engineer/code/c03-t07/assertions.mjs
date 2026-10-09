import assert from 'node:assert/strict';

const task = { id: 7, title: 'Buy tea', done: false };

assert.equal(task.done, false);
assert.deepEqual(task, { id: 7, title: 'Buy tea', done: false });
console.log('both pass');

try {
  assert.equal(task.id, '7');
} catch (err) {
  console.log(err.code, typeof err.actual, typeof err.expected);
}
