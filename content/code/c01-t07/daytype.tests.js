test('sat is weekend', () => eq(dayType('sat'), 'weekend'));
test('sun is weekend', () => eq(dayType('sun'), 'weekend'));
test('wed is weekday', () => eq(dayType('wed'), 'weekday'));
test('fri is weekday', () => eq(dayType('fri'), 'weekday'));
test('xyz is unknown', () => eq(dayType('xyz'), 'unknown'));
test('SAT is unknown (case matters)', () => eq(dayType('SAT'), 'unknown'));
