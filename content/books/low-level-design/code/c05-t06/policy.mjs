class ConflictPolicy {
  conflicts(candidate, existing) { throw new Error('not implemented'); }
}
class StrictOverlapPolicy extends ConflictPolicy {
  conflicts(c, existing) {
    return existing.some((e) => c.start < e.end && e.start < c.end);
  }
}
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
  const service = new BookingService(new BookingRepository(), policy);
  const first = service.book('e1', 'r1', 9, 10);
  const second = service.book('e2', 'r1', 10, 11);
  console.log(policy.constructor.name, '|', first, '|', second);
}
