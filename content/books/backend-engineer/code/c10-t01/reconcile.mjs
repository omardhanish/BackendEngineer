const desired = 2;
let running = ['api-1', 'api-2'];
let nextId = 3;

function reconcile() {
  while (running.length < desired) running.push(`api-${nextId++}`);
  console.log(`want ${desired}, running: ${running.join(' ')}`);
}

reconcile();
running = running.filter((name) => name !== 'api-2'); // api-2 crashes
reconcile();
