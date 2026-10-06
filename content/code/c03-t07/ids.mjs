const tasks = [{ id: 1 }, { id: 2 }];
let nextId = 3;

tasks.shift(); // DELETE task 1

const taken = (id) => tasks.some((task) => task.id === id);
const byLength = tasks.length + 1;

console.log('length + 1:', byLength, 'taken:', taken(byLength));
console.log('counter:   ', nextId, 'taken:', taken(nextId));
