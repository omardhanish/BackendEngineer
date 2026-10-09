import bcrypt from 'bcryptjs';

const users = new Map(); // email -> stored password hash

async function signUp(email, password) {
  users.set(email, await bcrypt.hash(password, 10));
}

async function logIn(email, password) {
  const hash = users.get(email);
  return Boolean(hash) && (await bcrypt.compare(password, hash));
}

await signUp('ada@example.com', 'demo-password');
await signUp('bob@example.com', 'demo-password');
console.log('right password:', await logIn('ada@example.com', 'demo-password'));
console.log('wrong password:', await logIn('ada@example.com', 'guess'));
console.log('unknown email:', await logIn('eve@example.com', 'demo-password'));
const same = users.get('ada@example.com') === users.get('bob@example.com');
console.log('same hash?', same);
