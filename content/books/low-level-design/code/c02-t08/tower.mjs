class Tower { // the mediator: planes talk only to it
  #planes = []; #runwayFree = true;
  join(p) { this.#planes.push(p); p.tower = this; }
  requestLanding(p) {
    if (!this.#runwayFree) return `${p.id}: hold`;
    this.#runwayFree = false;
    this.#planes.filter((o) => o !== p).forEach((o) => o.notify(p.id));
    return `${p.id}: cleared`;
  }
}
class Plane {
  constructor(id) { this.id = id; }
  land() { return this.tower.requestLanding(this); }
  notify(who) { console.log(`  ${this.id} sees ${who} landing`); }
}
const t = new Tower(), a = new Plane('A1'), b = new Plane('B2');
t.join(a); t.join(b);
console.log(a.land()); console.log(b.land());
