import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getAllAuditLogs, getAuditLogsByDeviceId } from "../db";

export const auditLogsRouter = router({
  getAll: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      return await getAllAuditLogs(input.limit);
    }),

  getByDevice: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      return await getAuditLogsByDeviceId(input.deviceId, input.limit);
    }),

  deleteAll: adminProcedure
    .mutation(async () => {
      try {
        const db = await import("../db");
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { auditLogs } = await import("../../drizzle/schema");
          await dbInstance.delete(auditLogs);
          return { success: true };
        }
        return { success: false, error: "Database not available" };
      } catch (error) {
        console.error("Failed to delete audit logs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudieron eliminar los registros de auditoría",
        });
      }
    }),
});
