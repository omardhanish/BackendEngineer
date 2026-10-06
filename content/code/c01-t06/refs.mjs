const a = { tags: ['x'], n: 1 };
const alias = a;
alias.n = 2;
console.log(a.n, a === alias);

const copy = { ...a };
console.log(copy === a, copy.tags === a.tags);

const deep = structuredClone(a);
deep.tags.push('y');
console.log(a.tags.length, deep.tags.length);
console.log({} === {}, [1] === [1]);
