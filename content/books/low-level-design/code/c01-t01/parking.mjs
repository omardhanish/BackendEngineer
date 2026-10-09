class Ticket {
  constructor(plate, slot) { this.plate = plate; this.slot = slot; }
}
class Garage {
  #free = [1, 2];
  park(plate) {
    const slot = this.#free.shift();
    if (slot === undefined) throw new Error('garage full');
    return new Ticket(plate, slot);
  }
}
const g = new Garage();
console.log(g.park('KA-01').slot, g.park('KA-02').slot);
try { g.park('KA-03'); } catch (e) { console.log(e.message); }
