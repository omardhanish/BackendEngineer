const password = 'p@ss/w:rd'; // demo value, not a real password
const host = 'cluster0.example.mongodb.net';

const raw = new URL(`mongodb+srv://demo-user:${password}@${host}/`);
console.log('raw host:', raw.hostname);

const safe = encodeURIComponent(password);
const url = new URL(`mongodb+srv://demo-user:${safe}@${host}/`);
console.log('encoded:', safe);
console.log(url.hostname, decodeURIComponent(url.password) === password);
