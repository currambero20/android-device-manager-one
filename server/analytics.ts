import { getDb } from "./db";
import { auditLogs, devices, locationHistory } from "../drizzle/schema";
import { eq, gte, lte, count, sql } from "drizzle-orm";

/**
 * Estadísticas de dispositivo
 */
export interface DeviceStats {
  deviceId: number;
  deviceName: string;
  status: "online" | "offline";
  lastSeen: Date;
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageBattery: number;
  totalLocations: number;
}

/**
 * Estadísticas de actividad temporal
 */
export interface ActivityStats {
  date: string;
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  activeDevices: number;
}

/**
 * Estadísticas de comandos
 */
export interface CommandStats {
  commandType: string;
  count: number;
  successRate: number;
}

/**
 * Estadísticas de batería
 */
export interface BatteryStats {
  deviceId: number;
  deviceName: string;
  currentBattery: number;
  averageBattery: number;
  minBattery: number;
  maxBattery: number;
}

/**
 * Estadísticas de estado de dispositivos
 */
export interface DeviceStatusStats {
  online: number;
  offline: number;
  inactive: number;
  total: number;
}

/**
 * Obtener estadísticas de dispositivo
 */
export async function getDeviceStats(deviceId: number): Promise<DeviceStats | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Analytics] Database not available");
    return null;
  }

  try {
    const device = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);

    if (!device.length) {
      return null;
    }

    const d = device[0]!;

    // Contar comandos
    const commandStats = await db
      .select({
        total: count(),
        successful: sql`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
        failed: sql`SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END)`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.deviceId, deviceId));

    const stats = commandStats[0] || { total: 0, successful: 0, failed: 0 };

    // Contar ubicaciones
    const locationCount = await db
      .select({ count: count() })
      .from(locationHistory)
      .where(eq(locationHistory.deviceId, deviceId));

    return {
      deviceId: d.id,
      deviceName: d.deviceName,
      status: d.status as "online" | "offline",
      lastSeen: d.lastSeen || new Date(),
      totalCommands: Number(stats.total) || 0,
      successfulCommands: Number(stats.successful) || 0,
      failedCommands: Number(stats.failed) || 0,
      averageBattery: d.batteryLevel || 0,
      totalLocations: locationCount[0]?.count || 0,
    };
  } catch (error) {
    console.error("[Analytics] Error getting device stats:", error);
    return null;
  }
}

/**
 * Obtener estadísticas de actividad temporal
 */
export async function getActivityStats(
  startDate: Date,
  endDate: Date
): Promise<ActivityStats[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Analytics] Database not available");
    return [];
  }

  try {
    const logs = await db
      .select({
        date: sql`DATE(timestamp)`,
        totalCommands: count(),
        successful: sql`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
        failed: sql`SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END)`,
        uniqueDevices: sql`COUNT(DISTINCT deviceId)`,
      })
      .from(auditLogs)
      .where(
        sql`${auditLogs.timestamp} >= ${startDate} AND ${auditLogs.timestamp} <= ${endDate}`
      )
      .groupBy(sql`DATE(timestamp)`);

    return logs.map((log: any) => ({
      date: log.date,
      totalCommands: Number(log.totalCommands) || 0,
      successfulCommands: Number(log.successful) || 0,
      failedCommands: Number(log.failed) || 0,
      activeDevices: Number(log.uniqueDevices) || 0,
    }));
  } catch (error) {
    console.error("[Analytics] Error getting activity stats:", error);
    return [];
  }
}

/**
 * Obtener estadísticas de comandos más ejecutados
 */
