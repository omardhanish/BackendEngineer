class Container {
  #factories = new Map();
  #instances = new Map();
  register(name, factory) { this.#factories.set(name, factory); }
  resolve(name) {
    if (this.#instances.has(name)) return this.#instances.get(name);
    const factory = this.#factories.get(name);
    if (!factory) throw new Error(`No provider for ${name}`);
    const instance = factory(this);
    this.#instances.set(name, instance);
    return instance;
  }
}

const app = new Container();
app.register('config', () => ({ greeting: 'Hello' }));
app.register('greeter', (c) => {
  const { greeting } = c.resolve('config');
  return { greet: (who) => `${greeting}, ${who}` };
});
console.log(app.resolve('greeter').greet('Ada'));
console.log(app.resolve('greeter') === app.resolve('greeter'));
try { app.resolve('db'); } catch (err) { console.log(err.message); }
