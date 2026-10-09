class Doc { text = ''; }
class Append { // a command: an action stored as an object
  constructor(doc, s) { this.doc = doc; this.s = s; }
  run() { this.prev = this.doc.text; this.doc.text += this.s; }
  undo() { this.doc.text = this.prev; }
}
class Editor {
  #history = [];
  exec(cmd) { cmd.run(); this.#history.push(cmd); }
  undo() { this.#history.pop()?.undo(); }
}
const doc = new Doc(), ed = new Editor();
ed.exec(new Append(doc, 'Hello')); ed.exec(new Append(doc, ' world'));
console.log(doc.text);
ed.undo(); console.log(doc.text);
