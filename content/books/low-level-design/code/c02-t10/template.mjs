class Report {
  render(rows) { // the template method: the order of steps is fixed here
    const head = this.header();
    return [head, ...rows.map((r) => this.row(r)), this.footer()].join('\n');
  }
  header() { throw new Error('not implemented'); }
  row() { throw new Error('not implemented'); }
  footer() { return '-- end --'; } // a hook: overriding it is optional
}
class CsvReport extends Report {
  header() { return 'item,qty'; }
  row(r) { return `${r.item},${r.qty}`; }
}
class TextReport extends Report {
  header() { return 'STOCK'; }
  row(r) { return `${r.item.padEnd(6)} x${r.qty}`; }
  footer() { return '=========='; }
}
const rows = [{ item: 'pens', qty: 12 }, { item: 'ink', qty: 3 }];
console.log(new CsvReport().render(rows));
console.log(new TextReport().render(rows));
