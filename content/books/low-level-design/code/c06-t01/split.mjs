class EqualSplit {
  shares(amount, people) {
    return people.map((p) => [p, amount / people.length]);
  }
}
class Expense {
  #strategy;
  constructor(strategy) { this.#strategy = strategy; }
  split(amount, people) {
    return Object.fromEntries(this.#strategy.shares(amount, people));
  }
}
const dinner = new Expense(new EqualSplit());
console.log(dinner.split(90, ['ana', 'raj', 'li']));
