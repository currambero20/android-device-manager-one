import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  permissions,
  userPermissions,
  devices,
  locationHistory,
  auditLogs,
  InsertAuditLog,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
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
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
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
 * User permissions queries
 */
export async function getUserPermissions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
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
  await db.insert(auditLogs).values(log);
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
