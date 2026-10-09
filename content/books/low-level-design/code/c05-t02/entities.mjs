class Room {
  constructor(id, name, capacity) {
    Object.assign(this, { id, name, capacity });
  }
  fits(people) { return this.capacity >= people; }
}

class Booking { // owns one rule: its own slot is valid
  constructor(id, roomId, employeeId, start, end) {
    if (!(start < end)) throw new Error('start must be before end');
    Object.assign(this, { id, roomId, employeeId, start, end });
  }
}
class StrictOverlapPolicy { // the ConflictPolicy owns the overlap rule
  conflicts(c, existing) {
    return existing.some((b) => c.start < b.end && b.start < c.end);
  }
}

const atlas = new Room('r1', 'Atlas', 6);
console.log(atlas.fits(4), atlas.fits(8));
const existing = [new Booking('b1', 'r1', 'e1', 9, 10)];
const policy = new StrictOverlapPolicy();
console.log(policy.conflicts(new Booking('b2', 'r1', 'e2', 9.5, 11), existing));
console.log(policy.conflicts(new Booking('b3', 'r1', 'e2', 10, 11), existing));
try { new Booking('b4', 'r1', 'e1', 11, 11); }
catch (err) { console.log(err.message); }
