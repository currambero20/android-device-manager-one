import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Connecting to TiDB...');
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });
  
  // The 'Legacy' hash for 'colombia' using the raw salt: 
  // "0f54de789b0083c0e7bfcc12b3ad593c:879ee2fd7bcf12b8f537c51c5d07d050"
  const legacyHash = "db0b305e7ba08b367d32a4ae48c0884d593361497931f8b13be211f4356e9c1c";
  
  console.log('Updating costabot2018@gmail.com with legacy hash...');
  const [result] = await conn.execute(
    'UPDATE users SET passwordHash = ? WHERE email = ?',
    [legacyHash, 'costabot2018@gmail.com']
  );
  
  console.log('SUCCESS:', result);
  await conn.end();
}
run().catch(console.error);
