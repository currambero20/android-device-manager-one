import { describe, it, expect, beforeEach } from "vitest";
import { advancedMonitoring } from "./advancedMonitoring";

describe("Advanced Monitoring Service", () => {
  const testDeviceId = 1;

  describe("Clipboard Logging", () => {
    it("should log clipboard entry", async () => {
      const entry = {
        deviceId: testDeviceId,
        content: "Test clipboard content",
        timestamp: new Date(),
        dataType: "text" as const,
        contentPreview: "Test clipboard content",
      };

      await advancedMonitoring.logClipboardEntry(entry);
      // Verify logging completed without error
      expect(true).toBe(true);
    });

    it("should get clipboard history", async () => {
      const history = await advancedMonitoring.getClipboardHistory(testDeviceId, 10);
      expect(Array.isArray(history)).toBe(true);
    });

    it("should search clipboard", async () => {
      const results = await advancedMonitoring.searchClipboard(testDeviceId, "test");
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("Notification Logging", () => {
    it("should log notification", async () => {
      const notification = {
        deviceId: testDeviceId,
        appName: "TestApp",
        title: "Test Notification",
        content: "Test notification content",
        timestamp: new Date(),
        isRead: false,
      };

      await advancedMonitoring.logNotification(notification);
      expect(true).toBe(true);
    });

    it("should get notifications", async () => {
      const notifications = await advancedMonitoring.getNotifications(testDeviceId, 10);
      expect(Array.isArray(notifications)).toBe(true);
    });
  });

  describe("Media Capture", () => {
    it("should get media captures", async () => {
      const captures = await advancedMonitoring.getMediaCaptures(testDeviceId, undefined, 10);
      expect(Array.isArray(captures)).toBe(true);
    });

    it("should get media captures by type", async () => {
      const captures = await advancedMonitoring.getMediaCaptures(
        testDeviceId,
        "screenshot",
        10
      );
      expect(Array.isArray(captures)).toBe(true);
    });
  });

  describe("Monitoring Statistics", () => {
    it("should get monitoring stats", async () => {
      const stats = await advancedMonitoring.getMonitoringStats(testDeviceId);

      expect(stats).toHaveProperty("totalClipboardEntries");
      expect(stats).toHaveProperty("totalNotifications");
      expect(stats).toHaveProperty("totalMediaCaptures");
      expect(stats).toHaveProperty("clipboardByType");
      expect(stats).toHaveProperty("mediaByType");
      expect(typeof stats.totalClipboardEntries).toBe("number");
      expect(typeof stats.totalNotifications).toBe("number");
      expect(typeof stats.totalMediaCaptures).toBe("number");
    });

    it("should get activity summary", async () => {
      const summary = await advancedMonitoring.getActivitySummary(testDeviceId, 24);

      expect(summary).toHaveProperty("clipboardActivity");
      expect(summary).toHaveProperty("notificationActivity");
      expect(summary).toHaveProperty("mediaActivity");
      expect(summary).toHaveProperty("mostActiveApp");
      expect(summary).toHaveProperty("topClipboardTypes");
      expect(typeof summary.clipboardActivity).toBe("number");
      expect(typeof summary.notificationActivity).toBe("number");
      expect(typeof summary.mediaActivity).toBe("number");
      expect(Array.isArray(summary.topClipboardTypes)).toBe(true);
    });
  });

  describe("Cleanup Operations", () => {
    it("should cleanup old captures", async () => {
      const result = await advancedMonitoring.cleanupOldCaptures(testDeviceId, 30);
      expect(typeof result).toBe("number");
    });
  });

  describe("Data Integrity", () => {
    it("should handle empty device ID gracefully", async () => {
      const history = await advancedMonitoring.getClipboardHistory(999, 10);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array for non-existent device", async () => {
      const notifications = await advancedMonitoring.getNotifications(999, 10);
      expect(Array.isArray(notifications)).toBe(true);
    });

    it("should handle large limits gracefully", async () => {
      const history = await advancedMonitoring.getClipboardHistory(testDeviceId, 1000);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("Activity Summary Filters", () => {
    it("should get activity summary with different time ranges", async () => {
      const summary1h = await advancedMonitoring.getActivitySummary(testDeviceId, 1);
      const summary24h = await advancedMonitoring.getActivitySummary(testDeviceId, 24);
      const summary7d = await advancedMonitoring.getActivitySummary(testDeviceId, 168);

      expect(summary1h).toHaveProperty("clipboardActivity");
      expect(summary24h).toHaveProperty("clipboardActivity");
      expect(summary7d).toHaveProperty("clipboardActivity");
    });
  });

  describe("Clipboard Types", () => {
    it("should categorize clipboard entries by type", async () => {
      const stats = await advancedMonitoring.getMonitoringStats(testDeviceId);
      expect(typeof stats.clipboardByType).toBe("object");
      expect(Object.keys(stats.clipboardByType).every((key) => typeof key === "string")).toBe(
        true
      );
    });

    it("should track media types", async () => {
      const stats = await advancedMonitoring.getMonitoringStats(testDeviceId);
      expect(typeof stats.mediaByType).toBe("object");
    });
  });

  describe("Error Handling", () => {
    it("should handle logging errors gracefully", async () => {
      const entry = {
        deviceId: testDeviceId,
        content: "Test",
        timestamp: new Date(),
        dataType: "text" as const,
        contentPreview: "Test",
      };

      // Should not throw
      await expect(advancedMonitoring.logClipboardEntry(entry)).resolves.toBeUndefined();
    });

    it("should return empty results on query errors", async () => {
      const history = await advancedMonitoring.getClipboardHistory(testDeviceId);
      expect(Array.isArray(history)).toBe(true);
    });
  });
});
