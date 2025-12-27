import { getDb } from "./db";
import { geofences, geofenceEvents, locationHistory } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { createAuditLog } from "./db";

/**
 * Estructura de geofence
 */
export interface Geofence {
  id: number;
  deviceId: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  radius: string | null;
  isActive: boolean;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Estructura de evento de geofence
 */
export interface GeofenceEvent {
  id: number;
  geofenceId: number;
  deviceId: number;
  eventType: "entry" | "exit";
  timestamp: Date;
  latitude: string | null;
  longitude: string | null;
  recordedAt: Date;
}

/**
 * Estructura de ubicación con distancia a geofence
 */
export interface LocationWithGeofence {
  deviceId: number;
  latitude: number;
  longitude: number;
  timestamp: Date;
  geofenceId?: number;
  insideGeofence: boolean;
  distanceToGeofence?: number;
}

/**
 * Calcular distancia entre dos coordenadas (Haversine)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radio de la tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Verificar si una ubicación está dentro de un geofence
 */
export function isInsideGeofence(
  latitude: number,
  longitude: number,
  geofence: Geofence
): boolean {
  if (!geofence.latitude || !geofence.longitude || !geofence.radius) {
    return false;
  }
  const distance = calculateDistance(
    latitude,
    longitude,
    Number(geofence.latitude),
    Number(geofence.longitude)
  );
  return distance <= Number(geofence.radius);
}

/**
 * Crear un nuevo geofence
 */
export async function createGeofence(
  deviceId: number,
  name: string,
  latitude: number,
  longitude: number,
  radius: number,
  userId: number
): Promise<Geofence | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Geofencing] Database not available");
    return null;
  }

  try {
    const result = await db.insert(geofences).values({
      deviceId,
      name,
      latitude: String(latitude),
      longitude: String(longitude),
      radius: String(radius),
      isActive: true,
      alertOnEntry: true,
      alertOnExit: true,
    });

    await createAuditLog({
      userId,
      action: "geofence_created",
      actionType: "device_added" as any,
      resourceType: "geofence",
      details: { name, latitude, longitude, radius },
      status: "success",
    });

    // Retornar el geofence creado
    return {
      id: 0, // ID será asignado por la base de datos
      deviceId,
      name,
      latitude: String(latitude),
      longitude: String(longitude),
      radius: String(radius),
      isActive: true,
      alertOnEntry: true,
      alertOnExit: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error("[Geofencing] Error creating geofence:", error);
    return null;
  }
}

/**
 * Obtener todos los geofences
 */
export async function getAllGeofences(): Promise<Geofence[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Geofencing] Database not available");
    return [];
  }

  try {
    const result = await db.select().from(geofences);
    return result;
  } catch (error) {
    console.error("[Geofencing] Error getting geofences:", error);
    return [];
  }
}

/**
 * Obtener geofence por ID
 */
export async function getGeofenceById(id: number): Promise<Geofence | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Geofencing] Database not available");
    return null;
  }

  try {
    const result = await db.select().from(geofences).where(eq(geofences.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Geofencing] Error getting geofence:", error);
    return null;
  }
}

/**
 * Actualizar geofence
 */
export async function updateGeofence(
  id: number,
  name?: string,
  latitude?: number,
  longitude?: number,
  radius?: number,
  userId?: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Geofencing] Database not available");
    return false;
  }

  try {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (radius !== undefined) updateData.radius = radius;

    await db.update(geofences).set(updateData).where(eq(geofences.id, id));

    if (userId) {
      await createAuditLog({
        userId,
        action: "geofence_updated",
        actionType: "settings_changed" as any,
        resourceType: "geofence",
        resourceId: String(id),
        details: updateData,
        status: "success",
      });
    }

    return true;
  } catch (error) {
    console.error("[Geofencing] Error updating geofence:", error);
    return false;
  }
}

/**
 * Eliminar geofence
 */
export async function deleteGeofence(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Geofencing] Database not available");
    return false;
  }

  try {
    await db.delete(geofences).where(eq(geofences.id, id));

    await createAuditLog({
      userId,
      action: "geofence_deleted",
      actionType: "device_removed" as any,
      resourceType: "geofence",
      resourceId: String(id),
      status: "success",
    });

    return true;
  } catch (error) {
    console.error("[Geofencing] Error deleting geofence:", error);
    return false;
  }
}

/**
 * Registrar evento de geofence
 */
export async function recordGeofenceEvent(
  geofenceId: number,
  deviceId: number,
  eventType: "entry" | "exit",
  latitude: number,
  longitude: number
): Promise<GeofenceEvent | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Geofencing] Database not available");
    return null;
  }

  try {
    const result = await db.insert(geofenceEvents).values({
      geofenceId,
      deviceId,
      eventType: eventType as "entry" | "exit",
      latitude: String(latitude),
      longitude: String(longitude),
      timestamp: new Date(),
    });

    console.log(`[Geofencing] Event recorded: Device ${deviceId} ${eventType} geofence ${geofenceId}`);

    return {
      id: 0, // ID será asignado por la base de datos
      geofenceId,
      deviceId,
      eventType,
      timestamp: new Date(),
      latitude: String(latitude),
      longitude: String(longitude),
      recordedAt: new Date(),
    };
  } catch (error) {
    console.error("[Geofencing] Error recording geofence event:", error);
    return null;
  }
}

