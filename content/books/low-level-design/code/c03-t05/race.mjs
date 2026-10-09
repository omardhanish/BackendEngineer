const pay = () => new Promise((done) => setTimeout(done, 10));
class NaiveShow {
  #booked = new Map();   // seat -> user
  async book(user, seat) {
    if (this.#booked.has(seat)) return `${user}: ${seat} is taken`;
    await pay();          // other requests run while we wait here
    this.#booked.set(seat, user);
    return `${user}: confirmed ${seat}`;
  }
  owner(seat) { return this.#booked.get(seat); }
}
const show = new NaiveShow();
const results = await Promise.all([
  show.book('ana', 'C7'), show.book('ben', 'C7')]);
console.log(results.join('\n'));
console.log('seat C7 belongs to', show.owner('C7'));
