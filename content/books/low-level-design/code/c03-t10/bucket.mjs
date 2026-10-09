/** @interface */
class RateLimiter {
  allow(key, nowMs) { throw new Error('not implemented'); }
}
class TokenBucket extends RateLimiter {
  #capacity; #perSec; #buckets = new Map();   // key -> { tokens, at }
  constructor(capacity, perSec) {
    super(); this.#capacity = capacity; this.#perSec = perSec;
  }
  allow(key, nowMs) {
    const b = this.#buckets.get(key) ?? { tokens: this.#capacity, at: nowMs };
    const refill = ((nowMs - b.at) / 1000) * this.#perSec;
    b.tokens = Math.min(this.#capacity, b.tokens + refill);
    b.at = nowMs;
    this.#buckets.set(key, b);
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }
}
const limiter = new TokenBucket(3, 1);   // burst of 3, then 1 per second
const at = (ms, key = 'ip-1') => (limiter.allow(key, ms) ? 'ok' : 'NO');
console.log('burst  ', [0, 10, 20, 30].map((t) => at(t)).join(' '));
console.log('other  ', at(30, 'ip-2'));
console.log('t=1030 ', at(1030), at(1040));
console.log('t=9000 ', [9000, 9000, 9000, 9000].map((t) => at(t)).join(' '));
