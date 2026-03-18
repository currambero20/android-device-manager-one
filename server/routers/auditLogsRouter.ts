import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
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
});
