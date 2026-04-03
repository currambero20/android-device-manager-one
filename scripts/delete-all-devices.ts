/**
 * Eliminar todos los dispositivos
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function deleteAllDevices() {
  console.log('Eliminando todos los dispositivos...\n');
  
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  // Verificar dispositivos actuales
  const [devices] = await conn.execute('SELECT id, deviceName FROM devices');
  console.log(`Dispositivos actuales: ${(devices as any[]).length}`);
  (devices as any[]).forEach((d: any) => console.log(`  - ID:${d.id} | ${d.deviceName}`));

  // Eliminar todos los dispositivos
  console.log('\nEliminando todos los dispositivos...');
  await conn.execute('DELETE FROM devices');
  
  // Verificar que se eliminaron
  const [after] = await conn.execute('SELECT COUNT(*) as c FROM devices');
  console.log(`\nDispositivos después de eliminar: ${(after as any)[0].c}`);
  
  console.log('\n✅ Todos los dispositivos eliminados');
  await conn.end();
}

deleteAllDevices().catch(console.error);
