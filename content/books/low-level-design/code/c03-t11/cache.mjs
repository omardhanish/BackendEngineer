/** @interface EvictionPolicy: touch(key), remove(key), victim() */
class LRUPolicy {
  #order = new Map(); // least recently used first
  touch(key) { this.#order.delete(key); this.#order.set(key, true); }
  remove(key) { this.#order.delete(key); }
  victim() { return this.#order.keys().next().value; }
}
class LFUPolicy {
  #counts = new Map(); // key -> uses, least recently used first
  touch(key) {
    const n = (this.#counts.get(key) ?? 0) + 1;
    this.#counts.delete(key); this.#counts.set(key, n);
  }
  remove(key) { this.#counts.delete(key); }
  victim() {
    let out, min = Infinity;
    for (const [k, n] of this.#counts) if (n < min) { out = k; min = n; }
    return out;
  }
}
class Cache {
  #cap; #policy; #data = new Map();
  constructor(capacity, policy) { this.#cap = capacity; this.#policy = policy; }
  get(key) {
    if (!this.#data.has(key)) return undefined;
    this.#policy.touch(key);
    return this.#data.get(key);
  }
  put(key, value) {
    let evicted;
    if (!this.#data.has(key) && this.#data.size >= this.#cap) {
      evicted = this.#policy.victim();
      this.#data.delete(evicted); this.#policy.remove(evicted);
    }
    this.#data.set(key, value); this.#policy.touch(key);
    return evicted;
  }
}
for (const policy of [new LRUPolicy(), new LFUPolicy()]) {
  const cache = new Cache(2, policy);
  cache.put('a', 1); cache.get('a'); cache.get('a');
  cache.put('b', 2);
  console.log(policy.constructor.name, 'evicts', cache.put('c', 3));
  console.log('a is', cache.get('a'), '| b is', cache.get('b'));
}
