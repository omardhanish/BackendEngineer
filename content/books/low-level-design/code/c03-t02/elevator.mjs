class Elevator {
  floor = 0; dir = 'idle'; stopsMade = []; moves = 0;
  #stops = new Set();
  request(f) {
    if (f === this.floor) this.stopsMade.push(f);
    else this.#stops.add(f);
  }
  #nextDir() {
    const all = [...this.#stops];
    if (!all.length) return 'idle';
    const up = all.some((f) => f > this.floor);
    const down = all.some((f) => f < this.floor);
    if (this.dir === 'up' && up) return 'up';
    if (this.dir === 'down' && down) return 'down';
    return up ? 'up' : 'down';
  }
  tick() {
    this.dir = this.#nextDir();
    if (this.dir === 'idle') return;
    this.floor += this.dir === 'up' ? 1 : -1;
    this.moves += 1;
    if (this.#stops.delete(this.floor)) this.stopsMade.push(this.floor);
  }
}
const car = new Elevator();
car.request(5); car.request(2);
for (let t = 0; t < 12; t++) {
  if (t === 3) car.request(1);   // someone presses 1 while the car is at 3
  car.tick();
}
console.log('stops:', car.stopsMade.join(' -> '));
console.log('floors travelled:', car.moves, '| now', car.dir);
