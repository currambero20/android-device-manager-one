import { describe, it, expect, beforeEach } from "vitest";
import {
  getDeviceStats,
  getActivityStats,
  getTopCommands,
  getBatteryStats,
  getDeviceStatusStats,
  getSystemStats,
  getUserStats,
  getLast7DaysStats,
  getLast30DaysStats,
} from "./analytics";

describe("Analytics", () => {
  describe("Device Stats", () => {
    it("should return null for non-existent device", async () => {
      const stats = await getDeviceStats(99999);
      expect(stats).toBeNull();
    });

    it("should return device stats structure", async () => {
      const stats = await getDeviceStats(1);
      if (stats) {
        expect(stats).toHaveProperty("deviceId");
        expect(stats).toHaveProperty("deviceName");
        expect(stats).toHaveProperty("status");
        expect(stats).toHaveProperty("totalCommands");
        expect(stats).toHaveProperty("successfulCommands");
        expect(stats).toHaveProperty("failedCommands");
        expect(stats).toHaveProperty("averageBattery");
        expect(stats).toHaveProperty("totalLocations");
      }
    });
  });

  describe("Activity Stats", () => {
    it("should return activity stats array", async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const stats = await getActivityStats(startDate, endDate);
      expect(Array.isArray(stats)).toBe(true);
    });

    it("should have correct activity stats structure", async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const stats = await getActivityStats(startDate, endDate);
      if (stats.length > 0) {
        const stat = stats[0];
        expect(stat).toHaveProperty("date");
        expect(stat).toHaveProperty("totalCommands");
        expect(stat).toHaveProperty("successfulCommands");
        expect(stat).toHaveProperty("failedCommands");
        expect(stat).toHaveProperty("activeDevices");
      }
    });
  });

  describe("Top Commands", () => {
    it("should return array of command stats", async () => {
      const commands = await getTopCommands(5);
      expect(Array.isArray(commands)).toBe(true);
    });

    it("should have correct command stats structure", async () => {
      const commands = await getTopCommands(5);
      if (commands.length > 0) {
        const cmd = commands[0];
        expect(cmd).toHaveProperty("commandType");
        expect(cmd).toHaveProperty("count");
        expect(cmd).toHaveProperty("successRate");
        expect(typeof cmd.count).toBe("number");
        expect(typeof cmd.successRate).toBe("number");
      }
    });

    it("should respect limit parameter", async () => {
      const commands = await getTopCommands(3);
      expect(commands.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Battery Stats", () => {
    it("should return array of battery stats", async () => {
      const stats = await getBatteryStats();
      expect(Array.isArray(stats)).toBe(true);
    });

    it("should have correct battery stats structure", async () => {
      const stats = await getBatteryStats();
      if (stats.length > 0) {
        const stat = stats[0];
        expect(stat).toHaveProperty("deviceId");
        expect(stat).toHaveProperty("deviceName");
        expect(stat).toHaveProperty("currentBattery");
        expect(stat).toHaveProperty("averageBattery");
        expect(stat).toHaveProperty("minBattery");
        expect(stat).toHaveProperty("maxBattery");
      }
    });

    it("should have valid battery percentages", async () => {
      const stats = await getBatteryStats();
      stats.forEach((stat) => {
        expect(stat.currentBattery).toBeGreaterThanOrEqual(0);
        expect(stat.currentBattery).toBeLessThanOrEqual(100);
        expect(stat.minBattery).toBeGreaterThanOrEqual(0);
        expect(stat.maxBattery).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Device Status Stats", () => {
    it("should return device status stats", async () => {
      const stats = await getDeviceStatusStats();
      expect(stats).toHaveProperty("online");
      expect(stats).toHaveProperty("offline");
      expect(stats).toHaveProperty("inactive");
      expect(stats).toHaveProperty("total");
    });

    it("should have valid status counts", async () => {
      const stats = await getDeviceStatusStats();
      expect(stats.online).toBeGreaterThanOrEqual(0);
      expect(stats.offline).toBeGreaterThanOrEqual(0);
      expect(stats.inactive).toBeGreaterThanOrEqual(0);
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });

    it("should sum to total", async () => {
      const stats = await getDeviceStatusStats();
      const sum = stats.online + stats.offline + stats.inactive;
      expect(sum).toBe(stats.total);
    });
  });

  describe("System Stats", () => {
    it("should return system stats", async () => {
      const stats = await getSystemStats();
      expect(stats).toHaveProperty("totalDevices");
      expect(stats).toHaveProperty("totalCommands");
      expect(stats).toHaveProperty("successRate");
      expect(stats).toHaveProperty("activeDevices");
      expect(stats).toHaveProperty("lastUpdated");
    });

    it("should have valid success rate", async () => {
      const stats = await getSystemStats();
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });

    it("should have non-negative counts", async () => {
      const stats = await getSystemStats();
      expect(stats.totalDevices).toBeGreaterThanOrEqual(0);
      expect(stats.totalCommands).toBeGreaterThanOrEqual(0);
      expect(stats.activeDevices).toBeGreaterThanOrEqual(0);
    });
  });

  describe("User Stats", () => {
    it("should return user stats", async () => {
      const stats = await getUserStats(1);
      expect(stats).toHaveProperty("totalCommands");
      expect(stats).toHaveProperty("successfulCommands");
      expect(stats).toHaveProperty("failedCommands");
      expect(stats).toHaveProperty("successRate");
      expect(stats).toHaveProperty("devicesManaged");
    });

    it("should have valid success rate", async () => {
      const stats = await getUserStats(1);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });

    it("should have non-negative counts", async () => {
      const stats = await getUserStats(1);
      expect(stats.totalCommands).toBeGreaterThanOrEqual(0);
      expect(stats.successfulCommands).toBeGreaterThanOrEqual(0);
      expect(stats.failedCommands).toBeGreaterThanOrEqual(0);
      expect(stats.devicesManaged).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Time Range Stats", () => {
    it("should return last 7 days stats", async () => {
      const stats = await getLast7DaysStats();
      expect(Array.isArray(stats)).toBe(true);
    });

    it("should return last 30 days stats", async () => {
      const stats = await getLast30DaysStats();
      expect(Array.isArray(stats)).toBe(true);
    });

    it("should have correct date format", async () => {
      const stats = await getLast7DaysStats();
      if (stats.length > 0) {
        const stat = stats[0];
        expect(typeof stat.date).toBe("string");
      }
    });
  });

  describe("Data Consistency", () => {
    it("should have consistent command counts", async () => {
      const stats = await getSystemStats();
      expect(stats.totalCommands).toBeGreaterThanOrEqual(0);
    });

    it("should have consistent device counts", async () => {
      const systemStats = await getSystemStats();
      const statusStats = await getDeviceStatusStats();
      expect(systemStats.totalDevices).toBe(statusStats.total);
    });

    it("should have valid success rate calculation", async () => {
      const stats = await getSystemStats();
      if (stats.totalCommands > 0) {
        expect(stats.successRate).toBeGreaterThan(0);
      }
    });
  });
});
