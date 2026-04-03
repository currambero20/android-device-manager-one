import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function hardResetDevices() {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  console.log('🧹 LIMPIEZA TOTAL - Eliminando TODOS los dispositivos...\n');
  
  // Ver primero
  const [before] = await conn.execute('SELECT COUNT(*) as total FROM devices');
  console.log(`Dispositivos antes: ${(before as any[])[0].total}`);
  
  // Eliminar TODOS los dispositivos
  await conn.execute('DELETE FROM devices');
  console.log('✅ Todos los dispositivos eliminados');
  
  // También limpiar datos relacionados
  const tables = ['locationHistory', 'smsLogs', 'callLogs', 'contacts', 'installedApps', 'mediaFiles', 'clipboardLogs', 'notificationLogs'];
  for (const table of tables) {
    try {
      await conn.execute(`DELETE FROM ${table}`);
      console.log(`  ✓ ${table} limpiado`);
    } catch (e) {}
  }

  // Insertar un dispositivo demo válido
  await conn.execute(`
    INSERT INTO devices (deviceId, deviceName, manufacturer, model, androidVersion, ownerId, status, lastSeen)
    VALUES ('demo-device-001', 'Demo Device', 'Samsung', 'Galaxy S21', '14', 1, 'offline', NOW())
  `);
  console.log('✅ Dispositivo demo插入ado (para pruebas)');
  
  const [after] = await conn.execute('SELECT id, deviceId, deviceName, status FROM devices');
  console.log(`\n📱 Dispositivos después: ${(after as any[]).length}`);
  (after as any[]).forEach(d => console.log(`  - ID:${d.id} | ${d.deviceId} | ${d.deviceName} | ${d.status}`));

  console.log('\n✅ LIMPIEZA COMPLETA - El panel esperará nuevas conexiones');
  await conn.end();
}

hardResetDevices();
