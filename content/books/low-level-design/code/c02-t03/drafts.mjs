class EmailDraft {
  constructor(subject, tags = []) { this.subject = subject; this.tags = tags; }
  clone() { return new EmailDraft(this.subject, [...this.tags]); }
}
const welcome = new EmailDraft('Welcome!', ['onboarding']);
const copy = welcome.clone();
copy.tags.push('vip');
const lazy = Object.assign(new EmailDraft(), welcome); // shallow copy
lazy.tags.push('oops');
console.log(JSON.stringify(welcome.tags), JSON.stringify(copy.tags));
console.log(copy instanceof EmailDraft);
console.log(structuredClone(welcome) instanceof EmailDraft);
