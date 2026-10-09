class Car {
  constructor(id, floor, dir) { Object.assign(this, { id, floor, dir }); }
  // cost of serving a hall call at floor f going dir d
  cost(f, d) {
    const gap = Math.abs(this.floor - f);
    if (this.dir === 'idle') return gap;
    const ahead = this.dir === 'up' ? f >= this.floor : f <= this.floor;
    return ahead && this.dir === d ? gap : gap + 100;   // penalise U-turns
  }
}
class Dispatcher {
  constructor(cars) { this.cars = cars; }
  assign(f, d) {
    return this.cars.reduce((a, b) => (b.cost(f, d) < a.cost(f, d) ? b : a));
  }
}
const d = new Dispatcher([
  new Car('A', 1, 'up'), new Car('B', 8, 'down'), new Car('C', 5, 'idle')]);
console.log('call at 6, going up ->', d.assign(6, 'up').id);
console.log('call at 3, going up ->', d.assign(3, 'up').id);
console.log('call at 7, going down ->', d.assign(7, 'down').id);
