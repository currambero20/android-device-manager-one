import { nanoid } from "nanoid";
import { getDb } from "./db";
import { auditLogs } from "../drizzle/schema";

/**
 * Tipos de comandos remotos
 */
export enum RemoteCommandType {
  SCREENSHOT = "screenshot",
  LOCK_DEVICE = "lock_device",
  UNLOCK_DEVICE = "unlock_device",
  WIPE_DATA = "wipe_data",
  SHELL_COMMAND = "shell_command",
  REBOOT = "reboot",
  FACTORY_RESET = "factory_reset",
  UNINSTALL_APP = "uninstall_app",
  INSTALL_APP = "install_app",
  SEND_SMS = "send_sms",
  MAKE_CALL = "make_call",
  RING_ALARM = "ring_alarm",
  DISABLE_WIFI = "disable_wifi",
  ENABLE_WIFI = "enable_wifi",
  DISABLE_BLUETOOTH = "disable_bluetooth",
  ENABLE_BLUETOOTH = "enable_bluetooth",
  ENABLE_AIRPLANE_MODE = "enable_airplane_mode",
  DISABLE_AIRPLANE_MODE = "disable_airplane_mode",
}

/**
 * Estado de ejecución de comando
 */
export enum CommandStatus {
  PENDING = "pending",
  SENT = "sent",
  EXECUTING = "executing",
  SUCCESS = "success",
  FAILED = "failed",
  TIMEOUT = "timeout",
  CANCELLED = "cancelled",
}

/**
 * Interfaz de comando remoto
 */
export interface RemoteCommand {
  commandId: string;
  deviceId: number;
  userId: number;
  type: RemoteCommandType;
  status: CommandStatus;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  priority: "low" | "normal" | "high" | "critical";
  requiresConfirmation: boolean;
}

/**
 * Cola de comandos en memoria
 */
class CommandQueue {
  private commands: Map<string, RemoteCommand> = new Map();
  private deviceQueues: Map<number, string[]> = new Map();

  /**
   * Agregar comando a la cola
   */
  enqueue(command: RemoteCommand): void {
    this.commands.set(command.commandId, command);

    if (!this.deviceQueues.has(command.deviceId)) {
      this.deviceQueues.set(command.deviceId, []);
    }

    this.deviceQueues.get(command.deviceId)!.push(command.commandId);
    console.log(`[Remote Control] Command enqueued: ${command.commandId}`);
  }

  /**
   * Limpiar toda la cola
   */
  clear(): void {
    this.commands.clear();
    this.deviceQueues.clear();
  }

  /**
   * Obtener siguiente comando para dispositivo
   */
  dequeue(deviceId: number): RemoteCommand | undefined {
    const queue = this.deviceQueues.get(deviceId);
    if (!queue || queue.length === 0) {
      return undefined;
    }

    const commandId = queue.shift()!;
    const command = this.commands.get(commandId);

    if (command) {
      command.status = CommandStatus.SENT;
      command.executedAt = new Date();
    }

    return command;
  }

  /**
   * Obtener comando por ID
   */
  getCommand(commandId: string): RemoteCommand | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Actualizar estado de comando
   */
  updateCommand(commandId: string, updates: Partial<RemoteCommand>): void {
    const command = this.commands.get(commandId);
    if (command) {
      Object.assign(command, updates);
      console.log(`[Remote Control] Command updated: ${commandId} -> ${updates.status}`);
    }
  }

  /**
   * Obtener cola de dispositivo
   */
  getDeviceQueue(deviceId: number): RemoteCommand[] {
    const queue = this.deviceQueues.get(deviceId) || [];
    return queue.map((id) => this.commands.get(id)!).filter(Boolean);
  }

