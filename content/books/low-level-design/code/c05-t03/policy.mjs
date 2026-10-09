/** @interface ConflictPolicy: conflicts(candidate, existing) -> boolean */
class ConflictPolicy {
  conflicts(candidate, existing) { throw new Error('not implemented'); }
}

const clash = (a, b, gap) => a.start < b.end + gap && b.start < a.end + gap;

class StrictOverlapPolicy extends ConflictPolicy {
  conflicts(c, existing) { return existing.some((e) => clash(c, e, 0)); }
}
class BufferPolicy extends ConflictPolicy { // 15-minute gap for cleaning
  conflicts(c, existing) { return existing.some((e) => clash(c, e, 0.25)); }
}

const existing = [{ start: 9, end: 10 }];
const candidate = { start: 10, end: 11 };
for (const policy of [new StrictOverlapPolicy(), new BufferPolicy()]) {
  console.log(policy.constructor.name, policy.conflicts(candidate, existing));
}
