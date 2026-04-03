/**
 * Script para inicializar permisos de sección del panel web
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const SECTION_PERMISSIONS = [
  { code: 'section:dashboard', name: 'Dashboard', description: 'Ver panel principal', category: 'ui' },
  { code: 'section:devices', name: 'Dispositivos', description: 'Gestión de dispositivos', category: 'ui' },
  { code: 'section:users', name: 'Usuarios', description: 'Gestión de usuarios', category: 'ui' },
  { code: 'section:permissions', name: 'Permisos', description: 'Permisos básicos', category: 'ui' },
  { code: 'section:permissions_management', name: 'Gestión de Permisos', description: 'Permisos granulares', category: 'ui' },
  { code: 'section:apk_builder', name: 'Constructor APK', description: 'Crear APK de monitoreo', category: 'ui' },
  { code: 'section:audit_logs', name: 'Logs de Auditoría', description: 'Registro de actividades', category: 'ui' },
  { code: 'section:settings', name: 'Configuración', description: 'Configuración del sistema', category: 'ui' },
  { code: 'section:device_map', name: 'Mapa de Dispositivos', description: 'Vista geográfica', category: 'ui' },
  { code: 'section:app_manager', name: 'Gestor de Apps', description: 'Apps instaladas', category: 'ui' },
  { code: 'section:file_explorer', name: 'Explorador de Archivos', description: 'Archivos del dispositivo', category: 'ui' },
  { code: 'section:advanced_monitoring', name: 'Monitoreo Avanzado', description: 'Monitoreo detallado', category: 'ui' },
  { code: 'section:device_monitoring', name: 'Monitoreo GPS', description: 'GPS y SMS', category: 'ui' },
  { code: 'section:remote_control', name: 'Control Remoto', description: 'Comandos remotos', category: 'ui' },
  { code: 'section:analytics', name: 'Analíticas', description: 'Estadísticas', category: 'ui' },
  { code: 'section:geofencing', name: 'Geofencing', description: 'Geocercas', category: 'ui' },
  { code: 'section:notifications', name: 'Notificaciones', description: 'Alertas', category: 'ui' },
  { code: 'section:gps_tracker', name: 'GPS Tracker', description: 'Rastreo GPS', category: 'ui' },
  { code: 'section:compliance', name: 'Compliance', description: 'Políticas DLP', category: 'ui' },
  { code: 'section:media_capture', name: 'Captura Remota', description: 'Capturas multimedia', category: 'ui' },
  { code: 'section:communications', name: 'Comunicaciones', description: 'SMS, llamadas, contactos', category: 'ui' },
  { code: 'section:profile', name: 'Mi Perfil', description: 'Mi cuenta', category: 'ui' },
];

async function initializeSectionPermissions() {
  console.log('Conectando a la base de datos...');
  
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  console.log(`Insertando ${SECTION_PERMISSIONS.length} permisos de sección...`);

  for (const perm of SECTION_PERMISSIONS) {
    try {
      await conn.execute(`
        INSERT IGNORE INTO permissions (code, name, description, category)
        VALUES (?, ?, ?, ?)
      `, [perm.code, perm.name, perm.description, perm.category]);
      console.log(`  ✓ ${perm.name}`);
    } catch (error) {
      console.error(`  ✗ Error con ${perm.name}:`, error);
    }
  }

  console.log('\nPermisos de sección inicializados correctamente.');
  await conn.end();
}

initializeSectionPermissions().catch(console.error);
