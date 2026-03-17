import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
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

let _pool: mysql.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;
let _migrationLog: string[] = [];

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // PlanetScale requires explicit SSL configuration when using createPool
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: true
        },
        connectionLimit: 10,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });
      _db = drizzle(_pool);
    } catch (error: any) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function runMigrations() {
  const db = await getDb();
  if (!db) {
    _migrationLog.push("Database not available for migrations");
    return;
  }
  
  const repairs = [
    { name: "passwordHash", sql: "ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255)" },
    { name: "twoFactorEnabled", sql: "ALTER TABLE `users` ADD COLUMN `twoFactorEnabled` boolean DEFAULT false NOT NULL" },
    { name: "twoFactorSecret", sql: "ALTER TABLE `users` ADD COLUMN `twoFactorSecret` varchar(255)" },
    { name: "isActive", sql: "ALTER TABLE `users` ADD COLUMN `isActive` boolean DEFAULT true NOT NULL" },
    { name: "role_enum", sql: "ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','manager','user','viewer') NOT NULL DEFAULT 'viewer'" }
  ];

  _migrationLog = [];
  console.log("[Database] Starting manual schema repair...");
  
  for (const repair of repairs) {
    try {
      await db.execute(sql.raw(repair.sql));
      _migrationLog.push(`SUCCESS: ${repair.name}`);
    } catch (error: any) {
      const msg = error.message ? error.message.toLowerCase() : "";
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        _migrationLog.push(`EXISTS: ${repair.name}`);
      } else {
        const fullErr = error.cause ? String(error.cause) : JSON.stringify(error, Object.getOwnPropertyNames(error));
        _migrationLog.push(`FAILED: ${repair.name} (${error.message}) -> ${fullErr}`);
      }
    }
  }
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

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.lastSignedIn));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, id));
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
    lastSignedIn: new Date(),
  };

  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: {
      name: values.name,
      role: values.role,
      passwordHash: values.passwordHash,
      lastSignedIn: values.lastSignedIn
    }
  });
  return await getUserByOpenId(openId);
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
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

export async function getAllAuditLogs(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}
