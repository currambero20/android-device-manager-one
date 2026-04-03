import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { createHash } from 'crypto';
dotenv.config();

async function run() {
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Dylan2017';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Barranquilla';
  const APP_ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY || 'adm-secure-barranquilla-2017';

  console.log(`Creating admin user: ${ADMIN_USERNAME}`);

  const passwordHash = createHash('sha256').update(ADMIN_PASSWORD + APP_ENCRYPTION_KEY).digest('hex');
  console.log(`Password hash: ${passwordHash}`);

  console.log('Connecting to TiDB...');
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  const openId = `local:${ADMIN_USERNAME}`;

  console.log('Inserting/Updating user...');
  await conn.execute(`
    INSERT INTO users (openId, name, email, role, loginMethod, passwordHash, twoFactorEnabled, isActive, lastSignedIn)
    VALUES (?, ?, ?, 'admin', 'local', ?, 0, 1, NOW())
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      passwordHash = VALUES(passwordHash),
      role = 'admin',
      twoFactorEnabled = 0,
      isActive = 1,
      lastSignedIn = NOW()
  `, [openId, ADMIN_USERNAME, `${ADMIN_USERNAME}@device-manager.local`, passwordHash]);

  console.log(`SUCCESS: User ${ADMIN_USERNAME} created/updated with role admin`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log(`Salt used: ${APP_ENCRYPTION_KEY}`);

  await conn.end();
}

run().catch(console.error);
