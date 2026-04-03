/**
 * AUDITORÍA COMPLETA DEL SISTEMA
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function runAudit() {
  console.log('='.repeat(60));
  console.log('AUDITORÍA DEL SISTEMA MDM');
  console.log('='.repeat(60));
  
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  // 1. Verificar dispositivos
  console.log('\n📱 1. DISPOSITIVOS EN LA BASE DE DATOS');
  console.log('-'.repeat(40));
  const [devices] = await conn.execute('SELECT id, deviceId, deviceName, status, createdAt FROM devices ORDER BY id');
  console.log(`Total: ${(devices as any[]).length} dispositivos`);
  (devices as any[]).forEach(d => {
    console.log(`  ID:${d.id} | ${d.deviceName} | Status:${d.status} | Creado:${new Date(d.createdAt).toLocaleDateString()}`);
  });

  // 2. Verificar usuarios
  console.log('\n👤 2. USUARIOS EN LA BASE DE DATOS');
  console.log('-'.repeat(40));
  const [users] = await conn.execute('SELECT id, name, email, role FROM users');
  console.log(`Total: ${(users as any[]).length} usuarios`);
  (users as any[]).forEach(u => {
    console.log(`  ID:${u.id} | ${u.name} | ${u.email} | Rol:${u.role}`);
  });

  // 3. Verificar permisos
  console.log('\n🔐 3. PERMISOS EN LA BASE DE DATOS');
  console.log('-'.repeat(40));
  const [perms] = await conn.execute('SELECT id, code, category FROM permissions ORDER BY category');
  console.log(`Total: ${(perms as any[]).length} permisos`);
  
  const permByCategory: Record<string, number> = {};
  (perms as any[]).forEach(p => {
    permByCategory[p.category] = (permByCategory[p.category] || 0) + 1;
  });
  Object.entries(permByCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} permisos`);
  });

  // 4. Verificar permisos de sección
  console.log('\n🔐 4. PERMISOS DE SECCIÓN (UI)');
  console.log('-'.repeat(40));
  const [sectionPerms] = await conn.execute("SELECT code FROM permissions WHERE code LIKE 'section:%'");
  console.log(`Permisos de sección: ${(sectionPerms as any[]).length}`);
  (sectionPerms as any[]).forEach(p => {
    console.log(`  - ${p.code}`);
  });

  // 5. Verificar userPermissions
  console.log('\n👥 5. ASIGNACIONES DE PERMISOS A USUARIOS');
  console.log('-'.repeat(40));
  const [userPerms] = await conn.execute(`
    SELECT up.*, p.code, u.name as userName 
    FROM userPermissions up 
    JOIN permissions p ON up.permissionId = p.id 
    JOIN users u ON up.userId = u.id
    ORDER BY up.userId
  `);
  console.log(`Total asignaciones: ${(userPerms as any[]).length}`);
  
  // Agrupar por usuario
  const permsByUser: Record<string, string[]> = {};
  (userPerms as any[]).forEach(up => {
    if (!permsByUser[up.userName]) permsByUser[up.userName] = [];
    permsByUser[up.userName].push(up.code);
  });
  Object.entries(permsByUser).forEach(([user, perms]) => {
    console.log(`  ${user}: ${perms.length} permisos`);
    perms.slice(0, 5).forEach(p => console.log(`    - ${p}`));
    if (perms.length > 5) console.log(`    ... y ${perms.length - 5} más`);
  });

  // 6. Verificar tablas de datos
  console.log('\n📊 6. DATOS EN TABLAS');
  console.log('-'.repeat(40));
  const tables = ['locationHistory', 'smsLogs', 'callLogs', 'contacts', 'installedApps', 'mediaFiles'];
  for (const table of tables) {
    try {
      const [[result]]: any = await conn.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ${table}: ${result.count} registros`);
    } catch (e) {
      console.log(`  ${table}: ERROR - tabla no existe`);
    }
  }

  // 7. Verificar APK Builds
  console.log('\n📦 7. APK BUILDS');
  console.log('-'.repeat(40));
  const [builds] = await conn.execute('SELECT id, appName, status, createdAt FROM apkBuilds ORDER BY createdAt DESC LIMIT 5');
  console.log(`Total builds: ${(builds as any[]).length} (mostrando últimos 5)`);
  (builds as any[]).forEach(b => {
    console.log(`  ID:${b.id} | ${b.appName} | Status:${b.status} | ${new Date(b.createdAt).toLocaleDateString()}`);
  });

  // 8. Verificar configuración
  console.log('\n⚙️ 8. CONFIGURACIÓN DEL SERVIDOR');
  console.log('-'.repeat(40));
  console.log(`  FRONTEND_URL: ${process.env.VITE_APP_URL || 'no configurado'}`);
  console.log(`  API_URL: ${process.env.API_URL || 'no configurado'}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '[CONFIGURADO]' : '[NO CONFIGURADO]'}`);
  console.log(`  ADMIN_USERNAME: ${process.env.ADMIN_USERNAME || 'no configurado'}`);

  console.log('\n' + '='.repeat(60));
  console.log('FIN DE LA AUDITORÍA');
  console.log('='.repeat(60));

  await conn.end();
}

runAudit().catch(console.error);
