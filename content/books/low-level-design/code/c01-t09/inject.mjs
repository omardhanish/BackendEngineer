class ConsoleMailer {
  send(to, text) { console.log(`mail to ${to}: ${text}`); }
}
class FakeMailer {
  sent = [];
  send(to, text) { this.sent.push({ to, text }); }
}

class SignupService {
  #mailer;
  constructor(mailer) { this.#mailer = mailer; } // injected, not built here
  register(email) {
    this.#mailer.send(email, 'Welcome!');
    return { email };
  }
}

// Composition root: the one place that picks concrete classes
new SignupService(new ConsoleMailer()).register('ada@example.com');

const fake = new FakeMailer();
new SignupService(fake).register('lin@example.com');
console.log(fake.sent.length, fake.sent[0].to);
