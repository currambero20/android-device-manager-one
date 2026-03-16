
import { router, protectedProcedure } from "../_core/trpc";
import { getDb, getAllDevices } from "../db";
import { TRPCError } from "@trpc/server";

/**
 * Devices Router
 * Provides basic device information for selection and monitoring tools.
 */
export const devicesRouter = router({
  /**
   * Get all devices that the user has access to.
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // If user is admin/manager, they can see all devices.
      // Otherwise, they might only see devices they own (if implementation logic exists).
      // For now, following the pattern in mapsRouter where admin/manager see all.
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
         // Return empty or filter by ownerId if needed
         return [];
      }

      const devicesList = await getAllDevices();
      return devicesList;
    } catch (error) {
      console.error("[Devices Router] Error fetching devices:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch devices",
      });
    }
  }),
});
