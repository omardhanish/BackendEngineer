import assert from 'assert';
class SignupService {
  #users; #mailer;
  constructor(users, mailer) { this.#users = users; this.#mailer = mailer; }
  register(email) {
    if (this.#users.has(email)) return 'TAKEN';
    this.#users.add(email);
    this.#mailer.send(email, 'Welcome');
    return 'OK';
  }
}
class FakeUsers {
  #set = new Set();
  has(e) { return this.#set.has(e); }
  add(e) { this.#set.add(e); }
}
class SpyMailer {
  sent = [];
  send(to, subject) { this.sent.push(`${to}|${subject}`); }
}
function test(name, fn) {
  try { fn(); console.log('pass', name); }
  catch (e) { console.log('FAIL', name, '-', e.message); }
}
test('new email is welcomed', () => {
  const mailer = new SpyMailer();
  const svc = new SignupService(new FakeUsers(), mailer);
  assert.equal(svc.register('ada@x.io'), 'OK');
  assert.deepEqual(mailer.sent, ['ada@x.io|Welcome']);
});
test('duplicate sends no mail', () => {
  const mailer = new SpyMailer();
  const svc = new SignupService(new FakeUsers(), mailer);
  svc.register('ada@x.io');
  assert.equal(svc.register('ada@x.io'), 'TAKEN');
  assert.equal(mailer.sent.length, 1);
});
