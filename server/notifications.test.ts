import { describe, it, expect } from "vitest";
import {
  sendPushNotification,
  notifyGeofenceEntry,
  notifyGeofenceExit,
  notifyDeviceOnline,
  notifyDeviceOffline,
  notifyCommandExecuted,
  notifySecurityAlert,
  notifyBatteryLow,
  getUserNotifications,
  markNotificationAsRead,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  getNotificationStats,
} from "./notifications";

describe("Notifications Service", () => {
  const getUniqueUserId = () => Math.floor(Math.random() * 100000) + 1;

  describe("sendPushNotification", () => {
    it("should send a push notification", async () => {
      const userId = getUniqueUserId();
      const notification = await sendPushNotification(userId, {
        type: "security_alert",
        title: "Test Alert",
        message: "This is a test notification",
        sound: true,
        vibration: false,
      });

      expect(notification).toBeDefined();
      expect(notification.type).toBe("security_alert");
      expect(notification.title).toBe("Test Alert");
      expect(notification.message).toBe("This is a test notification");
      expect(notification.sound).toBe(true);
      expect(notification.vibration).toBe(false);
      expect(notification.read).toBe(false);
      expect(notification.timestamp).toBeDefined();
    });

    it("should generate unique notification IDs", async () => {
      const userId = getUniqueUserId();
      const notif1 = await sendPushNotification(userId, {
        type: "device_online",
        title: "Device 1 Online",
        message: "Device is now online",
        sound: false,
        vibration: false,
      });

      const notif2 = await sendPushNotification(userId, {
        type: "device_online",
        title: "Device 2 Online",
        message: "Device is now online",
        sound: false,
        vibration: false,
      });

      expect(notif1.id).not.toBe(notif2.id);
    });
  });

  describe("notifyGeofenceEntry", () => {
    it("should send geofence entry notification", async () => {
      const userId = getUniqueUserId();
      const notification = await notifyGeofenceEntry(userId, 1, 1, "Office", 40.7128, -74.006);

      expect(notification.type).toBe("geofence_entry");
      expect(notification.title).toContain("Geofence");
      expect(notification.deviceId).toBe(1);
      expect(notification.geofenceId).toBe(1);
      expect(notification.data?.geofenceName).toBe("Office");
      expect(notification.sound).toBe(true);
      expect(notification.vibration).toBe(true);
    });
  });

  describe("notifyGeofenceExit", () => {
    it("should send geofence exit notification", async () => {
      const userId = getUniqueUserId();
      const notification = await notifyGeofenceExit(userId, 1, 1, "Office", 40.7128, -74.006);

      expect(notification.type).toBe("geofence_exit");
      expect(notification.title).toContain("Geofence");
      expect(notification.deviceId).toBe(1);
      expect(notification.geofenceId).toBe(1);
      expect(notification.sound).toBe(true);
      expect(notification.vibration).toBe(true);
    });
  });

  describe("notifyDeviceOnline", () => {
    it("should send device online notification", async () => {
      const userId = getUniqueUserId();
      const notification = await notifyDeviceOnline(userId, 1, "Samsung Galaxy S21");

      expect(notification.type).toBe("device_online");
      expect(notification.title).toContain("Línea");
      expect(notification.message).toContain("Samsung Galaxy S21");
      expect(notification.deviceId).toBe(1);
      expect(notification.sound).toBe(false);
    });
  });

  describe("notifyDeviceOffline", () => {
    it("should send device offline notification", async () => {
      const userId = getUniqueUserId();
      const notification = await notifyDeviceOffline(userId, 1, "Samsung Galaxy S21");

      expect(notification.type).toBe("device_offline");
      expect(notification.title).toContain("Fuera");
      expect(notification.message).toContain("Samsung Galaxy S21");
      expect(notification.deviceId).toBe(1);
      expect(notification.sound).toBe(true);
    });
  });

  describe("notifyCommandExecuted", () => {
    it("should send command executed notification with success", async () => {
      const userId = getUniqueUserId();
      const notification = await notifyCommandExecuted(userId, 1, "screenshot", "success");

      expect(notification.type).toBe("command_executed");
      expect(notification.title).toContain("Comando");
      expect(notification.message).toContain("screenshot");
      expect(notification.deviceId).toBe(1);
      expect(notification.data?.status).toBe("success");
    });

    it("should send command executed notification with failure", async () => {
      const userId = getUniqueUserId();
      const notification = await notifyCommandExecuted(userId, 1, "screenshot", "failed");

      expect(notification.type).toBe("command_executed");
      expect(notification.title).toContain("Comando");
      expect(notification.message).toContain("screenshot");
      expect(notification.deviceId).toBe(1);
      expect(notification.data?.status).toBe("failed");
    });
  });

  describe("notifySecurityAlert", () => {
    it("should send security alert notification", async () => {
      const userId = getUniqueUserId();
      const notification = await notifySecurityAlert(
        userId,
        1,
        "Suspicious Activity",
        "Multiple failed login attempts detected"
      );

      expect(notification.type).toBe("security_alert");
      expect(notification.title).toContain("Seguridad");
      expect(notification.message).toContain("Suspicious Activity");
      expect(notification.deviceId).toBe(1);
      expect(notification.sound).toBe(true);
      expect(notification.vibration).toBe(true);
    });
  });

  describe("notifyBatteryLow", () => {
    it("should send battery low notification", async () => {
      const userId = getUniqueUserId();
      const notification = await notifyBatteryLow(userId, 1, 15);

      expect(notification.type).toBe("battery_low");
      expect(notification.title).toContain("Batería");
      expect(notification.message).toContain("15%");
      expect(notification.deviceId).toBe(1);
      expect(notification.data?.batteryLevel).toBe(15);
    });
  });

  describe("getUserNotifications", () => {
    it("should retrieve user notifications", async () => {
      const userId = getUniqueUserId();
      await sendPushNotification(userId, {
        type: "device_online",
        title: "Device Online",
        message: "Device is online",
        sound: false,
        vibration: false,
      });

      await sendPushNotification(userId, {
        type: "device_offline",
        title: "Device Offline",
        message: "Device is offline",
        sound: true,
        vibration: true,
      });

      const notifications = getUserNotifications(userId);

      expect(notifications.length).toBe(2);
      expect(notifications[0].type).toBe("device_offline");
      expect(notifications[1].type).toBe("device_online");
    });

    it("should respect limit parameter", async () => {
      const userId = getUniqueUserId();
      for (let i = 0; i < 10; i++) {
        await sendPushNotification(userId, {
          type: "device_online",
          title: `Device ${i} Online`,
          message: "Device is online",
          sound: false,
          vibration: false,
        });
      }

      const notifications = getUserNotifications(userId, 5);

      expect(notifications.length).toBe(5);
    });
  });

  describe("markNotificationAsRead", () => {
    it("should mark notification as read", async () => {
      const userId = getUniqueUserId();
      const notification = await sendPushNotification(userId, {
        type: "device_online",
        title: "Device Online",
        message: "Device is online",
        sound: false,
        vibration: false,
      });

      expect(notification.read).toBe(false);

      const marked = markNotificationAsRead(userId, notification.id);
      expect(marked).toBe(true);

      const notifications = getUserNotifications(userId);
      expect(notifications[0].read).toBe(true);
    });

    it("should return false for non-existent notification", () => {
      const userId = getUniqueUserId();
      const marked = markNotificationAsRead(userId, "non-existent-id");
      expect(marked).toBe(false);
    });
  });

  describe("getUserNotificationPreferences", () => {
    it("should return default preferences", () => {
      const userId = getUniqueUserId();
      const prefs = getUserNotificationPreferences(userId);

      expect(prefs.soundEnabled).toBe(true);
      expect(prefs.vibrationEnabled).toBe(true);
      expect(prefs.notificationTypes).toContain("geofence_entry");
      expect(prefs.notificationTypes).toContain("device_offline");
    });
  });

  describe("updateUserNotificationPreferences", () => {
    it("should update notification preferences", () => {
      const userId = getUniqueUserId();
      updateUserNotificationPreferences(userId, {
        soundEnabled: false,
        vibrationEnabled: false,
        notificationTypes: ["geofence_entry"],
      });

      const prefs = getUserNotificationPreferences(userId);

      expect(prefs.soundEnabled).toBe(false);
      expect(prefs.vibrationEnabled).toBe(false);
      expect(prefs.notificationTypes).toEqual(["geofence_entry"]);
    });

    it("should partially update preferences", () => {
      const userId = getUniqueUserId();
      updateUserNotificationPreferences(userId, {
        soundEnabled: false,
      });

      const prefs = getUserNotificationPreferences(userId);

      expect(prefs.soundEnabled).toBe(false);
      expect(prefs.vibrationEnabled).toBe(true);
    });
  });

  describe("getNotificationStats", () => {
    it("should calculate notification statistics", async () => {
      const userId = getUniqueUserId();
      await sendPushNotification(userId, {
        type: "device_online",
        title: "Device Online",
        message: "Device is online",
        sound: false,
        vibration: false,
      });

      await sendPushNotification(userId, {
        type: "device_offline",
        title: "Device Offline",
        message: "Device is offline",
        sound: true,
        vibration: true,
      });

      const stats = getNotificationStats(userId);

      expect(stats.total).toBe(2);
      expect(stats.unread).toBe(2);
      expect(stats.byType.device_online).toBe(1);
      expect(stats.byType.device_offline).toBe(1);
    });

    it("should count only unread notifications", async () => {
      const userId = getUniqueUserId();
      const notif1 = await sendPushNotification(userId, {
        type: "device_online",
        title: "Device Online",
        message: "Device is online",
        sound: false,
        vibration: false,
      });

      const notif2 = await sendPushNotification(userId, {
        type: "device_offline",
        title: "Device Offline",
        message: "Device is offline",
        sound: true,
        vibration: true,
      });

      markNotificationAsRead(userId, notif1.id);

      const stats = getNotificationStats(userId);

      expect(stats.total).toBe(2);
      expect(stats.unread).toBe(1);
    });
  });
});
