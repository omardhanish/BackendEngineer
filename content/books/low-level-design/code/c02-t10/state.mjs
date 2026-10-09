class Draft {
  submit(doc) { doc.moveTo(new InReview()); return 'sent for review'; }
  approve() { return 'refused: still a draft'; }
  reject() { return 'refused: nothing to reject'; }
}
class InReview {
  submit() { return 'refused: already in review'; }
  approve(doc) { doc.moveTo(new Published()); return 'approved'; }
  reject(doc) { doc.moveTo(new Draft()); return 'back to draft'; }
}
class Published {
  submit() { return 'refused: already live'; }
  approve() { return 'refused: already live'; }
  reject() { return 'refused: already live'; }
}
class Doc { // the context: forwards every call to its current state
  #state = new Draft();
  moveTo(state) { this.#state = state; }
  get status() { return this.#state.constructor.name; }
  submit() { return `${this.#state.submit(this)} -> ${this.status}`; }
  approve() { return `${this.#state.approve(this)} -> ${this.status}`; }
  reject() { return `${this.#state.reject(this)} -> ${this.status}`; }
}
const doc = new Doc();
const actions = ['approve', 'submit', 'reject', 'submit', 'approve', 'submit'];
for (const a of actions) console.log(`${a}: ${doc[a]()}`);