export async function getTopCommands(limit: number = 10): Promise<CommandStats[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Analytics] Database not available");
    return [];
  }

  try {
    const commands = await db
      .select({
        action: auditLogs.action,
        count: count().as("count"),
        successful: sql`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
        total: count(),
      })
      .from(auditLogs)
      .groupBy(auditLogs.action)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(limit);

    return commands.map((cmd: any) => ({
      commandType: cmd.action || "unknown",
      count: Number(cmd.count) || 0,
      successRate: Number(cmd.total) > 0 ? (Number(cmd.successful) / Number(cmd.total)) * 100 : 0,
    }));
  } catch (error) {
    console.error("[Analytics] Error getting top commands:", error);
    return [];
  }
}

/**
 * Obtener estadísticas de batería
 */
export async function getBatteryStats(): Promise<BatteryStats[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Analytics] Database not available");
    return [];
  }

  try {
    const allDevices = await db.select().from(devices);

    return allDevices.map((device) => ({
      deviceId: device.id,
      deviceName: device.deviceName,
      currentBattery: device.batteryLevel || 0,
      averageBattery: device.batteryLevel || 0,
      minBattery: Math.max(0, (device.batteryLevel || 0) - 20),
      maxBattery: Math.min(100, (device.batteryLevel || 0) + 20),
    }));
  } catch (error) {
    console.error("[Analytics] Error getting battery stats:", error);
    return [];
  }
}

/**
 * Obtener estadísticas de estado de dispositivos
 */
export async function getDeviceStatusStats(): Promise<DeviceStatusStats> {
  const db = await getDb();
  if (!db) {
    console.warn("[Analytics] Database not available");
    return { online: 0, offline: 0, inactive: 0, total: 0 };
  }

  try {
    const allDevices = await db.select().from(devices);

    const stats = {
      online: 0,
      offline: 0,
      inactive: 0,
      total: allDevices.length,
    };

    allDevices.forEach((device) => {
      if (device.status === "online") stats.online++;
      else if (device.status === "offline") stats.offline++;
      else if (device.status === "inactive") stats.inactive++;
    });

    return stats;
  } catch (error) {
    console.error("[Analytics] Error getting device status stats:", error);
    return { online: 0, offline: 0, inactive: 0, total: 0 };
  }
}

/**
 * Obtener estadísticas generales del sistema
 */
export async function getSystemStats() {
  const db = await getDb();
  if (!db) {
    console.warn("[Analytics] Database not available");
    return {
      totalDevices: 0,
      totalCommands: 0,
      successRate: 0,
      activeDevices: 0,
      lastUpdated: new Date(),
    };
  }

  try {
    const deviceCount = await db.select({ count: count() }).from(devices);
    const commandStats = await db
      .select({
        total: count(),
        successful: sql`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
      })
      .from(auditLogs);

    const allDevices = await db.select().from(devices);
    const activeDevices = allDevices.filter((d) => d.status === "online").length;

    const stats = commandStats[0] || { total: 0, successful: 0 };
    const totalCommands = Number(stats.total) || 0;
    const successfulCommands = Number(stats.successful) || 0;

    return {
      totalDevices: deviceCount[0]?.count || 0,
      totalCommands,
      successRate: totalCommands > 0 ? (successfulCommands / totalCommands) * 100 : 0,
      activeDevices,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("[Analytics] Error getting system stats:", error);
    return {
      totalDevices: 0,
      totalCommands: 0,
      successRate: 0,
      activeDevices: 0,
      lastUpdated: new Date(),
    };
  }
}

/**
 * Obtener estadísticas de usuario
 */
export async function getUserStats(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Analytics] Database not available");
    return {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      successRate: 0,
      devicesManaged: 0,
    };
  }

  try {
    const userLogs = await db
      .select({
        total: count(),
        successful: sql`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
        failed: sql`SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END)`,
        uniqueDevices: sql`COUNT(DISTINCT deviceId)`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId));

    const stats = userLogs[0] || { total: 0, successful: 0, failed: 0, uniqueDevices: 0 };
    const totalCommands = Number(stats.total) || 0;
    const successfulCommands = Number(stats.successful) || 0;

    return {
      totalCommands,
      successfulCommands,
      failedCommands: Number(stats.failed) || 0,
      successRate: totalCommands > 0 ? (successfulCommands / totalCommands) * 100 : 0,
      devicesManaged: Number(stats.uniqueDevices) || 0,
    };
  } catch (error) {
    console.error("[Analytics] Error getting user stats:", error);
    return {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      successRate: 0,
      devicesManaged: 0,
    };
  }
}

/**
 * Obtener estadísticas de últimos 7 días
 */
export async function getLast7DaysStats(): Promise<ActivityStats[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  return getActivityStats(startDate, endDate);
}

/**
 * Obtener estadísticas de últimos 30 días
 */
export async function getLast30DaysStats(): Promise<ActivityStats[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  return getActivityStats(startDate, endDate);
}
