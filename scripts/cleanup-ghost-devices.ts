import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function cleanupGhostDevices() {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  console.log('🔍 ANALIZANDO DISPOSITIVOS FANTASMA...\n');
  
  const [allDevices] = await conn.execute('SELECT id, deviceId, deviceName, status, lastSeen, createdAt FROM devices ORDER BY id DESC');
  console.log(`Total dispositivos en DB: ${(allDevices as any[]).length}`);
  
  const [noLastSeen] = await conn.execute('SELECT id, deviceId, deviceName, status, createdAt FROM devices WHERE lastSeen IS NULL OR lastSeen = "0000-00-00 00:00:00"');
  console.log(`\nDispositivos sin lastSeen: ${(noLastSeen as any[]).length}`);
  (noLastSeen as any[]).forEach(d => console.log(`  - ID:${d.id} | ${d.deviceName} | ${d.status} | createdAt: ${d.createdAt}`));

  if ((noLastSeen as any[]).length > 0) {
    const idsToDelete = (noLastSeen as any[]).map(d => d.id);
    await conn.execute('DELETE FROM devices WHERE id IN (?)', [idsToDelete]);
    console.log(`\n✅ ELIMINADOS ${idsToDelete.length} dispositivos fantasma sin lastSeen`);
  }

  const [oldOffline] = await conn.execute(`
    SELECT id, deviceName, lastSeen 
    FROM devices 
    WHERE status = 'offline' 
    AND lastSeen < DATE_SUB(NOW(), INTERVAL 7 DAY)
  `);
  
  if ((oldOffline as any[]).length > 0) {
    const idsToDelete = (oldOffline as any[]).map(d => d.id);
    await conn.execute('DELETE FROM devices WHERE id IN (?)', [idsToDelete]);
    console.log(`✅ ELIMINADOS ${idsToDelete.length} dispositivos offline antiguos (>7 días)`);
  }

  const [final] = await conn.execute('SELECT id, deviceId, deviceName, status, lastSeen FROM devices ORDER BY id DESC');
  console.log(`\n📱 DISPOSITIVOS FINALES: ${(final as any[]).length}`);
  (final as any[]).forEach(d => console.log(`  - ID:${d.id} | ${d.deviceName} | ${d.status} | lastSeen: ${d.lastSeen || 'N/A'}`));

  await conn.end();
}

cleanupGhostDevices();
