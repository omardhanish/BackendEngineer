import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL in .env');
export const db = drizzle(url);

// A quick check. A script closes the pool; a server keeps it open.
const { rows } = await db.execute(sql`select 1 as ok`);
console.log(rows);
await db.$client.end();
