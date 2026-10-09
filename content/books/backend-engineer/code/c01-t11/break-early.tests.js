test('stops at the negative', () => eq(sumBeforeNegative([3, 4, -1, 10]), 7));
test('no negative adds all', () => eq(sumBeforeNegative([1, 2, 3]), 6));
test('negative first gives 0', () => eq(sumBeforeNegative([-5, 1, 2]), 0));
test('zero is not negative', () => eq(sumBeforeNegative([0, 4, -1, 5]), 4));
test('later negatives are ignored', () => {
  eq(sumBeforeNegative([5, -1, -2]), 5);
});
test('empty array', () => eq(sumBeforeNegative([]), 0));
