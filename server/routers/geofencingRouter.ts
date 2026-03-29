import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  geofences,
  geofenceEvents,
  locationHistory,
} from "../../drizzle/schema";

export const geofencingRouter = router({
  // ---------- GEOFENCES ----------
  getGeofences: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db
        .select()
        .from(geofences)
        .where(eq(geofences.deviceId, input.deviceId))
        .orderBy(desc(geofences.createdAt));
    }),

  getAllGeofences: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      
      if (ctx.user.role === "admin" || ctx.user.role === "manager") {
         return await db.select().from(geofences).orderBy(desc(geofences.createdAt));
      }
      
      const { getDevicesByOwnerId } = await import("../db");
      const myDevices = await getDevicesByOwnerId(ctx.user.id);
      const myDeviceIds = myDevices.map(d => d.id);
      if (myDeviceIds.length === 0) return [];
      
      const { inArray } = await import("drizzle-orm");
      return await db.select().from(geofences)
        .where(inArray(geofences.deviceId, myDeviceIds))
        .orderBy(desc(geofences.createdAt));
    }),

  createGeofence: adminProcedure
    .input(
      z.object({
        deviceId: z.number(),
        name: z.string().min(1),
        latitude: z.string(),
        longitude: z.string(),
        radius: z.string(),
        alertOnEntry: z.boolean().default(true),
        alertOnExit: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.insert(geofences).values({
        deviceId: input.deviceId,
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        radius: input.radius,
        alertOnEntry: input.alertOnEntry,
        alertOnExit: input.alertOnExit,
        isActive: true,
      });

      // [PLATINUM FIX] Real-time sync to device
      const { getWebSocketManager } = await import("../websocket");
      const wsManager = getWebSocketManager();
      if (wsManager) {
        console.log(`[WebSocket] Syncing new geofence to device ${input.deviceId}`);
        wsManager.broadcastToDevice(input.deviceId, "execute-command", {
          action: "sync-geofences",
          payload: {}
        });
      }

      return { success: true };
    }),

  toggleGeofence: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      
      // Get device ID first to notify it
      const geofence = await db.select().from(geofences).where(eq(geofences.id, input.id)).limit(1);
      
      await db
        .update(geofences)
        .set({ isActive: input.isActive })
        .where(eq(geofences.id, input.id));

      if (geofence.length > 0) {
        // [PLATINUM FIX] Real-time sync to device
        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          console.log(`[WebSocket] Syncing toggled geofence to device ${geofence[0].deviceId}`);
          wsManager.broadcastToDevice(geofence[0].deviceId, "execute-command", {
            action: "sync-geofences",
            payload: {}
          });
        }
      }

      return { success: true };
    }),

  deleteGeofence: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      // Get device ID first to notify it
      const geofence = await db.select().from(geofences).where(eq(geofences.id, input.id)).limit(1);

      await db.delete(geofences).where(eq(geofences.id, input.id));

      if (geofence.length > 0) {
        // [PLATINUM FIX] Real-time sync to device
        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          console.log(`[WebSocket] Syncing deleted geofence to device ${geofence[0].deviceId}`);
          wsManager.broadcastToDevice(geofence[0].deviceId, "execute-command", {
            action: "sync-geofences",
            payload: {}
          });
        }
      }

      return { success: true };
    }),

  // ---------- GPS HISTORY ----------
  getLocationHistory: protectedProcedure
    .input(z.object({ deviceId: z.number(), limit: z.number().default(100) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db
        .select()
        .from(locationHistory)
        .where(eq(locationHistory.deviceId, input.deviceId))
        .orderBy(desc(locationHistory.timestamp))
        .limit(input.limit);
    }),

  getLatestLocation: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(locationHistory)
        .where(eq(locationHistory.deviceId, input.deviceId))
        .orderBy(desc(locationHistory.timestamp))
        .limit(1);
      return result[0] ?? null;
    }),

  getGeofenceEvents: protectedProcedure
    .input(z.object({ geofenceId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db
        .select()
        .from(geofenceEvents)
        .where(eq(geofenceEvents.geofenceId, input.geofenceId))
        .orderBy(desc(geofenceEvents.recordedAt))
        .limit(input.limit);
    }),

  pushLocation: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        latitude: z.string(),
        longitude: z.string(),
        accuracy: z.string().optional(),
        altitude: z.string().optional(),
        speed: z.string().optional(),
        bearing: z.string().optional(),
        provider: z.string().optional(),
        address: z.string().optional(),
        timestamp: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.insert(locationHistory).values({
        deviceId: input.deviceId,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy ?? null,
        altitude: input.altitude ?? null,
        speed: input.speed ?? null,
        bearing: input.bearing ?? null,
        provider: input.provider ?? null,
        address: input.address ?? null,
        timestamp: new Date(input.timestamp),
      });
      return { success: true };
    }),
});