/**
 * Obtener historial de eventos de geofence para dispositivo
 */
export async function getGeofenceEventsForDevice(
  deviceId: number,
  limit: number = 50
): Promise<GeofenceEvent[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Geofencing] Database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(geofenceEvents)
      .where(eq(geofenceEvents.deviceId, deviceId))
      .orderBy(sql`${geofenceEvents.timestamp} DESC`)
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Geofencing] Error getting geofence events:", error);
    return [];
  }
}

/**
 * Obtener historial de eventos de geofence para geofence
 */
export async function getGeofenceEventsForGeofence(
  geofenceId: number,
  limit: number = 50
): Promise<GeofenceEvent[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Geofencing] Database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(geofenceEvents)
      .where(eq(geofenceEvents.geofenceId, geofenceId))
      .orderBy(sql`${geofenceEvents.timestamp} DESC`)
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Geofencing] Error getting geofence events:", error);
    return [];
  }
}

/**
 * Verificar ubicación actual contra todos los geofences
 */
export async function checkLocationAgainstGeofences(
  deviceId: number,
  latitude: number,
  longitude: number
): Promise<LocationWithGeofence[]> {
  const geofencesList = await getAllGeofences();

  return geofencesList.map((geofence) => {
    if (!geofence.latitude || !geofence.longitude || !geofence.radius) {
      return {
        deviceId,
        latitude,
        longitude,
        timestamp: new Date(),
        geofenceId: geofence.id,
        insideGeofence: false,
        distanceToGeofence: undefined,
      };
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      Number(geofence.latitude),
      Number(geofence.longitude)
    );
    const insideGeofence = distance <= Number(geofence.radius);

    return {
      deviceId,
      latitude,
      longitude,
      timestamp: new Date(),
      geofenceId: geofence.id,
      insideGeofence,
      distanceToGeofence: distance,
    };
  });
}

/**
 * Obtener historial de ubicaciones para dispositivo
 */
export async function getLocationHistory(
  deviceId: number,
  limit: number = 100
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Geofencing] Database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(locationHistory)
      .where(eq(locationHistory.deviceId, deviceId))
      .orderBy(sql`${locationHistory.timestamp} DESC`)
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Geofencing] Error getting location history:", error);
    return [];
  }
}

/**
 * Obtener últimas ubicaciones de todos los dispositivos
 */
export async function getLatestLocations(): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Geofencing] Database not available");
    return [];
  }

  try {
    // Obtener la última ubicación de cada dispositivo
    const result = await db
      .select({
        deviceId: locationHistory.deviceId,
        latitude: locationHistory.latitude,
        longitude: locationHistory.longitude,
        timestamp: locationHistory.timestamp,
        accuracy: locationHistory.accuracy,
      })
      .from(locationHistory)
      .orderBy(sql`${locationHistory.deviceId}, ${locationHistory.timestamp} DESC`)
      .limit(1000); // Suficiente para todos los dispositivos

    // Filtrar para obtener solo la última ubicación por dispositivo
    const latestByDevice = new Map();
    result.forEach((loc: any) => {
      if (!latestByDevice.has(loc.deviceId)) {
        latestByDevice.set(loc.deviceId, loc);
      }
    });

    return Array.from(latestByDevice.values());
  } catch (error) {
    console.error("[Geofencing] Error getting latest locations:", error);
    return [];
  }
}

/**
 * Obtener estadísticas de geofence
 */
export async function getGeofenceStats(geofenceId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Geofencing] Database not available");
    return {
      totalEvents: 0,
      enterEvents: 0,
      exitEvents: 0,
      uniqueDevices: 0,
      lastEvent: null,
    };
  }

  try {
    const events = await db
      .select({
        total: sql`COUNT(*)`,
        enters: sql`SUM(CASE WHEN eventType = 'enter' THEN 1 ELSE 0 END)`,
        exits: sql`SUM(CASE WHEN eventType = 'exit' THEN 1 ELSE 0 END)`,
        uniqueDevices: sql`COUNT(DISTINCT deviceId)`,
      })
      .from(geofenceEvents)
      .where(eq(geofenceEvents.geofenceId, geofenceId));

    const lastEventResult = await db
      .select()
      .from(geofenceEvents)
      .where(eq(geofenceEvents.geofenceId, geofenceId))
      .orderBy(sql`${geofenceEvents.timestamp} DESC`)
      .limit(1);

    const stats = events[0] || { total: 0, enters: 0, exits: 0, uniqueDevices: 0 };

    return {
      totalEvents: Number(stats.total) || 0,
      enterEvents: Number(stats.enters) || 0,
      exitEvents: Number(stats.exits) || 0,
      uniqueDevices: Number(stats.uniqueDevices) || 0,
      lastEvent: lastEventResult.length > 0 ? lastEventResult[0] : null,
    };
  } catch (error) {
    console.error("[Geofencing] Error getting geofence stats:", error);
    return {
      totalEvents: 0,
      enterEvents: 0,
      exitEvents: 0,
      uniqueDevices: 0,
      lastEvent: null,
    };
  }
}
