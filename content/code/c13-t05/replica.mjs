const primary = new Map();
const replica = new Map();
const pending = [];

const write = (k, v) => { primary.set(k, v); pending.push([k, v]); };
const replicate = () => {
  for (const [k, v] of pending.splice(0)) replica.set(k, v);
};

write('name', 'Ada');
console.log('replica before:', replica.get('name'));
replicate();
console.log('replica after:', replica.get('name'));
