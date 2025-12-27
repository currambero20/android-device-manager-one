// WebSocket integration handled separately in websocket.ts
import { createAuditLog } from "./db";

export type NotificationType =
  | "geofence_entry"
  | "geofence_exit"
  | "device_online"
  | "device_offline"
  | "command_executed"
  | "security_alert"
  | "battery_low"
  | "storage_full";

export interface PushNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  deviceId?: number;
  geofenceId?: number;
  data?: Record<string, unknown>;
  sound: boolean;
  vibration: boolean;
  timestamp: Date;
  read: boolean;
}

// In-memory notification store (replace with database in production)
const notificationStore = new Map<string, PushNotification[]>();
const userNotificationPreferences = new Map<
  number,
  {
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    notificationTypes: NotificationType[];
  }
>();

/**
 * Enviar notificación push a usuario
 */
export async function sendPushNotification(
  userId: number,
  notification: Omit<PushNotification, "id" | "timestamp" | "read">
): Promise<PushNotification & { userId: number }> {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fullNotification: PushNotification = {
    ...notification,
    id,
    timestamp: new Date(),
    read: false,
  };

  // Store notification
  if (!notificationStore.has(String(userId))) {
    notificationStore.set(String(userId), []);
  }
  notificationStore.get(String(userId))!.push(fullNotification);

  // Broadcast via WebSocket
  // Note: WebSocket broadcast would be implemented via the websocket server
  // The notification is stored and will be delivered via WebSocket when the user connects
  console.log(`[Notifications] Notification queued for user ${userId}: ${notification.title}`);

  // Log to audit
  await createAuditLog({
    userId,
    action: "notification_sent",
    actionType: "security_event",
    resourceType: "notification",
    details: {
      type: notification.type,
      title: notification.title,
    },
    status: "success",
  });

  return { ...fullNotification, userId };
}

/**
 * Enviar notificación de entrada a geofence
 */
export async function notifyGeofenceEntry(
  userId: number,
  deviceId: number,
  geofenceId: number,
  geofenceName: string,
  latitude: number,
  longitude: number
): Promise<PushNotification & { userId: number }> {
  return sendPushNotification(userId, {
    type: "geofence_entry",
    title: "Entrada a Geofence",
    message: `Dispositivo ${deviceId} entró a la zona "${geofenceName}"`,
    deviceId,
    geofenceId,
    data: {
      latitude,
      longitude,
      geofenceName,
    },
    sound: true,
    vibration: true,
  });
}

/**
 * Enviar notificación de salida de geofence
 */
export async function notifyGeofenceExit(
  userId: number,
  deviceId: number,
  geofenceId: number,
  geofenceName: string,
  latitude: number,
  longitude: number
): Promise<PushNotification & { userId: number }> {
  return sendPushNotification(userId, {
    type: "geofence_exit",
    title: "Salida de Geofence",
    message: `Dispositivo ${deviceId} salió de la zona "${geofenceName}"`,
    deviceId,
    geofenceId,
    data: {
      latitude,
      longitude,
      geofenceName,
    },
    sound: true,
    vibration: true,
  });
}

/**
 * Enviar notificación de dispositivo en línea
 */
export async function notifyDeviceOnline(
  userId: number,
  deviceId: number,
  deviceName: string
): Promise<PushNotification & { userId: number }> {
  return sendPushNotification(userId, {
    type: "device_online",
    title: "Dispositivo En Línea",
    message: `${deviceName} está en línea`,
    deviceId,
    sound: false,
    vibration: false,
  });
}

/**
 * Enviar notificación de dispositivo fuera de línea
 */
export async function notifyDeviceOffline(
  userId: number,
  deviceId: number,
  deviceName: string
): Promise<PushNotification & { userId: number }> {
  return sendPushNotification(userId, {
    type: "device_offline",
    title: "Dispositivo Fuera de Línea",
    message: `${deviceName} se desconectó`,
    deviceId,
    sound: true,
    vibration: true,
  });
}

/**
 * Enviar notificación de comando ejecutado
 */
