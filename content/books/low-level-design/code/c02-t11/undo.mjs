class Editor {
  #text = '';
  type(s) { this.#text += s; }
  get text() { return this.#text; }
  save() { return Object.freeze({ text: this.#text }); } // the memento
  restore(memento) { this.#text = memento.text; }
}
class History { // caretaker: keeps mementos, never reads inside them
  #stack = [];
  push(memento) { this.#stack.push(memento); }
  pop() { return this.#stack.pop(); }
}
const editor = new Editor(), history = new History();
editor.type('Hello');
history.push(editor.save());
editor.type(', world');
console.log(editor.text);
editor.restore(history.pop());
console.log(editor.text);
