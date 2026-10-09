class ConnectionPool {
  #free = []; #busy = new Set(); #made = 0;
  constructor(max) { this.max = max; }
  acquire() {
    let conn = this.#free.pop();
    if (!conn && this.#made < this.max) conn = { id: ++this.#made };
    if (!conn) throw new Error('pool exhausted');
    this.#busy.add(conn);
    return conn;
  }
  release(conn) {
    if (this.#busy.delete(conn)) this.#free.push(conn);
  }
}
const pool = new ConnectionPool(2);
const a = pool.acquire(), b = pool.acquire();
try { pool.acquire(); } catch (e) { console.log(e.message); }
pool.release(a);
console.log(pool.acquire() === a, b.id);
