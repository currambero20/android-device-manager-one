import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { createHash } from "crypto";
import {
  InsertUser,
  users,
  permissions,
  userPermissions,
  devices,
  devicePermissions,
  locationHistory,
  smsLogs,
  callLogs,
  contacts,
  installedApps,
  clipboardLogs,
  notificationLogs,
  mediaFiles,
  auditLogs,
  geofences,
  geofenceEvents,
  InsertAuditLog,
} from "../drizzle/schema";

/**
 * Shared password hashing logic for local authentication.
 * Uses SHA-256 with a salt for basic security.
 */
export function hashPassword(password: string): string {
  const salt = "salt-adm-2024";
  return createHash("sha256").update(password + salt).digest("hex");
}

let _pool: mysql.Pool | null = null;
let _db: any = null;
let _migrationLog: string[] = [];

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // PlanetScale requires explicit SSL configuration when using createPool
      // But local Docker/localhost development often doesn't have SSL configured
      const isLocal = process.env.DATABASE_URL.includes("localhost") || 
                      process.env.DATABASE_URL.includes("127.0.0.1") ||
                      process.env.DATABASE_URL.includes("@mysql:"); // Docker service name

      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: isLocal ? undefined : {
          rejectUnauthorized: true
        },
        connectionLimit: 10,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });
      _db = drizzle(_pool) as any;
    } catch (error: any) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function runMigrations() {
  // Schema is fully managed by scripts/migrate-tidb.ts (run once at setup).
  // No ALTER statements needed here — all columns exist in TiDB Cloud.
  _migrationLog = ["Schema OK - managed by migrate-tidb.ts"];
  console.log("[Database] Schema is up-to-date (TiDB Cloud).");
}

export async function getHealthStatus() {
  const db = await getDb();
  if (!db) return { status: "disconnected", error: "No DB instance" };
  
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const latency = Date.now() - start;

    return {
      status: "connected",
      latency: `${latency}ms`,
      migrationLog: _migrationLog,
    };
  } catch (error: any) {
    const fullErr = error.cause ? String(error.cause) : JSON.stringify(error, Object.getOwnPropertyNames(error));
    return { 
      status: "error", 
      error: String(error.message),
      fullErrorDetails: fullErr,
      migrationLog: _migrationLog,
      dbUriPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + "..." : "none"
    };
  }
}

export async function upsertUser(user: InsertUser): Promise<any> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? "local",
      role: user.role ?? "user",
      twoFactorEnabled: user.twoFactorEnabled ?? false,
      twoFactorSecret: user.twoFactorSecret ?? null,
      passwordHash: user.passwordHash ?? null,
      isActive: user.isActive ?? true,
      lastSignedIn: user.lastSignedIn ?? new Date(),
    };

    console.log("[DB] DEBUG: upsertUser values keys:", Object.keys(values));
    console.log("[DB] DEBUG: upsertUser values openId:", values.openId);

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: {
        name: values.name,
        email: values.email,
        role: values.role,
        passwordHash: values.passwordHash,
        lastSignedIn: values.lastSignedIn,
        isActive: values.isActive,
      },
    });

    return await getUserByOpenId(user.openId);
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all permission codes for a specific user.
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      code: permissions.code,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId));

  return result.map((p: { code: string }) => p.code);
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.lastSignedIn));
}

/**
 * Delete a user and all their related data (manual cascading).
 */
export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;

  // Manual cascading deletes (to avoid foreign key constraints errors)
  await db.delete(userPermissions).where(eq(userPermissions.userId, id));
  await db.delete(devicePermissions).where(eq(devicePermissions.userId, id));
  // Delete audit logs for this user to clean up simulation/old data
  await db.delete(auditLogs).where(eq(auditLogs.userId, id));

  // Also handle devices owned by this user
  const userDevices = await db.select().from(devices).where(eq(devices.ownerId, id));
  for (const device of userDevices) {
    await deleteDevice(device.id);
  }

  await db.delete(users).where(eq(users.id, id));
}

/**
 * Delete a device and all its related monitoring data (manual cascading).
 */
