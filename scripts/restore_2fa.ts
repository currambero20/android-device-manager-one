import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Connecting to TiDB...');
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });
  
  console.log('Re-enabling 2FA for costabot2018@gmail.com...');
  await conn.execute('UPDATE users SET twoFactorEnabled = 1 WHERE email = "costabot2018@gmail.com"');
  
  console.log('SUCCESS: 2FA re-enabled.');
  await conn.end();
}
run().catch(console.error);
