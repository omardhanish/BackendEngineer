class User {
  constructor(name) { this.name = name; }
  hello() { return 'hi ' + this.name; }
  reader() { return () => this.name; }    // arrow: this comes from reader()
}
const ada = new User('Ada');
console.log(ada.hello());                 // method call: this is ada

const detached = ada.hello;
try { detached(); } catch (e) { console.log(e.name); }  // plain call: no this

console.log(detached.bind(ada)());        // bind fixes this to ada
console.log(ada.reader()());              // the arrow still sees ada
