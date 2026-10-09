const tick = () => new Promise((r) => setTimeout(r, 0)); // fake DB delay
class BookingRepository {
  #rows = [];
  async findByRoom(roomId) {
    await tick(); return this.#rows.filter((b) => b.roomId === roomId);
  }
  async save(booking) { await tick(); this.#rows.push(booking); }
}
const overlaps = (a, b) => a.from < b.to && b.from < a.to; // [from, to)
class KeyedLock {
  #tails = new Map();
  run(key, task) {
    const result = (this.#tails.get(key) ?? Promise.resolve()).then(task);
    this.#tails.set(key, result.catch(() => {}));
    return result;
  }
}
class BookingService {
  #repo; #lock;
  constructor(repo, lock) { this.#repo = repo; this.#lock = lock; }
  book(guest, roomId, from, to) {
    const task = async () => {
      const taken = await this.#repo.findByRoom(roomId);
      if (taken.some((b) => overlaps(b, { from, to })))
        throw new Error(`${guest} refused`);
      await this.#repo.save({ guest, roomId, from, to });
      return `${guest} booked`;
    };
    return this.#lock ? this.#lock.run(roomId, task) : task();
  }
}
async function race(lock) {
  const svc = new BookingService(new BookingRepository(), lock);
  const all = await Promise.allSettled([svc.book('Ann', 101, 3, 5),
    svc.book('Bo', 101, 4, 6), svc.book('Cy', 101, 5, 7)]);
  return all.map((r) => r.value ?? r.reason.message).join(', ');
}
console.log('no lock  :', await race(null));
console.log('with lock:', await race(new KeyedLock()));
