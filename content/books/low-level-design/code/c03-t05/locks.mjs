class SeatLocks {
  #holds = new Map();   // seat -> { user, until }
  constructor(clock, ttl) { this.clock = clock; this.ttl = ttl; }
  hold(seat, user) {            // check and claim with no await in between
    const h = this.#holds.get(seat);
    if (h && h.user !== user && h.until > this.clock.now()) return false;
    this.#holds.set(seat, { user, until: this.clock.now() + this.ttl });
    return true;
  }
  owns(seat, user) {
    const h = this.#holds.get(seat);
    return h?.user === user && h.until > this.clock.now();
  }
  release(seat) { this.#holds.delete(seat); }
}
class Show {
  #booked = new Map();
  constructor(locks) { this.locks = locks; }
  async book(user, seat, pay) {
    if (this.#booked.has(seat) || !this.locks.hold(seat, user)) {
      return `${user}: ${seat} unavailable`;
    }
    await pay();
    if (!this.locks.owns(seat, user)) return `${user}: hold on ${seat} expired`;
    this.#booked.set(seat, user);
    this.locks.release(seat);
    return `${user}: confirmed ${seat}`;
  }
}
const clock = { t: 0, now() { return this.t; } };   // fake clock, in minutes
const show = new Show(new SeatLocks(clock, 5));
const quick = async () => {};
const slow = async () => { clock.t += 6; };          // payment takes 6 minutes
console.log((await Promise.all([
  show.book('ana', 'C7', quick), show.book('ben', 'C7', quick)])).join('\n'));
console.log(await show.book('cy', 'D1', slow));
console.log(await show.book('dev', 'D1', quick));
