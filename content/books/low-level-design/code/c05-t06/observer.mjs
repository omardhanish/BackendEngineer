class AuditLogger { // the c05-t05 class, unchanged
  #sink;
  constructor(sink) { this.#sink = sink; }
  record(event, fields) { this.#sink(JSON.stringify({ event, ...fields })); }
}
class NotificationService {
  onBooked(b) { console.log(`notify attendees: ${b.roomId} at ${b.start}`); }
}
class BookingService {
  #listeners = []; #next = 1;
  subscribe(listener) { this.#listeners.push(listener); }
  book(employeeId, roomId, start, end) {
    const booking = { id: `b${this.#next++}`, employeeId, roomId, start, end };
    for (const listener of this.#listeners) listener.onBooked(booking);
    return booking;
  }
}
const audit = new AuditLogger(console.log);
const service = new BookingService();
service.subscribe(new NotificationService());
service.subscribe({ onBooked: (b) => audit.record('booking.created',
  { employeeId: b.employeeId, roomId: b.roomId }) });
service.book('e1', 'r2', 9, 10);
