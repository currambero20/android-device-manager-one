import dotenv from 'dotenv';
const parsed = dotenv.config({ override: true });
console.log("Using DB URL:", process.env.DATABASE_URL);

import { getDb } from './server/db';
import { users } from './drizzle/schema';
import fs from 'fs';

async function run() {
  const db = await getDb();
  if (db) {
    const rows = await db.select().from(users);
    fs.writeFileSync('users.json', JSON.stringify(rows, null, 2));
    console.log("DB USERS SAVED TO users.json. Count:", rows.length);
  } else {
    console.error("DB NOT CONNECTED");
  }
  process.exit(0);
}
run();
