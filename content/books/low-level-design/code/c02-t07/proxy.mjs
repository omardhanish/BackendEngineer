class Reports {
  build(id) { console.log(`  building ${id}`); return `report ${id}`; }
}
class ReportProxy { // same method, controlled access
  #real = null; #user;
  constructor(user) { this.#user = user; }
  build(id) {
    if (this.#user.role !== 'admin') throw new Error('forbidden');
    this.#real ??= new Reports(); // created only when first needed
    return this.#real.build(id);
  }
}
console.log(new ReportProxy({ role: 'admin' }).build('q3'));
try { new ReportProxy({ role: 'guest' }).build('q3'); }
catch (e) { console.log('guest:', e.message); }
