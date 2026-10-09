// Day one: freeze the public API before writing any logic.
class BookingService {
  searchFree(capacity, start, end) { throw new Error('not implemented'); }
  book(employeeId, roomId, start, end) { throw new Error('not implemented'); }
  cancel(bookingId, employeeId) { throw new Error('not implemented'); }
}

const useCases = Object.getOwnPropertyNames(BookingService.prototype)
  .filter((name) => name !== 'constructor');
console.log('use cases:', useCases.join(', '));

try { new BookingService().book('e1', 'r1', 9, 10); }
catch (err) { console.log('book ->', err.message); }
