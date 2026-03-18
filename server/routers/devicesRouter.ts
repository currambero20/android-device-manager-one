
import { router, protectedProcedure } from "../_core/trpc";
import { getDb, getAllDevices } from "../db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Devices Router
 * Provides basic device information for selection and monitoring tools.
 */
export const devicesRouter = router({
  /**
   * Get all devices that the user has access to.
   */
  getMyDevices: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // If user is admin/manager, they can see all devices.
      // Otherwise, filtered by owner.
      const { getDevicesByOwnerId, getAllDevices } = await import("../db");
      if (ctx.user.role === "admin" || ctx.user.role === "manager") {
         return await getAllDevices();
      }
      return await getDevicesByOwnerId(ctx.user.id);
    } catch (error) {
      console.error("[Devices Router] Error fetching devices:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch devices",
      });
    }
  }),

  /**
   * Register a new device.
   */
  register: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      deviceName: z.string(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      androidVersion: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { registerDevice } = await import("../db");
        await registerDevice({
          ...input,
          ownerId: ctx.user.id,
        });
        return { success: true };
      } catch (error) {
        console.error("[Devices Router] Error registering device:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to register device",
        });
      }
    }),

  /**
   * Remove a device by ID.
   */
  remove: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Simple security: Admin or Manager only (or owner logic)
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { deleteDevice } = await import("../db");
        await deleteDevice(input.deviceId);
        
        return { success: true };
      } catch (error) {
        console.error("[Devices Router] Error removing device:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove device",
        });
      }
    }),
});
