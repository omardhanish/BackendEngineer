// Strategy pattern: each channel is its own class with send().
class EmailSender { send(to, msg) { return `email ${to}: ${msg}`; } }
class SmsSender { send(to, msg) { return `sms ${to}: ${msg}`; } }

class Notifier {
  #sender;
  constructor(sender) { this.#sender = sender; }
  notify(to, msg) { console.log(this.#sender.send(to, msg)); }
}

new Notifier(new EmailSender()).notify('ana', 'room booked');
new Notifier(new SmsSender()).notify('ben', 'room booked');
