const pool = ['v1', 'v1', 'v1'];
const show = (step) =>
  console.log(step.padEnd(8), pool.map((v) => v ?? '--').join(' '));
const healthy = () => true; // try returning false

show('start');
for (let i = 0; i < pool.length; i++) {
  pool[i] = null; // drain and stop one old instance
  show('stopped');
  pool[i] = 'v2'; // start the new one
  show('started');
  if (!healthy(pool[i])) break; // a failed check halts the rollout
}
