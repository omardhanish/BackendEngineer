const stack = [];
const use = (fn) => stack.push(fn);
const run = (req, i = 0) => stack[i]?.(req, () => run(req, i + 1));

use((req, next) => {
  console.log('logger: before'); next(); console.log('logger: after');
});
use((req, next) => {
  console.log('auth: ok'); next(); console.log('auth: after');
});
use((req) => console.log('handler:', req.url));

run({ url: '/books' });
