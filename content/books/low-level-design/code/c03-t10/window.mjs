class SlidingWindowLog {
  #limit; #windowMs; #log = new Map();          // key -> request times
  constructor(limit, windowMs) {
    this.#limit = limit; this.#windowMs = windowMs;
  }
  allow(key, nowMs) {
    const recent = (this.#log.get(key) ?? [])
      .filter((t) => t > nowMs - this.#windowMs);
    const ok = recent.length < this.#limit;
    if (ok) recent.push(nowMs);
    this.#log.set(key, recent);
    return ok;
  }
}
const limiter = new SlidingWindowLog(2, 1000);  // 2 per rolling second
const times = [0, 400, 900, 1000, 1401];
console.log(times.map((t) => `${t}:${limiter.allow('u1', t)}`).join(' '));
