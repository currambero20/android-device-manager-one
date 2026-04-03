
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
   * Alias for getMyDevices to match frontend usage in some tabs.
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const { getDevicesByOwnerId, getAllDevices } = await import("../db");
      if (ctx.user.role === "admin" || ctx.user.role === "manager") {
         return await getAllDevices();
      }
      return await getDevicesByOwnerId(ctx.user.id);
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch devices" });
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
        
        return { success: true, deviceId: input.deviceId };
      } catch (error) {
        console.error("[Devices Router] Error removing device:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove device",
        });
      }
    }),

  /**
   * Send a remote command to a device.
   */
  sendCommand: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      command: z.string(),
      payload: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { sendDeviceCommand } = await import("../db");
        await sendDeviceCommand({
          deviceId: input.deviceId,
          userId: ctx.user.id,
          action: input.command,
          details: input.payload,
        });

        // [PLATINUM FIX] Emit the command in real-time via WebSocket
        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          console.log(`[WebSocket] Emitting command '${input.command}' to device ${input.deviceId}`);
          wsManager.broadcastToDevice(input.deviceId, "execute-command", {
            action: input.command,
            payload: input.payload || {}
          });
        } else {
          console.warn(`[WebSocket] Warning: wsManager not available to send command ${input.command}`);
        }

        return { success: true };
      } catch (error) {
        console.error("[Devices Router] Error sending command:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send command to device",
        });
      }
    }),

  /**
   * Request an immediate status refresh from the device.
   */
  refreshStatus: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input }) => {
      const { getWebSocketManager } = await import("../websocket");
      const wsManager = getWebSocketManager();
      if (wsManager) {
        console.log(`[WebSocket] Triggering manual refresh for device ${input.deviceId}`);
        // Request basic status + location
        wsManager.broadcastToDevice(input.deviceId, "execute-command", { action: "get-status" });
        wsManager.broadcastToDevice(input.deviceId, "execute-command", { action: "get-location" });
        return { success: true };
      }
      return { success: false, message: "WS Manager offline" };
    }),
});
