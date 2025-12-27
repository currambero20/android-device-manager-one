import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { locationHistory, geofences, devices } from "../../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * Google Maps Router
 * Gestiona visualización de dispositivos, rutas e historial de ubicaciones en mapa
 */
export const mapsRouter = router({
  /**
   * Obtener ubicaciones actuales de todos los dispositivos
   */
  getCurrentDeviceLocations: protectedProcedure
    .input(
      z.object({
        deviceIds: z.array(z.number()).optional(),
        includeOffline: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para acceder a ubicaciones",
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        // Obtener últimas ubicaciones
        const locations = await (db as any).query.locationHistory.findMany({
          orderBy: (table: any) => table.timestamp,
          limit: 1000,
        });

        // Agrupar por dispositivo (última ubicación)
        const latestByDevice = new Map();
        locations.forEach((loc: any) => {
          if (!latestByDevice.has(loc.deviceId)) {
            latestByDevice.set(loc.deviceId, loc);
          }
        });

        // Filtrar si se especifican dispositivos
        let filtered = Array.from(latestByDevice.values());
        if (input.deviceIds && input.deviceIds.length > 0) {
          filtered = filtered.filter((loc: any) =>
            input.deviceIds!.includes(loc.deviceId)
          );
        }

        return {
          devices: filtered.map((loc: any) => ({
            id: loc.id,
            deviceId: loc.deviceId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            timestamp: loc.timestamp,
            speed: loc.speed,
            bearing: loc.bearing,
          })),
          total: filtered.length,
        };
      } catch (error) {
        console.error("[Maps] Error getting device locations:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener ubicaciones de dispositivos",
        });
      }
    }),

  /**
   * Obtener historial de ruta de un dispositivo
   */
  getDeviceRouteHistory: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().default(500),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para acceder a historial de rutas",
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        // Construir condiciones de búsqueda
        const whereConditions = [eq(locationHistory.deviceId, input.deviceId)];

        if (input.startDate) {
          whereConditions.push(gte(locationHistory.timestamp, input.startDate));
        }

        if (input.endDate) {
          whereConditions.push(lte(locationHistory.timestamp, input.endDate));
        }

        // Obtener historial
        const history = await (db as any).query.locationHistory.findMany({
          where: and(...whereConditions),
          limit: input.limit,
          orderBy: (table: any) => table.timestamp,
        });

        // Calcular distancia total recorrida
        let totalDistance = 0;
        for (let i = 1; i < history.length; i++) {
          const prev = history[i - 1];
          const curr = history[i];
          totalDistance += calculateDistance(
            prev.latitude,
            prev.longitude,
            curr.latitude,
            curr.longitude
          );
        }

        return {
          route: history.map((loc: any) => ({
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            timestamp: loc.timestamp,
            speed: loc.speed,
            bearing: loc.bearing,
          })),
          totalDistance: Math.round(totalDistance * 100) / 100, // km
          pointCount: history.length,
          startTime: history.length > 0 ? history[0].timestamp : null,
          endTime: history.length > 0 ? history[history.length - 1].timestamp : null,
        };
      } catch (error) {
        console.error("[Maps] Error getting route history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener historial de ruta",
        });
      }
    }),

  /**
   * Obtener todos los geofences para visualización en mapa
   */
  getGeofencesForMap: protectedProcedure
    .input(
      z.object({
        deviceIds: z.array(z.number()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para acceder a geofences",
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        // Obtener geofences
        let whereConditions = [];
        if (input.deviceIds && input.deviceIds.length > 0) {
          whereConditions = [
            // Filtrar por dispositivos si se especifican
          ];
        }

        const allGeofences = await (db as any).query.geofences.findMany();

        return {
          geofences: allGeofences.map((gf: any) => ({
            id: gf.id,
            name: gf.name,
            latitude: gf.latitude,
            longitude: gf.longitude,
            radius: gf.radius,
            type: gf.type,
            color: getGeofenceColor(gf.type),
          })),
          total: allGeofences.length,
        };
      } catch (error) {
        console.error("[Maps] Error getting geofences:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener geofences",
        });
      }
    }),

  /**
   * Obtener eventos de geofence para un dispositivo
   */
  getGeofenceEvents: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para acceder a eventos de geofence",
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        // Obtener eventos de geofence
        const events = await (db as any).query.geofenceEvents.findMany({
          limit: input.limit,
          orderBy: (table: any) => table.timestamp,
        });

        return {
          events: events.map((evt: any) => ({
            id: evt.id,
            deviceId: evt.deviceId,
            geofenceId: evt.geofenceId,
            eventType: evt.eventType,
            latitude: evt.latitude,
            longitude: evt.longitude,
            timestamp: evt.timestamp,
          })),
          total: events.length,
        };
      } catch (error) {
        console.error("[Maps] Error getting geofence events:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener eventos de geofence",
        });
      }
    }),

  /**
   * Obtener estadísticas de ubicación de un dispositivo
   */
  getLocationStats: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para acceder a estadísticas",
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        // Obtener todas las ubicaciones
        const locations = await (db as any).query.locationHistory.findMany({
          where: eq(locationHistory.deviceId, input.deviceId),
        });

        // Calcular estadísticas
        let totalDistance = 0;
        let maxSpeed = 0;
        let avgSpeed = 0;
        const speeds: number[] = [];

        for (let i = 1; i < locations.length; i++) {
          const prev = locations[i - 1];
          const curr = locations[i];
          totalDistance += calculateDistance(
            prev.latitude,
            prev.longitude,
            curr.latitude,
            curr.longitude
          );

          if (curr.speed) {
            speeds.push(curr.speed);
            maxSpeed = Math.max(maxSpeed, curr.speed);
          }
        }

        if (speeds.length > 0) {
          avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        }

        return {
          totalDistance: Math.round(totalDistance * 100) / 100,
          maxSpeed: Math.round(maxSpeed * 100) / 100,
          avgSpeed: Math.round(avgSpeed * 100) / 100,
          pointCount: locations.length,
          lastUpdate: locations.length > 0 ? locations[locations.length - 1].timestamp : null,
        };
      } catch (error) {
        console.error("[Maps] Error getting location stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener estadísticas de ubicación",
        });
      }
    }),

  /**
   * Crear nuevo geofence
   */
  createGeofence: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        radius: z.number(),
        type: z.enum(["alert", "safe", "restricted"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden crear geofences",
          });
        }

        // Simular creación de geofence
        return {
          success: true,
          geofenceId: Math.floor(Math.random() * 10000),
          name: input.name,
          latitude: input.latitude,
          longitude: input.longitude,
          radius: input.radius,
          type: input.type,
          createdAt: new Date(),
        };
      } catch (error) {
        console.error("[Maps] Error creating geofence:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al crear geofence",
        });
      }
    }),

  /**
   * Eliminar geofence
   */
  deleteGeofence: protectedProcedure
    .input(z.object({ geofenceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden eliminar geofences",
          });
        }

        // Simular eliminación
        return {
          success: true,
          geofenceId: input.geofenceId,
          deletedAt: new Date(),
        };
      } catch (error) {
        console.error("[Maps] Error deleting geofence:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al eliminar geofence",
        });
      }
    }),
});

/**
 * Calcular distancia entre dos coordenadas (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
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
 * Obtener color para geofence según tipo
 */
function getGeofenceColor(type: string): string {
  const colors: Record<string, string> = {
    alert: "#ff6b6b", // Rojo
    safe: "#51cf66", // Verde
    restricted: "#ffd43b", // Amarillo
  };
  return colors[type] || "#808080";
}