export async function notifyCommandExecuted(
  userId: number,
  deviceId: number,
  commandType: string,
  status: "success" | "failed"
): Promise<PushNotification & { userId: number }> {
  const statusText = status === "success" ? "ejecutado" : "falló";
  return sendPushNotification(userId, {
    type: "command_executed",
    title: `Comando ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
    message: `Comando ${commandType} en dispositivo ${deviceId} ${statusText}`,
    deviceId,
    data: {
      commandType,
      status,
    },
    sound: true,
    vibration: false,
  });
}

/**
 * Enviar notificación de alerta de seguridad
 */
export async function notifySecurityAlert(
  userId: number,
  deviceId: number,
  alertType: string,
  details: string
): Promise<PushNotification & { userId: number }> {
  return sendPushNotification(userId, {
    type: "security_alert",
    title: "Alerta de Seguridad",
    message: `${alertType}: ${details}`,
    deviceId,
    data: {
      alertType,
      details,
    },
    sound: true,
    vibration: true,
  });
}

/**
 * Enviar notificación de batería baja
 */
export async function notifyBatteryLow(
  userId: number,
  deviceId: number,
  batteryLevel: number
): Promise<PushNotification & { userId: number }> {
  return sendPushNotification(userId, {
    type: "battery_low",
    title: "Batería Baja",
    message: `Dispositivo ${deviceId} tiene ${batteryLevel}% de batería`,
    deviceId,
    data: {
      batteryLevel,
    },
    sound: false,
    vibration: false,
  });
}

/**
 * Obtener notificaciones del usuario
 */
export function getUserNotifications(userId: number, limit: number = 50): PushNotification[] {
  const notifications = notificationStore.get(String(userId)) || [];
  return notifications.slice(-limit).reverse();
}

/**
 * Marcar notificación como leída
 */
export function markNotificationAsRead(userId: number, notificationId: string): boolean {
  const notifications = notificationStore.get(String(userId));
  if (!notifications) return false;

  const notification = notifications.find((n) => n.id === notificationId);
  if (notification) {
    notification.read = true;
    return true;
  }
  return false;
}

/**
 * Obtener preferencias de notificaciones del usuario
 */
export function getUserNotificationPreferences(userId: number) {
  return (
    userNotificationPreferences.get(userId) || {
      soundEnabled: true,
      vibrationEnabled: true,
      notificationTypes: [
        "geofence_entry",
        "geofence_exit",
        "device_offline",
        "command_executed",
        "security_alert",
      ],
    }
  );
}

/**
 * Actualizar preferencias de notificaciones del usuario
 */
export function updateUserNotificationPreferences(
  userId: number,
  preferences: {
    soundEnabled?: boolean;
    vibrationEnabled?: boolean;
    notificationTypes?: NotificationType[];
  }
): void {
  const current = getUserNotificationPreferences(userId);
  userNotificationPreferences.set(userId, {
    soundEnabled: preferences.soundEnabled ?? current.soundEnabled,
    vibrationEnabled: preferences.vibrationEnabled ?? current.vibrationEnabled,
    notificationTypes: preferences.notificationTypes ?? current.notificationTypes,
  });
}

/**
 * Limpiar notificaciones antiguas (más de 7 días)
 */
export function cleanupOldNotifications(): void {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  notificationStore.forEach((notifications, userId) => {
    const filtered = notifications.filter((n) => n.timestamp > sevenDaysAgo);
    if (filtered.length === 0) {
      notificationStore.delete(userId);
    } else {
      notificationStore.set(userId, filtered);
    }
  });
}

/**
 * Obtener estadísticas de notificaciones
 */
export function getNotificationStats(userId: number) {
  const notifications = notificationStore.get(String(userId)) || [];
  const unread = notifications.filter((n) => !n.read).length;
  const byType = new Map<NotificationType, number>();

  notifications.forEach((n) => {
    byType.set(n.type, (byType.get(n.type) || 0) + 1);
  });

  return {
    total: notifications.length,
    unread,
    byType: Object.fromEntries(byType),
  };
}
