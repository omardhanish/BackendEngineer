class LiveCharger { charge(n) { return `charged ${n} via bank`; } }
class LiveRefunder { refund(n) { return `refunded ${n} via bank`; } }
class FakeCharger { charge(n) { return `pretend charge ${n}`; } }
class FakeRefunder { refund(n) { return `pretend refund ${n}`; } }

class LivePayments { charger() { return new LiveCharger(); }
  refunder() { return new LiveRefunder(); } }
class FakePayments { charger() { return new FakeCharger(); }
  refunder() { return new FakeRefunder(); } }

function settle(kit, amount) { // knows only the kit's two methods
  return [kit.charger().charge(amount), kit.refunder().refund(amount)];
}
console.log(settle(new FakePayments(), 40).join(' | '));
console.log(settle(new LivePayments(), 40).join(' | '));
