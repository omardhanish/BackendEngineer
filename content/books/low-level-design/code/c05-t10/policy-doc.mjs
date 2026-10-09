/**
 * Decides whether a requested slot clashes with a room's bookings.
 * @interface
 */
class ConflictPolicy {
  /**
   * @param {{start: number, end: number}} candidate  the requested slot
   * @param {Array<{start: number, end: number}>} existing  room's bookings
   * @returns {boolean} true when the candidate must be rejected
   */
  conflicts(candidate, existing) { throw new Error('not implemented'); }
}
class StrictOverlapPolicy extends ConflictPolicy {
  conflicts(c, existing) {
    return existing.some((e) => c.start < e.end && e.start < c.end);
  }
}
const policy = new StrictOverlapPolicy();
console.log(policy.conflicts({ start: 10, end: 11 }, [{ start: 9, end: 10 }]));
try { new ConflictPolicy().conflicts({}, []); }
catch (e) { console.log(e.message); }
