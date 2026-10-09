import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

// src/db/index.js
export const db = drizzle(process.env.DATABASE_URL);

// Setup so this file runs alone: one query proves the connection.
const result = await db.execute(sql`select 1 as ok`);
console.log(result.rows);
await db.$client.end();
