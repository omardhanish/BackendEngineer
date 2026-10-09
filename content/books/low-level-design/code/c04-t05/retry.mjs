class TransientError extends Error {}
async function withRetry(fn, attempts = 3) {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (!(e instanceof TransientError) || i === attempts) throw e;
      console.log(`attempt ${i}: ${e.message}, trying again`);
    }
  }
}
let calls = 0;
const flaky = async () => {
  calls += 1;
  if (calls < 3) throw new TransientError('timeout');
  return 'saved';
};
console.log(await withRetry(flaky));
await withRetry(async () => { throw new Error('bad input'); })
  .catch((e) => console.log('no retry:', e.message));
