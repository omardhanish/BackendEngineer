test('1 needs no steps', () => eq(collatzSteps(1), 0));
test('2 needs one step', () => eq(collatzSteps(2), 1));
test('16 needs four steps', () => eq(collatzSteps(16), 4));
test('6 needs eight steps', () => eq(collatzSteps(6), 8));
test('7 needs sixteen steps', () => eq(collatzSteps(7), 16));
test('27 needs 111 steps', () => eq(collatzSteps(27), 111));
