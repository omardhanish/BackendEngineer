// Strategy: every channel has the same method, send(user, text)
export class EmailChannel {
  send(user, text) { return `email ${user.email}: ${text}`; }
}
export class SmsChannel {
  send(user, text) { return `sms ${user.phone}: ${text}`; }
}
export class PushChannel {
  #calls = 0; // fails on its first call, so the retry is visible
  send(user, text) {
    if (++this.#calls === 1) throw new Error('push gateway busy');
    return `push ${user.id}: ${text}`;
  }
}
// Decorator: the same send(), plus retries, around any channel
export class WithRetry {
  constructor(inner, tries) { this.inner = inner; this.tries = tries; }
  send(user, text) {
    for (let n = 1; ; n++) {
      try { return this.inner.send(user, text); } catch (err) {
        if (n === this.tries) throw err;
        console.log(`retry ${n} after: ${err.message}`);
      }
    }
  }
}
// Factory: the one place that turns a channel name into an object
export const makeChannel = {
  email: () => new EmailChannel(),
  sms: () => new SmsChannel(),
  push: () => new WithRetry(new PushChannel(), 3),
};
