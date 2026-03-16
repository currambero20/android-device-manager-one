import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getAllAuditLogs } from "../db";

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
});
