import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getDeviceStats,
  getActivityStats,
  getTopCommands,
  getBatteryStats,
  getDeviceStatusStats,
  getSystemStats,
  getUserStats,
  getLast7DaysStats,
  getLast30DaysStats,
} from "../analytics";

export const analyticsRouter = router({
  /**
   * Obtener estadísticas de dispositivo
   */
  getDeviceStats: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const stats = await getDeviceStats(input.deviceId);

        if (!stats) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Device not found",
          });
        }

        return stats;
      } catch (error) {
        console.error("[Analytics Router] Device stats error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get device statistics",
        });
      }
    }),

  /**
   * Obtener estadísticas de actividad
   */
  getActivityStats: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const stats = await getActivityStats(input.startDate, input.endDate);
        return stats;
      } catch (error) {
        console.error("[Analytics Router] Activity stats error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get activity statistics",
        });
      }
    }),

  /**
   * Obtener comandos más ejecutados
   */
  getTopCommands: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      try {
        const commands = await getTopCommands(input.limit);
        return commands;
      } catch (error) {
        console.error("[Analytics Router] Top commands error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top commands",
        });
      }
    }),

  /**
   * Obtener estadísticas de batería
   */
  getBatteryStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await getBatteryStats();
      return stats;
    } catch (error) {
      console.error("[Analytics Router] Battery stats error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get battery statistics",
      });
    }
  }),

  /**
   * Obtener estadísticas de estado de dispositivos
   */
  getDeviceStatusStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await getDeviceStatusStats();
      return stats;
    } catch (error) {
      console.error("[Analytics Router] Device status stats error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get device status statistics",
      });
    }
  }),

  /**
   * Obtener estadísticas del sistema
   */
  getSystemStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await getSystemStats();
      return stats;
    } catch (error) {
      console.error("[Analytics Router] System stats error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get system statistics",
      });
    }
  }),

  /**
   * Obtener estadísticas de usuario
   */
  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await getUserStats(ctx.user.id);
      return stats;
    } catch (error) {
      console.error("[Analytics Router] User stats error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get user statistics",
      });
    }
  }),

  /**
   * Obtener estadísticas de últimos 7 días
   */
  getLast7Days: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await getLast7DaysStats();
      return stats;
    } catch (error) {
      console.error("[Analytics Router] Last 7 days error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get last 7 days statistics",
      });
    }
  }),

  /**
   * Obtener estadísticas de últimos 30 días
   */
  getLast30Days: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await getLast30DaysStats();
      return stats;
    } catch (error) {
      console.error("[Analytics Router] Last 30 days error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get last 30 days statistics",
      });
    }
  }),

  /**
   * Obtener dashboard completo
   */
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    try {
      const [systemStats, deviceStatusStats, topCommands, batteryStats, last7Days] =
        await Promise.all([
          getSystemStats(),
          getDeviceStatusStats(),
          getTopCommands(5),
          getBatteryStats(),
          getLast7DaysStats(),
        ]);

      return {
        systemStats,
        deviceStatusStats,
        topCommands,
        batteryStats,
        activityLast7Days: last7Days,
      };
    } catch (error) {
      console.error("[Analytics Router] Dashboard error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get dashboard data",
      });
    }
  }),
});

export type AnalyticsRouter = typeof analyticsRouter;
