import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Connecting to TiDB...');
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });
  const [rows] = await conn.execute('SELECT email, passwordHash FROM users WHERE email LIKE "%costabot%"');
  console.log('USER_RECORD:', JSON.stringify(rows));
  await conn.end();
}
run().catch(console.error);
