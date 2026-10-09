const requirements = [
  { id: 'R1', text: 'search free rooms by capacity and slot', must: true },
  { id: 'R2', text: 'book a room', must: true },
  { id: 'R3', text: 'cancel your own booking', must: true },
  { id: 'R4', text: 'never double-book a room', must: true },
  { id: 'R5', text: 'notify attendees', must: true },
  { id: 'R6', text: 'recurring bookings', must: false },
];
const must = requirements.filter((r) => r.must).map((r) => r.id);
const stretch = requirements.filter((r) => !r.must).map((r) => r.id);
console.log('build first:', must.join(' '));
console.log('stretch:', stretch.join(' '));
