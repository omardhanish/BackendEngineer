const LEVELS = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };
const enabled = (min) => (level) => LEVELS[level] >= LEVELS[min];
const prodFilter = enabled('WARN');
for (const level of Object.keys(LEVELS)) {
  console.log(level.padEnd(5), prodFilter(level) ? 'written' : 'dropped');
}
