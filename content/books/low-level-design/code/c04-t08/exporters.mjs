class ExporterRegistry {
  #byFormat = new Map();
  register(format, exporter) {
    if (this.#byFormat.has(format)) throw new Error(`duplicate ${format}`);
    this.#byFormat.set(format, exporter);
    return this;
  }
  export(format, rows) {
    const exporter = this.#byFormat.get(format);
    if (!exporter) throw new Error(`no exporter for ${format}`);
    return exporter.render(rows);
  }
}
class CsvExporter { // minimal: no header, no quoting of commas or quotes
  render(rows) {
    return rows.map((r) => Object.values(r).join(',')).join('\n');
  }
}
class JsonExporter { render(rows) { return JSON.stringify(rows); } }

const registry = new ExporterRegistry()
  .register('csv', new CsvExporter())
  .register('json', new JsonExporter());
const rows = [{ sku: 'A1', qty: 2 }, { sku: 'B7', qty: 5 }];
console.log(registry.export('csv', rows));
console.log(registry.export('json', rows));
try { registry.export('xml', rows); } catch (e) { console.log(e.message); }
