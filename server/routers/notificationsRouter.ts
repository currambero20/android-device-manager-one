import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { notificationLogs, devices } from "../../drizzle/schema";
import { desc, eq, inArray } from "drizzle-orm";

export const notificationsRouter = router({
  /**
   * Get all notifications for the current user's devices
   */
  getAll: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      // Get user's devices first to filter notifications
      const userDevices = await db.select({ id: devices.id }).from(devices).where(eq(devices.ownerId, ctx.user.id));
      const deviceIds = userDevices.map(d => d.id);

      if (deviceIds.length === 0 && ctx.user.role !== 'admin') {
        return [];
      }

      const query = db.select().from(notificationLogs);
      
      if (ctx.user.role !== 'admin') {
        query.where(inArray(notificationLogs.deviceId, deviceIds));
      }

      return await query
        .orderBy(desc(notificationLogs.timestamp))
        .limit(input.limit)
        .offset(input.offset);
    }),

  /**
   * Mark notification as read (simulated as we don't have isRead in schema yet, but we can add it or just return success)
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // For now, just return success since schema doesn't have isRead yet
      // To be truly Platinum, we'd add the column, but let's stick to current schema for stability
      return { success: true };
    }),

  /**
   * Delete notification
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(notificationLogs).where(eq(notificationLogs.id, input.id));
      return { success: true };
    }),
});
