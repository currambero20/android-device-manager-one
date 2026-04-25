import { describe, it, expect, beforeEach } from "vitest";
import {
  createRemoteCommand,
  commandQueue,
  RemoteCommandType,
  CommandStatus,
  isDangerousCommand,
  getCommandDescription,
  validateCommand,
  cancelCommand,
  getPendingCommands,
} from "./remoteControl";

describe("Remote Control", () => {
  beforeEach(() => {
    commandQueue.clear();
  });

  describe("Command creation", () => {
    it("should create a remote command", () => {
      const command = createRemoteCommand(
        1,
        1,
        RemoteCommandType.SCREENSHOT,
        undefined,
        "normal"
      );

      expect(command).toBeDefined();
      expect(command.commandId).toBeDefined();
      expect(command.deviceId).toBe(1);
      expect(command.userId).toBe(1);
      expect(command.type).toBe(RemoteCommandType.SCREENSHOT);
      expect(command.status).toBe(CommandStatus.PENDING);
      expect(command.priority).toBe("normal");
    });

    it("should generate unique command IDs", () => {
      const cmd1 = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);
      const cmd2 = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);

      expect(cmd1.commandId).not.toBe(cmd2.commandId);
    });

    it("should set expiration to 24 hours", () => {
      const command = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);
      const now = new Date();
      const expiresIn = command.expiresAt.getTime() - now.getTime();

      expect(expiresIn).toBeGreaterThan(24 * 60 * 60 * 1000 - 1000);
      expect(expiresIn).toBeLessThan(24 * 60 * 60 * 1000 + 1000);
    });

    it("should mark dangerous commands as requiring confirmation", () => {
      const safeCmd = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);
      const dangerousCmd = createRemoteCommand(1, 1, RemoteCommandType.WIPE_DATA);

      expect(safeCmd.requiresConfirmation).toBe(false);
      expect(dangerousCmd.requiresConfirmation).toBe(true);
    });
  });

  describe("Dangerous commands", () => {
    it("should identify dangerous commands", () => {
      expect(isDangerousCommand(RemoteCommandType.WIPE_DATA)).toBe(true);
      expect(isDangerousCommand(RemoteCommandType.FACTORY_RESET)).toBe(true);
      expect(isDangerousCommand(RemoteCommandType.REBOOT)).toBe(true);
    });

    it("should identify safe commands", () => {
      expect(isDangerousCommand(RemoteCommandType.SCREENSHOT)).toBe(false);
      expect(isDangerousCommand(RemoteCommandType.LOCK_DEVICE)).toBe(false);
      expect(isDangerousCommand(RemoteCommandType.RING_ALARM)).toBe(false);
    });
  });

  describe("Command descriptions", () => {
    it("should provide descriptions for all commands", () => {
      const types = Object.values(RemoteCommandType);

      types.forEach((type) => {
        const description = getCommandDescription(type);
        expect(description).toBeDefined();
        expect(description.length).toBeGreaterThan(0);
      });
    });

    it("should return specific descriptions", () => {
      expect(getCommandDescription(RemoteCommandType.SCREENSHOT)).toContain("pantalla");
      expect(getCommandDescription(RemoteCommandType.LOCK_DEVICE)).toContain("Bloquear");
      expect(getCommandDescription(RemoteCommandType.WIPE_DATA)).toContain("Borrar");
    });
  });

  describe("Command validation", () => {
    it("should validate shell commands", () => {
      const valid = validateCommand(RemoteCommandType.SHELL_COMMAND, {
        command: "ls -la",
      });
      expect(valid.valid).toBe(true);

      const invalid = validateCommand(RemoteCommandType.SHELL_COMMAND, {});
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toBeDefined();
    });

    it("should validate SMS commands", () => {
      const valid = validateCommand(RemoteCommandType.SEND_SMS, {
        phoneNumber: "+1234567890",
        message: "Hello",
      });
      expect(valid.valid).toBe(true);

      const invalidPhone = validateCommand(RemoteCommandType.SEND_SMS, {
        message: "Hello",
      });
      expect(invalidPhone.valid).toBe(false);

      const invalidMessage = validateCommand(RemoteCommandType.SEND_SMS, {
        phoneNumber: "+1234567890",
      });
      expect(invalidMessage.valid).toBe(false);
    });

    it("should validate call commands", () => {
      const valid = validateCommand(RemoteCommandType.MAKE_CALL, {
        phoneNumber: "+1234567890",
      });
      expect(valid.valid).toBe(true);

      const invalid = validateCommand(RemoteCommandType.MAKE_CALL, {});
      expect(invalid.valid).toBe(false);
    });

    it("should validate app uninstall commands", () => {
      const valid = validateCommand(RemoteCommandType.UNINSTALL_APP, {
        packageName: "com.example.app",
      });
      expect(valid.valid).toBe(true);

      const invalid = validateCommand(RemoteCommandType.UNINSTALL_APP, {});
      expect(invalid.valid).toBe(false);
    });

    it("should validate ring alarm duration", () => {
      const valid = validateCommand(RemoteCommandType.RING_ALARM, {
        duration: 30,
      });
      expect(valid.valid).toBe(true);

      const tooLong = validateCommand(RemoteCommandType.RING_ALARM, {
        duration: 400,
      });
      expect(tooLong.valid).toBe(false);

      const invalid = validateCommand(RemoteCommandType.RING_ALARM, {
        duration: "invalid",
      });
      expect(invalid.valid).toBe(false);
    });
  });

  describe("Command queue", () => {
    it("should enqueue commands", () => {
      const command = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);
      commandQueue.enqueue(command);

      const retrieved = commandQueue.getCommand(command.commandId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.commandId).toBe(command.commandId);
    });

    it("should dequeue commands in order", () => {
      const cmd1 = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);
      const cmd2 = createRemoteCommand(1, 1, RemoteCommandType.LOCK_DEVICE);

      commandQueue.enqueue(cmd1);
      commandQueue.enqueue(cmd2);

      const dequeued1 = commandQueue.dequeue(1);
      expect(dequeued1?.commandId).toBe(cmd1.commandId);
      expect(dequeued1?.status).toBe(CommandStatus.SENT);

      const dequeued2 = commandQueue.dequeue(1);
      expect(dequeued2?.commandId).toBe(cmd2.commandId);
    });

    it("should return undefined when queue is empty", () => {
      const dequeued = commandQueue.dequeue(999);
      expect(dequeued).toBeUndefined();
    });

    it("should get device queue", () => {
      const cmd1 = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);
      const cmd2 = createRemoteCommand(1, 1, RemoteCommandType.LOCK_DEVICE);
      const cmd3 = createRemoteCommand(2, 1, RemoteCommandType.SCREENSHOT);

      commandQueue.enqueue(cmd1);
      commandQueue.enqueue(cmd2);
      commandQueue.enqueue(cmd3);

      const queue1 = commandQueue.getDeviceQueue(1);
      const queue2 = commandQueue.getDeviceQueue(2);

      expect(queue1.length).toBe(2);
      expect(queue2.length).toBe(1);
    });

    it("should update command status", () => {
      const command = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);
      commandQueue.enqueue(command);

      commandQueue.updateCommand(command.commandId, {
        status: CommandStatus.SUCCESS,
        result: { path: "/screenshot.png" },
      });

      const updated = commandQueue.getCommand(command.commandId);
      expect(updated?.status).toBe(CommandStatus.SUCCESS);
      expect(updated?.result).toEqual({ path: "/screenshot.png" });
    });

    it("should get statistics", () => {
      const cmd1 = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);
      const cmd2 = createRemoteCommand(1, 1, RemoteCommandType.LOCK_DEVICE);

      commandQueue.enqueue(cmd1);
      commandQueue.enqueue(cmd2);

      commandQueue.updateCommand(cmd1.commandId, { status: CommandStatus.SUCCESS });

      const stats = commandQueue.getStats();
      expect(stats.totalCommands).toBe(2);
      expect(stats.pendingCommands).toBe(1);
      expect(stats.successfulCommands).toBe(1);
      expect(stats.failedCommands).toBe(0);
    });
  });

  describe("Command cancellation", () => {
    it("should cancel pending commands", () => {
      const command = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);
      commandQueue.enqueue(command);

      const cancelled = cancelCommand(command.commandId);
      expect(cancelled).toBe(true);

      const updated = commandQueue.getCommand(command.commandId);
      expect(updated?.status).toBe(CommandStatus.CANCELLED);
    });

    it("should not cancel executed commands", () => {
      const command = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);
      commandQueue.enqueue(command);
      commandQueue.updateCommand(command.commandId, { status: CommandStatus.SUCCESS });

      const cancelled = cancelCommand(command.commandId);
      expect(cancelled).toBe(false);
    });

    it("should return false for non-existent commands", () => {
      const cancelled = cancelCommand("non-existent");
      expect(cancelled).toBe(false);
    });
  });

  describe("Pending commands", () => {
    it("should get pending commands for device", () => {
      const cmd1 = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT);
      const cmd2 = createRemoteCommand(1, 1, RemoteCommandType.LOCK_DEVICE);

      commandQueue.enqueue(cmd1);
      commandQueue.enqueue(cmd2);

      const pending = getPendingCommands(1);
      expect(pending.length).toBe(2);
    });

    it("should return empty array for device with no commands", () => {
      const pending = getPendingCommands(999);
      expect(pending.length).toBe(0);
    });
  });

  describe("Command priorities", () => {
    it("should support different priorities", () => {
      const low = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT, undefined, "low");
      const normal = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT, undefined, "normal");
      const high = createRemoteCommand(1, 1, RemoteCommandType.SCREENSHOT, undefined, "high");
      const critical = createRemoteCommand(
        1,
        1,
        RemoteCommandType.SCREENSHOT,
        undefined,
        "critical"
      );

      expect(low.priority).toBe("low");
      expect(normal.priority).toBe("normal");
      expect(high.priority).toBe("high");
      expect(critical.priority).toBe("critical");
    });
  });
});
