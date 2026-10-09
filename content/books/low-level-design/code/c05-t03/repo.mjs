/** @interface BookingRepository */
class BookingRepository {
  save(booking) { throw new Error('save not implemented'); }
  forRoom(roomId) { throw new Error('forRoom not implemented'); }
}
class InMemoryBookingRepository extends BookingRepository {
  #rows = [];
  save(booking) { this.#rows.push(booking); }
  // forRoom is missing: the base class answers instead
}
const repo = new InMemoryBookingRepository();
repo.save({ id: 'b1', roomId: 'r1' });
try { repo.forRoom('r1'); } catch (err) { console.log(err.message); }
