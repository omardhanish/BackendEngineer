class InMemoryRoomRepository {
  #rooms = new Map();
  save(room) { this.#rooms.set(room.id, room); }
  all() { return [...this.#rooms.values()]; }
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
class StrictOverlapPolicy { // implements ConflictPolicy from c05-t03
  conflicts(c, list) {
    return list.some((b) => c.start < b.end && b.start < c.end);
  }
}
class BookingService {
  #rooms; #bookings; #policy; #next = 1;
  constructor(rooms, bookings, policy) {
    this.#rooms = rooms; this.#bookings = bookings; this.#policy = policy;
  }
  searchFree(capacity, start, end) {
    return this.#rooms.all().filter((r) => r.capacity >= capacity &&
      !this.#policy.conflicts({ start, end }, this.#bookings.forRoom(r.id)));
  }
  book(employeeId, roomId, start, end) {
    const slot = { roomId, start, end };
    if (this.#policy.conflicts(slot, this.#bookings.forRoom(roomId))) {
      throw new Error(`room ${roomId} is taken`);
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

const rooms = new InMemoryRoomRepository();
rooms.save({ id: 'r1', capacity: 4 });
rooms.save({ id: 'r2', capacity: 10 });
const service = new BookingService(
  rooms, new InMemoryBookingRepository(), new StrictOverlapPolicy());
const mine = service.book('e1', 'r2', 9, 10);
console.log(service.searchFree(4, 9.5, 10.5).map((r) => r.id));
try { service.book('e2', 'r2', 9.5, 11); } catch (e) { console.log(e.message); }
try { service.cancel(mine.id, 'e2'); } catch (e) { console.log(e.message); }
service.cancel(mine.id, 'e1');
console.log(service.searchFree(4, 9.5, 10.5).map((r) => r.id));
