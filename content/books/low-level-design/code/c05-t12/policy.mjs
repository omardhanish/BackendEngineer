class ConflictPolicy { // conflicts(candidate, existing), as in c05-t03
  conflicts(candidate, existing) { throw new Error('not implemented'); }
}
class StrictOverlapPolicy extends ConflictPolicy {
  conflicts(c, existing) {
    return existing.some((e) => c.start < e.end && e.start < c.end);
  }
}
// Feedback: "leave a gap so the room can be cleaned"
class BufferPolicy extends ConflictPolicy {
  #gap;
  constructor(gap) { super(); this.#gap = gap; }
  conflicts(c, existing) {
    const g = this.#gap;
    return existing.some((e) => c.start < e.end + g && e.start < c.end + g);
  }
}
class BookingRepository {
  #rows = [];
  save(b) { this.#rows.push(b); }
  forRoom(roomId) { return this.#rows.filter((b) => b.roomId === roomId); }
}
class BookingService {
  #bookings; #policy;
  constructor(bookings, policy) {
    this.#bookings = bookings; this.#policy = policy;
  }
  book(employeeId, roomId, start, end) {
    const slot = { employeeId, roomId, start, end };
    if (this.#policy.conflicts(slot, this.#bookings.forRoom(roomId))) {
      return `rejected ${start}-${end}`;
    }
    this.#bookings.save(slot);
    return `booked ${start}-${end}`;
  }
}
for (const policy of [new StrictOverlapPolicy(), new BufferPolicy(0.25)]) {
  const svc = new BookingService(new BookingRepository(), policy);
  svc.book('e1', 'r1', 10, 11);
  console.log(policy.constructor.name, svc.book('e2', 'r1', 11, 12));
}
