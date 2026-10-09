// No pattern: every new channel means editing this function.
function notify(channel, to, msg) {
  if (channel === 'email') return `email ${to}: ${msg}`;
  if (channel === 'sms') return `sms ${to}: ${msg}`;
  throw new Error(`unknown channel ${channel}`);
}
console.log(notify('email', 'ana', 'room booked'));
console.log(notify('sms', 'ben', 'room booked'));
