const start = Date.now();
setTimeout(() => {
  console.log('timer due at 10 ms, ran late:', Date.now() - start >= 50);
}, 10);

while (Date.now() - start < 50) {
  // blocked: nothing else can run during this loop
}
console.log('loop done');