export async function deleteDevice(id: number) {
  const db = await getDb();
  if (!db) return;

  // Delete all device-related monitoring data
  await db.delete(locationHistory).where(eq(locationHistory.deviceId, id));
  await db.delete(smsLogs).where(eq(smsLogs.deviceId, id));
  await db.delete(callLogs).where(eq(callLogs.deviceId, id));
  await db.delete(contacts).where(eq(contacts.deviceId, id));
  await db.delete(installedApps).where(eq(installedApps.deviceId, id));
  await db.delete(clipboardLogs).where(eq(clipboardLogs.deviceId, id));
  await db.delete(notificationLogs).where(eq(notificationLogs.deviceId, id));
  await db.delete(mediaFiles).where(eq(mediaFiles.deviceId, id));
  await db.delete(devicePermissions).where(eq(devicePermissions.deviceId, id));
  await db.delete(geofences).where(eq(geofences.deviceId, id));
  await db.delete(geofenceEvents).where(eq(geofenceEvents.deviceId, id));
  await db.delete(auditLogs).where(eq(auditLogs.deviceId, id));

  // Finally delete the device itself
  await db.delete(devices).where(eq(devices.id, id));
}

export async function updateUserRole(id: number, role: "admin" | "manager" | "user" | "viewer") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function createUser(user: { name: string; email: string; role: string; passwordHash?: string }): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const openId = `manual:${user.email}`;
  const values: InsertUser = {
    openId,
    name: user.name,
    email: user.email,
    role: user.role as any,
    loginMethod: "local",
    passwordHash: user.passwordHash ?? null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    isActive: true,
    lastSignedIn: new Date(),
  };

  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: {
      name: values.name,
      role: values.role,
      passwordHash: values.passwordHash,
      lastSignedIn: values.lastSignedIn,
      isActive: values.isActive,
    }
  });
  return await getUserByOpenId(openId);
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ 
    passwordHash,
    resetToken: null,
    resetTokenExpires: null 
  }).where(eq(users.id, id));
}

export async function setUserResetToken(email: string, token: string, expires: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ 
    resetToken: token, 
    resetTokenExpires: expires 
  }).where(eq(users.email, email));
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setUserEmailOtp(userId: number, otp: string, expires: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ 
    emailOtp: otp, 
    emailOtpExpires: expires 
  }).where(eq(users.id, userId));
}

export async function clearUserEmailOtp(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ 
    emailOtp: null, 
    emailOtpExpires: null 
  }).where(eq(users.id, userId));
}

/**
 * Permission queries
 */
export async function getPermissionByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(permissions).where(eq(permissions.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllPermissions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(permissions);
}

/**
 * Device queries
 */
export async function getDeviceById(deviceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDevicesByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(devices).where(eq(devices.ownerId, ownerId));
}

export async function getAllDevices() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(devices);
}

export async function registerDevice(device: { 
  deviceId: string; 
  deviceName: string; 
  manufacturer?: string; 
  model?: string; 
  androidVersion?: string; 
  ownerId: number 
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const values = {
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    manufacturer: device.manufacturer ?? null,
    model: device.model ?? null,
    androidVersion: device.androidVersion ?? null,
    ownerId: device.ownerId,
    status: "inactive" as const,
    lastSeen: new Date(),
  };

  await db.insert(devices).values(values as any).onDuplicateKeyUpdate({
    set: {
      deviceName: values.deviceName,
      lastSeen: values.lastSeen,
    }
  });
}

/**
 * Location history queries
 */
export async function getLatestLocationByDeviceId(deviceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(locationHistory)
    .where(eq(locationHistory.deviceId, deviceId))
    .orderBy(desc(locationHistory.timestamp))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Audit log queries
 */
export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(log as any);
}

export async function getAuditLogsByUserId(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

export async function getAuditLogsByDeviceId(deviceId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.deviceId, deviceId))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

export async function getAllAuditLogs(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

/**
 * Sends a command to a device by recording it in the audit log.
 * The device will poll these logs to see what actions to perform.
 */
export async function sendDeviceCommand(params: {
  deviceId: number;
  userId: number;
  action: string;
  details?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(auditLogs).values({
    deviceId: params.deviceId,
    userId: params.userId,
    action: params.action,
    actionType: "device_monitored", // Using device_monitored as a generic command type
    status: "pending",
    details: params.details || {},
    timestamp: new Date(),
  } as any);
}
