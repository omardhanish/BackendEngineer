class Shape {
  #name;
  constructor(name) { this.#name = name; }
  area() { return 0; }
  describe() { return `${this.#name}: ${this.area()}`; }
}
class Rect extends Shape {
  constructor(w, h) { super('rect'); this.w = w; this.h = h; }
  area() { return this.w * this.h; }
}
class Circle extends Shape {
  constructor(r) { super('circle'); this.r = r; }
  area() { return Math.round(Math.PI * this.r ** 2); }
}
for (const s of [new Rect(2, 3), new Circle(1)]) console.log(s.describe());
