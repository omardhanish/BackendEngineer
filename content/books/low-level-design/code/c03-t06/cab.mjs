class Driver {
  constructor(id, x, y) { Object.assign(this, { id, x, y, busy: false }); }
}
class NearestDriver {
  pick(drivers, rider) {
    const dist = (d) => Math.abs(d.x - rider.x) + Math.abs(d.y - rider.y);
    const free = drivers.filter((d) => !d.busy);
    return free.sort((a, b) => dist(a) - dist(b))[0] ?? null;
  }
}
const NEXT = { REQUESTED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['STARTED', 'CANCELLED'], STARTED: ['COMPLETED'] };
class Ride {
  #state = 'REQUESTED';
  constructor(id, rider) { Object.assign(this, { id, rider, driver: null }); }
  get state() { return this.#state; }
  moveTo(next) {
    if (!(NEXT[this.#state] ?? []).includes(next))
      throw new Error(`${this.id}: ${this.#state} -> ${next} not allowed`);
    this.#state = next;
  }
}
class RideService {
  #drivers; #strategy; #rides = new Map(); #seq = 0;
  constructor(drivers, strategy) {
    this.#drivers = drivers; this.#strategy = strategy;
  }
  request(rider) {
    const ride = new Ride(`R${++this.#seq}`, rider);
    const driver = this.#strategy.pick(this.#drivers, rider);
    if (!driver) throw new Error(`no driver for ${rider.name}`);
    driver.busy = true;            // claim before anyone else can
    ride.driver = driver;
    ride.moveTo('ACCEPTED');
    this.#rides.set(ride.id, ride);
    return ride;
  }
  finish(rideId) {
    const ride = this.#rides.get(rideId);
    ride.moveTo('COMPLETED');
    ride.driver.busy = false;
  }
}
const service = new RideService(
  [new Driver('D1', 0, 0), new Driver('D2', 5, 5)], new NearestDriver());
const r1 = service.request({ name: 'Asha', x: 4, y: 4 });
const r2 = service.request({ name: 'Ben', x: 4, y: 4 });
console.log(r1.id, r1.driver.id, '|', r2.id, r2.driver.id);
try { service.request({ name: 'Cleo', x: 1, y: 1 }); }
catch (e) { console.log(e.message); }
try { service.finish('R1'); } catch (e) { console.log(e.message); }
r1.moveTo('STARTED');
service.finish('R1');
console.log(r1.state, 'D2 busy:', r1.driver.busy);
