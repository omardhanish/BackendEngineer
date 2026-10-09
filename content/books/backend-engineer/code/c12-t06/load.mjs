import dotenv from 'dotenv';

process.env.PORT = '9000'; // already set, as a host would do
dotenv.config({ path: 'env.example', quiet: true });

console.log(process.env.PORT);
console.log(process.env.MAIL_PORT, typeof process.env.MAIL_PORT);
console.log(Number(process.env.MAIL_PORT) + 1);
