class Icon { // intrinsic state: shared, never changes
  constructor(kind) { this.kind = kind; this.svg = `<svg ${kind}>`;
    Object.freeze(this); }
  draw(x, y) { return `${this.kind}@${x},${y}`; }
}
class IconFactory {
  #pool = new Map();
  get(kind) {
    if (!this.#pool.has(kind)) this.#pool.set(kind, new Icon(kind));
    return this.#pool.get(kind);
  }
  get size() { return this.#pool.size; }
}
const icons = new IconFactory();
const pins = [['cafe', 1, 2], ['cafe', 5, 1], ['bank', 3, 3], ['cafe', 0, 9]];
console.log(pins.map(([k, x, y]) => icons.get(k).draw(x, y)).join(' '));
console.log('pins', pins.length, 'icons', icons.size);
