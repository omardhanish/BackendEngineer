import assert from 'node:assert/strict';
class BookingError extends Error { // the c05-t05 errors
  constructor(code, message) { super(message); this.code = code; }
}
class RoomTakenError extends BookingError {
  constructor(roomId) { super('ROOM_TAKEN', `room ${roomId} is taken`); }
}
class InvalidSlotError extends BookingError {
  constructor() { super('INVALID_SLOT', 'start must be before end'); }
}
class InMemoryBookingRepository {
  #rows = [];
  save(booking) { this.#rows.push(booking); }
  forRoom(roomId) { return this.#rows.filter((b) => b.roomId === roomId); }
}
class BookingService {
  #repo;
  constructor(repo) { this.#repo = repo; }
  book(employeeId, roomId, start, end) {
    if (end <= start) throw new InvalidSlotError();
    const clash = this.#repo.forRoom(roomId)
      .some((b) => start < b.end && b.start < end);
    if (clash) throw new RoomTakenError(roomId);
    const booking = { employeeId, roomId, start, end };
    this.#repo.save(booking);
    return booking;
  }
}
function check(name, fn) {
  try { fn(); console.log(`ok   ${name}`); }
  catch (e) { console.log(`FAIL ${name}: ${e.message}`); }
}
const fresh = () => new BookingService(new InMemoryBookingRepository());

check('books a free room', () => {
  const service = fresh();
  const booking = service.book('e1', 'R1', 9, 10);
  assert.deepStrictEqual(booking,
    { employeeId: 'e1', roomId: 'R1', start: 9, end: 10 });
});
check('rejects an overlapping slot', () => {
  const service = fresh();
  service.book('e1', 'R1', 9, 10);
  assert.throws(() => service.book('e2', 'R1', 9.5, 11),
    { code: 'ROOM_TAKEN' });
});
check('allows back-to-back slots', () => {
  const service = fresh();
  service.book('e1', 'R1', 9, 10);
  assert.doesNotThrow(() => service.book('e2', 'R1', 10, 11));
});
check('rejects an empty slot', () => {
  assert.throws(() => fresh().book('e1', 'R1', 10, 10),
    { code: 'INVALID_SLOT' });
});
