function calc(o, t) {
  let r = 0;
  for (let i = 0; i < o.length; i++) {
    if (o[i].q > 0) {
      if (t == 1) r += o[i].p * o[i].q * 0.9;
      else r += o[i].p * o[i].q;
    }
  }
  return r;
}
const items = [{ p: 20, q: 2 }, { p: 5, q: 0 }, { p: 10, q: 1 }];
console.log(calc(items, 1), calc(items, 0));
