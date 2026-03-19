import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Connecting to TiDB...');
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });
  
  // Standard Hash for 'colombia' + 'android-device-manager-secure-salt-2024'
  const standardHash = "87bdb4b96085c23cac15f158adb6f5ad864ecfdb7992e937f64b7faa41a0e578";
  
  console.log('Restoring standard hash for costabot2018@gmail.com...');
  await conn.execute('UPDATE users SET passwordHash = ?, twoFactorEnabled = 1 WHERE email = "costabot2018@gmail.com"', [standardHash]);
  
  console.log('SUCCESS: Hash restored and 2FA enabled.');
  await conn.end();
}
run().catch(console.error);
