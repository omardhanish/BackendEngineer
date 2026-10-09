class AuditLogger {
  #sink;
  constructor(sink) { this.#sink = sink; }
  record(event, fields) { this.#sink(JSON.stringify({ event, ...fields })); }
}
class Metrics {
  #counts = new Map();
  inc(name) { this.#counts.set(name, (this.#counts.get(name) ?? 0) + 1); }
  snapshot() { return Object.fromEntries(this.#counts); }
}
class BookingService { // trimmed: one booking per room, no time slots
  #taken = new Set(); #audit; #metrics;
  constructor(audit, metrics) { this.#audit = audit; this.#metrics = metrics; }
  book(employeeId, roomId) {
    if (this.#taken.has(roomId)) {
      this.#metrics.inc('booking.conflict');
      this.#audit.record('booking.rejected',
        { employeeId, roomId, reason: 'ROOM_TAKEN' });
      throw Object.assign(new Error('room is taken'), { code: 'ROOM_TAKEN' });
    }
    this.#taken.add(roomId);
    this.#metrics.inc('booking.created');
    this.#audit.record('booking.created', { employeeId, roomId });
  }
}

const metrics = new Metrics();
const service = new BookingService(new AuditLogger(console.log), metrics);
service.book('e1', 'r2');
try { service.book('e2', 'r2'); }
catch (err) { console.log('caller got', err.code); }
service.book('e2', 'r1');
console.log(metrics.snapshot());
