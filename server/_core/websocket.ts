import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
// Función para verificar token JWT
function verifyToken(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Tipos de eventos WebSocket
 */
export enum WebSocketEvent {
  // Ubicaciones
  LOCATION_UPDATE = "location:update",
  LOCATION_HISTORY = "location:history",
  DEVICE_MOVED = "device:moved",

  // Permisos
  PERMISSION_CHANGED = "permission:changed",
  PERMISSIONS_SYNC = "permissions:sync",
  PERMISSION_GRANTED = "permission:granted",
  PERMISSION_REVOKED = "permission:revoked",

  // Aplicaciones
  APP_INSTALLED = "app:installed",
  APP_UNINSTALLED = "app:uninstalled",
  APP_LAUNCHED = "app:launched",
  APP_STOPPED = "app:stopped",
  APP_STATE_CHANGED = "app:state_changed",
  APPS_SYNC = "apps:sync",

  // Archivos
  FILE_CREATED = "file:created",
  FILE_DELETED = "file:deleted",
  FILE_MODIFIED = "file:modified",
  FILES_SYNC = "files:sync",

  // Geofences
  GEOFENCE_ENTER = "geofence:enter",
  GEOFENCE_EXIT = "geofence:exit",
  GEOFENCE_CREATED = "geofence:created",
  GEOFENCE_DELETED = "geofence:deleted",
  GEOFENCE_ALERT = "geofence:alert",

  // Sistema
  USER_CONNECTED = "user:connected",
  USER_DISCONNECTED = "user:disconnected",
  DEVICE_ONLINE = "device:online",
  DEVICE_OFFLINE = "device:offline",
  SYNC_REQUEST = "sync:request",
  SYNC_RESPONSE = "sync:response",
}

/**
 * Interfaz para usuario conectado
 */
export interface ConnectedUser {
  userId: number;
  socketId: string;
  deviceIds: number[];
  connectedAt: Date;
  lastActivity: Date;
  role: string;
}

/**
 * Interfaz para evento de ubicación
 */
export interface LocationUpdateEvent {
  deviceId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
}

/**
 * Interfaz para evento de permiso
 */
export interface PermissionChangeEvent {
  userId: number;
  deviceId: number;
  permissionCode: string;
  action: "granted" | "revoked";
  changedBy: number;
  timestamp: Date;
}

/**
 * Interfaz para evento de aplicación
 */
export interface AppStateChangeEvent {
  deviceId: number;
  appPackage: string;
  appName: string;
  action: "installed" | "uninstalled" | "launched" | "stopped";
  timestamp: Date;
}

/**
 * Interfaz para evento de archivo
 */
export interface FileChangeEvent {
  deviceId: number;
  filePath: string;
  fileName: string;
  action: "created" | "deleted" | "modified";
  fileSize?: number;
  timestamp: Date;
}

/**
 * Interfaz para evento de geofence
 */
export interface GeofenceEvent {
  deviceId: number;
  geofenceId: number;
  geofenceName: string;
  action: "enter" | "exit";
  latitude: number;
  longitude: number;
  timestamp: Date;
}

/**
 * Gestor de WebSocket
 */
export class WebSocketManager {
  private io: SocketIOServer;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private userSockets: Map<number, Set<string>> = new Map();
  private deviceSockets: Map<number, Set<string>> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        credentials: true,
      },
      transports: ["websocket", "polling"],
    } as any);

    this.setupMiddleware();
    this.setupConnectionHandlers();
  }

  /**
   * Configurar middleware de autenticación
   */
  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error("No authentication token provided"));
        }

        const decoded = verifyToken(token);
        if (!decoded || typeof decoded === "string") {
          return next(new Error("Invalid token"));
        }

        socket.data.userId = decoded.sub;
        socket.data.role = decoded.role || "user";
        next();
      } catch (error) {
        console.error("[WebSocket] Auth error:", error);
        next(new Error("Authentication failed"));
      }
    });
  }

  /**
   * Configurar manejadores de conexión
   */
  private setupConnectionHandlers() {
    this.io.on("connection", (socket: Socket) => {
      const userId = socket.data.userId;
      const role = socket.data.role;

      console.log(`[WebSocket] User ${userId} connected with socket ${socket.id}`);

      // Registrar usuario conectado
      const connectedUser: ConnectedUser = {
        userId,
        socketId: socket.id,
        deviceIds: [],
        connectedAt: new Date(),
        lastActivity: new Date(),
        role,
      };

      this.connectedUsers.set(socket.id, connectedUser);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Broadcast de usuario conectado
      this.io.emit(WebSocketEvent.USER_CONNECTED, {
        userId,
        socketId: socket.id,
        timestamp: new Date(),
      });

      // Manejadores de eventos
      socket.on("subscribe:devices", (deviceIds: number[]) => {
        this.handleSubscribeDevices(socket, userId, deviceIds);
      });

      socket.on("unsubscribe:devices", (deviceIds: number[]) => {
        this.handleUnsubscribeDevices(socket, userId, deviceIds);
      });

      socket.on("disconnect", () => {
        this.handleDisconnect(socket, userId);
      });

      socket.on("error", (error) => {
        console.error(`[WebSocket] Socket error for user ${userId}:`, error);
      });
    });
  }

  /**
   * Manejar suscripción a dispositivos
   */
  private handleSubscribeDevices(socket: Socket, userId: number, deviceIds: number[]) {
    const connectedUser = this.connectedUsers.get(socket.id);
    if (connectedUser) {
      connectedUser.deviceIds = deviceIds;
    }

    for (const deviceId of deviceIds) {
      if (!this.deviceSockets.has(deviceId)) {
        this.deviceSockets.set(deviceId, new Set());
      }
      this.deviceSockets.get(deviceId)!.add(socket.id);

      // Unirse a sala de dispositivo
      socket.join(`device:${deviceId}`);
    }

    console.log(`[WebSocket] User ${userId} subscribed to devices:`, deviceIds);
  }

  /**
   * Manejar desuscripción de dispositivos
   */
  private handleUnsubscribeDevices(socket: Socket, userId: number, deviceIds: number[]) {
    const connectedUser = this.connectedUsers.get(socket.id);
    if (connectedUser) {
      connectedUser.deviceIds = connectedUser.deviceIds.filter((id) => !deviceIds.includes(id));
    }

    for (const deviceId of deviceIds) {
      this.deviceSockets.get(deviceId)?.delete(socket.id);
      socket.leave(`device:${deviceId}`);
    }

    console.log(`[WebSocket] User ${userId} unsubscribed from devices:`, deviceIds);
  }

  /**
   * Manejar desconexión
   */
  private handleDisconnect(socket: Socket, userId: number) {
    const connectedUser = this.connectedUsers.get(socket.id);

    if (connectedUser) {
      // Remover de dispositivos
      for (const deviceId of connectedUser.deviceIds) {
        this.deviceSockets.get(deviceId)?.delete(socket.id);
      }
    }

    this.connectedUsers.delete(socket.id);
    this.userSockets.get(userId)?.delete(socket.id);

    // Broadcast de usuario desconectado
    this.io.emit(WebSocketEvent.USER_DISCONNECTED, {
      userId,
      socketId: socket.id,
      timestamp: new Date(),
    });

    console.log(`[WebSocket] User ${userId} disconnected`);
  }

  /**
   * Emitir actualización de ubicación
   */
  public broadcastLocationUpdate(event: LocationUpdateEvent) {
    const room = `device:${event.deviceId}`;
    this.io.to(room).emit(WebSocketEvent.LOCATION_UPDATE, event);
    console.log(`[WebSocket] Location update for device ${event.deviceId}`);
  }

  /**
   * Emitir cambio de permiso
   */
  public broadcastPermissionChange(event: PermissionChangeEvent) {
    // Notificar a todos los usuarios conectados
    this.io.emit(WebSocketEvent.PERMISSION_CHANGED, event);

    // Notificar específicamente al usuario afectado
    const userSockets = this.userSockets.get(event.userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        this.io.to(socketId).emit(WebSocketEvent.PERMISSION_GRANTED, event);
      });
    }

    console.log(
      `[WebSocket] Permission ${event.action} for user ${event.userId} on device ${event.deviceId}`
    );
  }

  /**
   * Emitir cambio de estado de aplicación
   */
  public broadcastAppStateChange(event: AppStateChangeEvent) {
    const room = `device:${event.deviceId}`;
    this.io.to(room).emit(WebSocketEvent.APP_STATE_CHANGED, event);
    console.log(`[WebSocket] App ${event.action}: ${event.appName} on device ${event.deviceId}`);
  }

  /**
   * Emitir cambio de archivo
   */
  public broadcastFileChange(event: FileChangeEvent) {
    const room = `device:${event.deviceId}`;
    this.io.to(room).emit(WebSocketEvent.FILE_MODIFIED, event);
    console.log(`[WebSocket] File ${event.action}: ${event.filePath} on device ${event.deviceId}`);
  }

  /**
   * Emitir evento de geofence
   */
  public broadcastGeofenceEvent(event: GeofenceEvent) {
    const room = `device:${event.deviceId}`;
    this.io.to(room).emit(WebSocketEvent.GEOFENCE_ALERT, event);

    // También emitir a todos los usuarios (para alertas críticas)
    this.io.emit(WebSocketEvent.GEOFENCE_ALERT, event);

    console.log(
      `[WebSocket] Geofence ${event.action}: ${event.geofenceName} for device ${event.deviceId}`
    );
  }

  /**
   * Solicitar sincronización
   */
  public requestSync(userId: number, syncType: string, data?: any) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        this.io.to(socketId).emit(WebSocketEvent.SYNC_REQUEST, {
          type: syncType,
          data,
          timestamp: new Date(),
        });
      });
    }
  }

  /**
   * Obtener usuarios conectados
   */
  public getConnectedUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * Obtener usuarios conectados a un dispositivo
   */
  public getUsersForDevice(deviceId: number): ConnectedUser[] {
    const socketIds = this.deviceSockets.get(deviceId) || new Set();
    const users: ConnectedUser[] = [];

    socketIds.forEach((socketId) => {
      const user = this.connectedUsers.get(socketId);
      if (user) {
        users.push(user);
      }
    });

    return users;
  }

  /**
   * Obtener instancia de Socket.io
   */
  public getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Cerrar conexión WebSocket
   */
  public close() {
    this.io.close();
  }
}

// Instancia global
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
