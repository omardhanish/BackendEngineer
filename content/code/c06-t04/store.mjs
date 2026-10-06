import crypto from 'node:crypto';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
});
const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
});

let db = drizzle(process.env.DATABASE_URL);
await db.execute(sql`create table users (id serial primary key,
  email text not null unique, password_hash text not null,
  role text not null default 'user')`);
await db.execute(sql`create table sessions (id text primary key,
  user_id integer references users(id), expires_at timestamp not null)`);

async function createSession(userId, ttlMs = 24 * 60 * 60 * 1000) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return id;
}

async function getSessionUser(sid) {
  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sid), gt(sessions.expiresAt, new Date())));
  return row ?? null;
}

const destroySession = (sid) => db.delete(sessions).where(eq(sessions.id, sid));

async function purgeExpired() {
  const gone = await db.delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });
  return gone.length;
}

const [ada] = await db.insert(users)
  .values({ email: 'ada@example.com', passwordHash: 'demo-placeholder' })
  .returning();
const sid = await createSession(ada.id);
const staleSid = await createSession(ada.id, -1000); // already expired
console.log('live:', await getSessionUser(sid));
console.log('expired:', await getSessionUser(staleSid));
console.log('purged:', await purgeExpired());

await db.$client.end(); // the server process exits...
db = drizzle(process.env.DATABASE_URL); // ...and a new one starts
console.log('after restart:', (await getSessionUser(sid))?.email);

await destroySession(sid);
console.log('after logout:', await getSessionUser(sid));
await db.$client.end();
