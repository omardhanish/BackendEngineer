import assert from 'node:assert/strict';
class Room {
  constructor(id, capacity) { Object.assign(this, { id, capacity }); }
}
class InMemoryBookingRepository {
  #rows = new Map();
  save(b) { this.#rows.set(b.id, b); }
  find(id) { return this.#rows.get(id); }
  remove(id) { this.#rows.delete(id); }
  forRoom(roomId) {
    return [...this.#rows.values()].filter((b) => b.roomId === roomId);
  }
}
class StrictOverlapPolicy { // the ConflictPolicy from c05-t04
  conflicts(c, list) {
    return list.some((b) => c.start < b.end && b.start < c.end);
  }
}
class BookingService { // trimmed from c05-t04: the c05-t01 public API
  #rooms; #bookings; #policy; #next = 1;
  constructor(rooms, bookings, policy) {
    this.#rooms = rooms; this.#bookings = bookings; this.#policy = policy;
  }
  searchFree(capacity, start, end) {
    return this.#rooms.filter((r) => r.capacity >= capacity &&
      !this.#policy.conflicts({ start, end }, this.#bookings.forRoom(r.id)))
      .map((r) => r.id);
  }
  book(employeeId, roomId, start, end) {
    const slot = { roomId, start, end };
    if (this.#policy.conflicts(slot, this.#bookings.forRoom(roomId))) {
      throw Object.assign(new Error('room is taken'), { code: 'ROOM_TAKEN' });
    }
    const b = { id: `b${this.#next++}`, employeeId, ...slot };
    this.#bookings.save(b);
    return b;
  }
  cancel(bookingId, employeeId) {
    const b = this.#bookings.find(bookingId);
    if (!b || b.employeeId !== employeeId) throw new Error('not your booking');
    this.#bookings.remove(bookingId);
  }
}
const svc = new BookingService([new Room('r1', 4), new Room('r2', 10)],
  new InMemoryBookingRepository(), new StrictOverlapPolicy());
const checks = {
  'R1 search by capacity': () => {
    assert.deepEqual(svc.searchFree(6, 10, 11), ['r2']);
  },
  'R4 no double booking': () => {
    svc.book('e1', 'r2', 10, 11);
    assert.throws(() => svc.book('e2', 'r2', 10.5, 12), { code: 'ROOM_TAKEN' });
  },
  'R3 cancel frees the room': () => {
    const b = svc.book('e1', 'r2', 14, 15);
    svc.cancel(b.id, 'e1');
    assert.deepEqual(svc.searchFree(6, 14, 15), ['r2']);
  },
};
for (const [name, check] of Object.entries(checks)) {
  check();
  console.log('pass', name);
}
