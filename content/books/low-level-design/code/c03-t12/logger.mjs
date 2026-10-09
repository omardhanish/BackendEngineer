const LEVELS = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };
class TextFormatter {
  format(r) { return `${r.time} ${r.level} [${r.name}] ${r.message}`; }
}
class JsonFormatter {
  format(r) { return JSON.stringify(r); }
}
class ConsoleAppender {
  constructor(formatter) { this.formatter = formatter; }
  append(record) { console.log(this.formatter.format(record)); }
}
class MemoryAppender {
  lines = [];
  constructor(formatter) { this.formatter = formatter; }
  append(record) { this.lines.push(this.formatter.format(record)); }
}
class Logger {
  #name; #min; #appenders; #clock;
  constructor(name, { level = 'INFO', appenders = [], clock }) {
    this.#name = name; this.#min = LEVELS[level];
    this.#appenders = appenders; this.#clock = clock;
  }
  log(level, message) {
    if (LEVELS[level] < this.#min) return;
    const record = { time: this.#clock(), level, name: this.#name, message };
    for (const appender of this.#appenders) appender.append(record);
  }
  debug(m) { this.log('DEBUG', m); }
  info(m) { this.log('INFO', m); }
  warn(m) { this.log('WARN', m); }
  error(m) { this.log('ERROR', m); }
}
const memory = new MemoryAppender(new JsonFormatter());
const log = new Logger('orders', {
  level: 'INFO',
  appenders: [new ConsoleAppender(new TextFormatter()), memory],
  clock: () => '10:00:00',
});
log.debug('cart loaded');
log.info('order 42 placed');
log.warn('stock low');
log.error('payment declined');
console.log('memory kept', memory.lines.length, 'lines');
console.log(memory.lines[1]);
