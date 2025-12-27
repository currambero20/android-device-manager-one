import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createRemoteCommand,
  commandQueue,
  RemoteCommandType,
  isDangerousCommand,
  getCommandDescription,
  validateCommand,
  logRemoteCommand,
  cancelCommand,
  getPendingCommands,
} from "../remoteControl";

export const remoteControlRouter = router({
  /**
   * Enviar comando remoto a dispositivo
   */
  sendCommand: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        commandType: z.string(),
        payload: z.object({}).passthrough().optional(),
        priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Validar comando
        const validation = validateCommand(input.commandType as RemoteCommandType, input.payload);
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.error || "Invalid command",
          });
        }

        // Crear comando
        const command = createRemoteCommand(
          input.deviceId,
          ctx.user.id,
          input.commandType as RemoteCommandType,
          input.payload,
          input.priority
        );

        // Agregar a cola
        commandQueue.enqueue(command);

        // Registrar en auditoría
        const commandTypeEnum = input.commandType as RemoteCommandType;
        await logRemoteCommand(
          ctx.user.id,
          input.deviceId,
          commandTypeEnum,
          "success" as const,
          {
            commandId: command.commandId,
            priority: input.priority,
          }
        );

        return {
          success: true,
          commandId: command.commandId,
          message: `Command sent: ${getCommandDescription(commandTypeEnum)}`,
          requiresConfirmation: isDangerousCommand(commandTypeEnum),
        };
      } catch (error) {
        console.error("[Remote Control Router] Send command error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send command",
        });
      }
    }),

  /**
   * Obtener estado de comando
   */
  getCommandStatus: protectedProcedure
    .input(z.object({ commandId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const command = commandQueue.getCommand(input.commandId);

        if (!command) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Command not found",
          });
        }

        // Verificar acceso
        if (command.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }

        return {
          commandId: command.commandId,
          type: command.type,
          status: command.status,
          priority: command.priority,
          createdAt: command.createdAt,
          executedAt: command.executedAt,
          completedAt: command.completedAt,
          result: command.result,
          error: command.error,
        };
      } catch (error) {
        console.error("[Remote Control Router] Status error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get command status",
        });
      }
    }),

  /**
   * Obtener comandos pendientes para dispositivo
   */
  getPendingCommands: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        // TODO: Verificar acceso al dispositivo
        const commands = getPendingCommands(input.deviceId);

        return commands.map((cmd) => ({
          commandId: cmd.commandId,
          type: cmd.type,
          payload: cmd.payload,
          priority: cmd.priority,
          createdAt: cmd.createdAt,
        }));
      } catch (error) {
        console.error("[Remote Control Router] Pending commands error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get pending commands",
        });
      }
    }),

  /**
   * Cancelar comando
   */
  cancelCommand: protectedProcedure
    .input(z.object({ commandId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const command = commandQueue.getCommand(input.commandId);

        if (!command) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Command not found",
          });
        }

        // Verificar acceso
        if (command.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }

        const cancelled = cancelCommand(input.commandId);

        if (!cancelled) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Command cannot be cancelled",
          });
        }

        return {
          success: true,
          message: "Command cancelled",
        };
      } catch (error) {
        console.error("[Remote Control Router] Cancel error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel command",
        });
      }
    }),

  /**
   * Obtener estadísticas de comandos
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = commandQueue.getStats();

      return {
        totalCommands: stats.totalCommands,
        pendingCommands: stats.pendingCommands,
        successfulCommands: stats.successfulCommands,
        failedCommands: stats.failedCommands,
      };
    } catch (error) {
      console.error("[Remote Control Router] Stats error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get statistics",
      });
    }
  }),

  /**
   * Obtener descripción de comando
   */
  getCommandDescription: protectedProcedure
    .input(z.object({ commandType: z.string() }))
    .query(async ({ input }) => {
      return {
        description: getCommandDescription(input.commandType as RemoteCommandType),
        isDangerous: isDangerousCommand(input.commandType as RemoteCommandType),
      };
    }),

  /**
   * Listar tipos de comandos disponibles
   */
  listCommandTypes: protectedProcedure.query(async ({ ctx }) => {
    try {
      const commands = Object.values(RemoteCommandType).map((type) => ({
        type: type as RemoteCommandType,
        description: getCommandDescription(type as RemoteCommandType),
        isDangerous: isDangerousCommand(type as RemoteCommandType),
      }));

      return commands;
    } catch (error) {
      console.error("[Remote Control Router] List commands error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list commands",
      });
    }
  }),

  /**
   * Confirmar comando peligroso
   */
  confirmDangerousCommand: protectedProcedure
    .input(
      z.object({
        commandId: z.string(),
        confirmationCode: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const command = commandQueue.getCommand(input.commandId);

        if (!command) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Command not found",
          });
        }

        // Verificar acceso
        if (command.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }

        // TODO: Verificar código de confirmación
        // Por ahora, solo marcar como confirmado

        return {
          success: true,
          message: "Command confirmed",
        };
      } catch (error) {
        console.error("[Remote Control Router] Confirm error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to confirm command",
        });
      }
    }),

  /**
   * Obtener historial de comandos
   */
  getCommandHistory: protectedProcedure
    .input(
      z.object({
        deviceId: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // TODO: Obtener historial de comandos desde base de datos
        // Por ahora, retornar lista vacía
        return [];
      } catch (error) {
        console.error("[Remote Control Router] History error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get command history",
        });
      }
    }),
});

export type RemoteControlRouter = typeof remoteControlRouter;
