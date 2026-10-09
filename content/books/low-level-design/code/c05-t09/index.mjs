let reads = 0;
class ListBookingRepository {
  #all = [];
  save(b) { this.#all.push(b); }
  forRoom(roomId) {
    reads += this.#all.length;
    return this.#all.filter((b) => b.roomId === roomId);
  }
}
class IndexedBookingRepository {
  #byRoom = new Map();
  save(b) {
    if (!this.#byRoom.has(b.roomId)) this.#byRoom.set(b.roomId, []);
    this.#byRoom.get(b.roomId).push(b);
  }
  forRoom(roomId) {
    const list = this.#byRoom.get(roomId) ?? [];
    reads += list.length;
    return [...list];
  }
}
function measure(repo) {
  for (let i = 0; i < 1000; i++) {
    repo.save({ roomId: `R${i % 50}`, start: i, end: i + 1 });
  }
  reads = 0;
  const found = repo.forRoom('R7').length;
  return `found ${found}, read ${reads}`;
}
console.log('list   :', measure(new ListBookingRepository()));
console.log('indexed:', measure(new IndexedBookingRepository()));
