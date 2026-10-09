class Engine {
  start() { return 'engine on'; }
}
class Car {
  #engine;
  constructor(engine) { this.#engine = engine; } // Car HAS an Engine
  drive() { return `${this.#engine.start()}, moving`; }
}
const car = new Car(new Engine());
console.log(car.drive());
console.log(car.engine);
