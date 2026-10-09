class EmailNotifier { send(to) { return `email to ${to}`; } }
class SmsNotifier { send(to) { return `sms to ${to}`; } }

class NotifierFactory {
  static #makers = new Map([['email', EmailNotifier], ['sms', SmsNotifier]]);
  static register(kind, Maker) { this.#makers.set(kind, Maker); }
  static create(kind) {
    const Maker = this.#makers.get(kind);
    if (!Maker) throw new Error(`unknown notifier: ${kind}`);
    return new Maker();
  }
}
console.log(NotifierFactory.create('sms').send('ada'));
try { NotifierFactory.create('fax'); } catch (e) { console.log(e.message); }
