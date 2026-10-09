/** @interface Plugin  { name: string, setup(host): void } */
class Host {
  #hooks = new Map();                        // hook name -> handlers
  use(plugin) {
    if (typeof plugin.setup !== 'function') {
      throw new Error(`${plugin.name}: missing setup()`);
    }
    plugin.setup(this);
    return this;
  }
  on(hook, fn) {
    if (!this.#hooks.has(hook)) this.#hooks.set(hook, []);
    this.#hooks.get(hook).push(fn);
  }
  run(hook, value) {                         // each handler transforms value
    return (this.#hooks.get(hook) ?? []).reduce((v, fn) => fn(v), value);
  }
}
const tenOff = { name: 'tenOff', setup: (h) => h.on('price', (p) => p - 10) };
const vat = { name: 'vat', setup: (h) => h.on('price', (p) => p * 1.2) };

const shop = new Host().use(tenOff).use(vat);  // core never names a plugin
console.log(shop.run('price', 100));
console.log(new Host().run('price', 100));      // no plugins: core still works
try { shop.use({ name: 'broken' }); } catch (e) { console.log(e.message); }