  /**
   * Limpiar comandos expirados
   */
  cleanup(): void {
    const now = new Date();
    let cleaned = 0;

    this.commands.forEach((command, commandId) => {
      if (command.expiresAt < now) {
        this.commands.delete(commandId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`[Remote Control] Cleaned up ${cleaned} expired commands`);
    }
  }

  /**
   * Obtener estadísticas
   */
  getStats(): {
    totalCommands: number;
    pendingCommands: number;
    successfulCommands: number;
    failedCommands: number;
  } {
    let pending = 0;
    let successful = 0;
    let failed = 0;

    this.commands.forEach((command) => {
      if (command.status === CommandStatus.PENDING || command.status === CommandStatus.SENT) {
        pending++;
      } else if (command.status === CommandStatus.SUCCESS) {
        successful++;
      } else if (
        command.status === CommandStatus.FAILED ||
        command.status === CommandStatus.TIMEOUT
      ) {
        failed++;
      }
    });

    return {
      totalCommands: this.commands.size,
      pendingCommands: pending,
      successfulCommands: successful,
      failedCommands: failed,
    };
  }
}

// Global command queue
export const commandQueue = new CommandQueue();

/**
 * Crear comando remoto
 */
export function createRemoteCommand(
  deviceId: number,
  userId: number,
  type: RemoteCommandType,
  payload?: Record<string, unknown>,
  priority: "low" | "normal" | "high" | "critical" = "normal"
): RemoteCommand {
  const commandId = nanoid();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Expira en 24 horas

  const command: RemoteCommand = {
    commandId,
    deviceId,
    userId,
    type,
    status: CommandStatus.PENDING,
    payload,
    createdAt: new Date(),
    expiresAt,
    priority,
    requiresConfirmation: isDangerousCommand(type),
  };

  return command;
}

/**
 * Verificar si comando es peligroso
 */
export function isDangerousCommand(type: RemoteCommandType): boolean {
  const dangerousCommands = [
    RemoteCommandType.WIPE_DATA,
    RemoteCommandType.FACTORY_RESET,
    RemoteCommandType.REBOOT,
  ];

  return dangerousCommands.includes(type);
}

/**
 * Obtener descripción de comando
 */
export function getCommandDescription(type: RemoteCommandType): string {
  const descriptions: Record<RemoteCommandType, string> = {
    [RemoteCommandType.SCREENSHOT]: "Capturar pantalla del dispositivo",
    [RemoteCommandType.LOCK_DEVICE]: "Bloquear dispositivo",
    [RemoteCommandType.UNLOCK_DEVICE]: "Desbloquear dispositivo",
    [RemoteCommandType.WIPE_DATA]: "Borrar todos los datos del dispositivo",
    [RemoteCommandType.SHELL_COMMAND]: "Ejecutar comando shell",
    [RemoteCommandType.REBOOT]: "Reiniciar dispositivo",
    [RemoteCommandType.FACTORY_RESET]: "Restaurar a configuración de fábrica",
    [RemoteCommandType.UNINSTALL_APP]: "Desinstalar aplicación",
    [RemoteCommandType.INSTALL_APP]: "Instalar aplicación",
    [RemoteCommandType.SEND_SMS]: "Enviar SMS",
    [RemoteCommandType.MAKE_CALL]: "Realizar llamada",
    [RemoteCommandType.RING_ALARM]: "Sonar alarma",
    [RemoteCommandType.DISABLE_WIFI]: "Desactivar WiFi",
    [RemoteCommandType.ENABLE_WIFI]: "Activar WiFi",
    [RemoteCommandType.DISABLE_BLUETOOTH]: "Desactivar Bluetooth",
    [RemoteCommandType.ENABLE_BLUETOOTH]: "Activar Bluetooth",
    [RemoteCommandType.ENABLE_AIRPLANE_MODE]: "Activar modo avión",
    [RemoteCommandType.DISABLE_AIRPLANE_MODE]: "Desactivar modo avión",
  };

  return descriptions[type] || "Comando desconocido";
}

/**
 * Registrar comando en auditoría
 */
export async function logRemoteCommand(
  userId: number,
  deviceId: number,
  commandType: RemoteCommandType,
  status: "success" | "failure",
  details?: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Remote Control] Database not available for logging");
    return;
  }

  try {
    await db.insert(auditLogs).values({
      userId,
      deviceId,
      action: `remote_command_${commandType}`,
      actionType: "security_event",
      resourceType: "device",
      resourceId: String(deviceId),
      status,
      details,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("[Remote Control] Failed to log command:", error);
  }
}

/**
 * Validar comando
 */
export function validateCommand(
  type: RemoteCommandType,
  payload?: Record<string, unknown>
): { valid: boolean; error?: string } {
  switch (type) {
    case RemoteCommandType.SHELL_COMMAND:
      if (!payload?.command || typeof payload.command !== "string") {
        return { valid: false, error: "Command text is required" };
      }
      if (payload.command.length > 1000) {
        return { valid: false, error: "Command text is too long" };
      }
      break;

    case RemoteCommandType.SEND_SMS:
      if (!payload?.phoneNumber || typeof payload.phoneNumber !== "string") {
        return { valid: false, error: "Phone number is required" };
      }
      if (!payload?.message || typeof payload.message !== "string") {
        return { valid: false, error: "Message is required" };
      }
      if (payload.message.length > 160) {
        return { valid: false, error: "Message is too long" };
      }
      break;

    case RemoteCommandType.MAKE_CALL:
      if (!payload?.phoneNumber || typeof payload.phoneNumber !== "string") {
        return { valid: false, error: "Phone number is required" };
      }
      break;

    case RemoteCommandType.UNINSTALL_APP:
      if (!payload?.packageName || typeof payload.packageName !== "string") {
        return { valid: false, error: "Package name is required" };
      }
      break;

    case RemoteCommandType.INSTALL_APP:
      if (!payload?.apkUrl || typeof payload.apkUrl !== "string") {
        return { valid: false, error: "APK URL is required" };
      }
      break;

    case RemoteCommandType.RING_ALARM:
      if (payload?.duration && typeof payload.duration !== "number") {
        return { valid: false, error: "Duration must be a number" };
      }
      if (payload?.duration && (Number(payload.duration) < 1 || Number(payload.duration) > 300)) {
        return { valid: false, error: "Duration must be between 1 and 300 seconds" };
      }
      break;
  }

  return { valid: true };
}

/**
 * Obtener comandos pendientes para dispositivo
 */
export function getPendingCommands(deviceId: number): RemoteCommand[] {
  return commandQueue.getDeviceQueue(deviceId);
}

/**
 * Cancelar comando
 */
export function cancelCommand(commandId: string): boolean {
  const command = commandQueue.getCommand(commandId);
  if (!command) {
    return false;
  }

  if (command.status === CommandStatus.PENDING || command.status === CommandStatus.SENT) {
    commandQueue.updateCommand(commandId, {
      status: CommandStatus.CANCELLED,
      completedAt: new Date(),
    });
    return true;
  }

  return false;
}

/**
 * Limpiar cola de comandos periódicamente
 */
setInterval(() => {
  commandQueue.cleanup();
}, 60 * 1000); // Cada minuto
