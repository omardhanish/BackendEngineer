const SIZE = { bike: 1, car: 2, truck: 3 };
class Spot {
  constructor(id, size) { this.id = id; this.size = size; this.plate = null; }
  fits(v) { return !this.plate && SIZE[v.type] <= SIZE[this.size]; }
}
class Ticket {
  constructor(vehicle, spot, inAt) {
    Object.assign(this, { vehicle, spot, inAt });
  }
}
class HourlyPricing {
  constructor(rates) { this.rates = rates; }
  price(ticket, outAt) {
    const hours = Math.max(1, Math.ceil((outAt - ticket.inAt) / 60));
    return hours * this.rates[ticket.vehicle.type];
  }
}
class ParkingLot {
  #spots; #pricing; #tickets = new Map();
  constructor(spots, pricing) { this.#spots = spots; this.#pricing = pricing; }
  park(vehicle, now) {
    if (this.#tickets.has(vehicle.plate)) throw new Error('already parked');
    const spot = this.#spots.find((s) => s.fits(vehicle));
    if (!spot) throw new Error(`no spot for ${vehicle.type}`);
    spot.plate = vehicle.plate;
    const ticket = new Ticket(vehicle, spot, now);
    this.#tickets.set(vehicle.plate, ticket);
    return ticket;
  }
  leave(plate, now) {
    const ticket = this.#tickets.get(plate);
    if (!ticket) throw new Error(`no ticket for ${plate}`);
    this.#tickets.delete(plate);
    ticket.spot.plate = null;
    return this.#pricing.price(ticket, now);
  }
}
const lot = new ParkingLot(
  [new Spot('A1', 'bike'), new Spot('A2', 'car'), new Spot('A3', 'truck')],
  new HourlyPricing({ bike: 10, car: 20, truck: 40 }));
console.log(lot.park({ plate: 'KA-1', type: 'car' }, 0).spot.id);
console.log(lot.park({ plate: 'KA-2', type: 'car' }, 30).spot.id);
try { lot.park({ plate: 'KA-3', type: 'truck' }, 45); }
catch (e) { console.log(e.message); }
console.log('KA-1 pays', lot.leave('KA-1', 150));
console.log(lot.park({ plate: 'KA-4', type: 'car' }, 160).spot.id);
