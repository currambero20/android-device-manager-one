/**
 * Script para limpiar datos de dispositivos eliminados
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function cleanGhostData() {
  console.log('Conectando a la base de datos...');
  
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  console.log('\n1. Verificando dispositivos en la base de datos...');
  
  // Get all devices
  const [devices] = await conn.execute('SELECT id, deviceId, deviceName FROM devices');
  console.log(`   Encontrados ${devices.length} dispositivos`);
  
  console.log('\n2. Limpiando datos relacionados con dispositivos eliminados...');
  
  // The foreign key cascade should handle this, but let's be explicit
  const tables = [
    'locationHistory',
    'smsLogs', 
    'callLogs',
    'contacts',
    'installedApps',
    'mediaFiles',
    'devicePermissions'
  ];
  
  for (const table of tables) {
    try {
      // Get device IDs that exist
      const [validDevices] = await conn.execute('SELECT id FROM devices');
      const validIds = validDevices.map((d: any) => d.id);
      
      if (validIds.length > 0) {
        const placeholders = validIds.map(() => '?').join(',');
        const [result]: any = await conn.execute(
          `DELETE FROM ${table} WHERE deviceId NOT IN (${placeholders})`,
          validIds
        );
        if (result.affectedRows > 0) {
          console.log(`   ✓ ${table}: ${result.affectedRows} registros eliminados`);
        }
      }
    } catch (error) {
      console.log(`   ⚠ ${table}: Tabla puede no existir o no tener deviceId`);
    }
  }
  
  console.log('\n3. Verificando logs de auditoría...');
  
  // Get user IDs that exist
  const [validUsers] = await conn.execute('SELECT id FROM users');
  const validUserIds = validUsers.map((u: any) => u.id);
  
  if (validUserIds.length > 0) {
    const placeholders = validUserIds.map(() => '?').join(',');
    try {
      const [result]: any = await conn.execute(
        `DELETE FROM auditLogs WHERE userId NOT IN (${placeholders})`,
        validUserIds
      );
      console.log(`   ✓ auditLogs: ${result.affectedRows} registros eliminados`);
    } catch (error) {
      console.log(`   ⚠ auditLogs: Tabla puede no existir`);
    }
  }
  
  console.log('\n✅ Limpieza completada');
  await conn.end();
}

cleanGhostData().catch(console.error);
