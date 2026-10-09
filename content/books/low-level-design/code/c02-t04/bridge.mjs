class EmailChannel { deliver(text) { return `email: ${text}`; } }
class SmsChannel { deliver(text) { return `sms: ${text.slice(0, 16)}`; } }

class Alert { // abstraction: what to say
  constructor(channel) { this.channel = channel; } // implementor: how
  send(msg) { return this.channel.deliver(msg); }
}
class UrgentAlert extends Alert {
  send(msg) { return this.channel.deliver(`URGENT ${msg.toUpperCase()}`); }
}
for (const ch of [new EmailChannel(), new SmsChannel()]) {
  console.log(new Alert(ch).send('disk at 80%'));
  console.log(new UrgentAlert(ch).send('disk full on db-1'));
}
