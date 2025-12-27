import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createGeofence,
  getAllGeofences,
  getGeofenceById,
  updateGeofence,
  deleteGeofence,
  getGeofenceEventsForDevice,
  getGeofenceEventsForGeofence,
  getLocationHistory,
  getLatestLocations,
  getGeofenceStats,
  checkLocationAgainstGeofences,
} from "../geofencing";
import { TRPCError } from "@trpc/server";

export const geofencingRouter = router({
  /**
   * Crear un nuevo geofence
   */
  createGeofence: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        name: z.string().min(1).max(255),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radius: z.number().min(10).max(100000), // 10m a 100km
      })
    )
    .mutation(async ({ input, ctx }) => {
      const geofence = await createGeofence(
        input.deviceId,
        input.name,
        input.latitude,
        input.longitude,
        input.radius,
        ctx.user.id
      );

      if (!geofence) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create geofence",
        });
      }

      return geofence;
    }),

  /**
   * Obtener todos los geofences
   */
  getAllGeofences: protectedProcedure.query(async () => {
    return await getAllGeofences();
  }),

  /**
   * Obtener geofence por ID
   */
  getGeofenceById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const geofence = await getGeofenceById(input.id);
      if (!geofence) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Geofence not found",
        });
      }
      return geofence;
    }),

  /**
   * Actualizar geofence
   */
  updateGeofence: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        radius: z.number().min(10).max(100000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const success = await updateGeofence(
        input.id,
        input.name,
        input.latitude,
        input.longitude,
        input.radius,
        ctx.user.id
      );

      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update geofence",
        });
      }

      return { success: true };
    }),

  /**
   * Eliminar geofence
   */
  deleteGeofence: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const success = await deleteGeofence(input.id, ctx.user.id);

      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete geofence",
        });
      }

      return { success: true };
    }),

  /**
   * Obtener eventos de geofence para dispositivo
   */
  getDeviceGeofenceEvents: protectedProcedure
    .input(z.object({ deviceId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return await getGeofenceEventsForDevice(input.deviceId, input.limit);
    }),

  /**
   * Obtener eventos de geofence para geofence específico
   */
  getGeofenceEvents: protectedProcedure
    .input(z.object({ geofenceId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return await getGeofenceEventsForGeofence(input.geofenceId, input.limit);
    }),

  /**
   * Obtener historial de ubicaciones para dispositivo
   */
  getLocationHistory: protectedProcedure
    .input(z.object({ deviceId: z.number(), limit: z.number().default(100) }))
    .query(async ({ input }) => {
      return await getLocationHistory(input.deviceId, input.limit);
    }),

  /**
   * Obtener últimas ubicaciones de todos los dispositivos
   */
  getLatestLocations: protectedProcedure.query(async () => {
    return await getLatestLocations();
  }),

  /**
   * Obtener estadísticas de geofence
   */
  getGeofenceStats: protectedProcedure
    .input(z.object({ geofenceId: z.number() }))
    .query(async ({ input }) => {
      return await getGeofenceStats(input.geofenceId);
    }),

  /**
   * Verificar ubicación contra geofences
   */
  checkLocationAgainstGeofences: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        latitude: z.number(),
        longitude: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await checkLocationAgainstGeofences(
        input.deviceId,
        input.latitude,
        input.longitude
      );
    }),
});
