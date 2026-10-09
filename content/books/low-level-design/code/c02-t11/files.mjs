class File {
  constructor(name, kb) { this.name = name; this.kb = kb; }
  accept(visitor) { return visitor.visitFile(this); }
}
class Folder {
  constructor(name, items) { this.name = name; this.items = items; }
  accept(visitor) { return visitor.visitFolder(this); }
  *[Symbol.iterator]() { // Iterator: every node, depth first
    yield this;
    for (const item of this.items) {
      if (item instanceof Folder) yield* item;
      else yield item;
    }
  }
}
class ListVisitor { // Visitor: one method per node class
  visitFile(f) { return `  ${f.name}`; }
  visitFolder(d) { return `${d.name}/`; }
}
class SizeVisitor { // a new operation; File and Folder stay untouched
  visitFile(f) { return f.kb; }
  visitFolder() { return 0; }
}
const root = new Folder('src', [new File('app.js', 4),
  new File('util.js', 2), new Folder('lib', [new File('db.js', 6)])]);
const list = new ListVisitor(), size = new SizeVisitor();
for (const node of root) console.log(node.accept(list));
let total = 0;
for (const node of root) total += node.accept(size);
console.log('total kb:', total);
