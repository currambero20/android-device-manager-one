import { describe, it, expect, beforeEach, vi } from "vitest";
import { WebSocketManager, type DeviceLocation, type SMSMessage } from "./websocket";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

describe("WebSocketManager", () => {
  let wsManager: WebSocketManager;
  let httpServer: any;

  beforeEach(() => {
    // Create a mock HTTP server
    httpServer = createServer();
    wsManager = new WebSocketManager(httpServer);
  });

  describe("initialization", () => {
    it("should initialize WebSocket manager", () => {
      expect(wsManager).toBeDefined();
      expect(wsManager.getIO()).toBeDefined();
    });

    it("should have empty device connections initially", () => {
      const devices = wsManager.getConnectedDevices();
      expect(devices).toEqual([]);
    });
  });

  describe("device connections", () => {
    it("should track device connections", () => {
      const deviceId = 1;
      // Simulate joining a device
      wsManager["deviceConnections"].set(deviceId, new Set(["socket-1", "socket-2"]));

      expect(wsManager.getDeviceConnections(deviceId)).toBe(2);
    });

    it("should return 0 for non-existent device", () => {
      expect(wsManager.getDeviceConnections(999)).toBe(0);
    });

    it("should return list of connected devices", () => {
      wsManager["deviceConnections"].set(1, new Set(["socket-1"]));
      wsManager["deviceConnections"].set(2, new Set(["socket-2"]));
      wsManager["deviceConnections"].set(3, new Set(["socket-3"]));

      const devices = wsManager.getConnectedDevices();
      expect(devices).toContain(1);
      expect(devices).toContain(2);
      expect(devices).toContain(3);
      expect(devices.length).toBe(3);
    });
  });

  describe("location tracking", () => {
    it("should store last location for device", async () => {
      const location: DeviceLocation = {
        deviceId: 1,
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        timestamp: Date.now(),
        speed: 5.5,
        bearing: 180,
      };

      // Access private method for testing
      await wsManager["handleLocationUpdate"](location);

      // Verify location was stored
      const storedLocation = wsManager["lastLocations"].get(1);
      expect(storedLocation).toBeDefined();
      expect(storedLocation?.latitude).toBe(40.7128);
      expect(storedLocation?.longitude).toBe(-74.006);
    });

    it("should handle multiple device locations", async () => {
      const location1: DeviceLocation = {
        deviceId: 1,
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        timestamp: Date.now(),
      };

      const location2: DeviceLocation = {
        deviceId: 2,
        latitude: 34.0522,
        longitude: -118.2437,
        accuracy: 15,
        timestamp: Date.now(),
      };

      await wsManager["handleLocationUpdate"](location1);
      await wsManager["handleLocationUpdate"](location2);

      expect(wsManager["lastLocations"].size).toBe(2);
      expect(wsManager["lastLocations"].get(1)?.latitude).toBe(40.7128);
      expect(wsManager["lastLocations"].get(2)?.latitude).toBe(34.0522);
    });
  });

  describe("SMS message handling", () => {
    it("should store SMS messages for device", async () => {
      const sms: SMSMessage = {
        deviceId: 1,
        phoneNumber: "+1234567890",
        message: "Hello, this is a test message",
        timestamp: Date.now(),
        direction: "incoming",
      };

      await wsManager["handleSMSMessage"](sms);

      const messages = wsManager["lastSMS"].get(1);
      expect(messages).toBeDefined();
      expect(messages?.length).toBe(1);
      expect(messages?.[0]?.message).toBe("Hello, this is a test message");
    });

    it("should maintain SMS message history", async () => {
      const sms1: SMSMessage = {
        deviceId: 1,
        phoneNumber: "+1111111111",
        message: "First message",
        timestamp: Date.now(),
        direction: "incoming",
      };

      const sms2: SMSMessage = {
        deviceId: 1,
        phoneNumber: "+2222222222",
        message: "Second message",
        timestamp: Date.now() + 1000,
        direction: "outgoing",
      };

      await wsManager["handleSMSMessage"](sms1);
      await wsManager["handleSMSMessage"](sms2);

      const messages = wsManager["lastSMS"].get(1);
      expect(messages?.length).toBe(2);
      expect(messages?.[0]?.message).toBe("Second message"); // Most recent first
      expect(messages?.[1]?.message).toBe("First message");
    });

    it("should limit SMS history to 50 messages", async () => {
      // Add 51 messages
      for (let i = 0; i < 51; i++) {
        const sms: SMSMessage = {
          deviceId: 1,
          phoneNumber: `+${i}`,
          message: `Message ${i}`,
          timestamp: Date.now() + i,
          direction: i % 2 === 0 ? "incoming" : "outgoing",
        };
        await wsManager["handleSMSMessage"](sms);
      }

      const messages = wsManager["lastSMS"].get(1);
      expect(messages?.length).toBeLessThanOrEqual(50);
    });
  });

  describe("broadcasting", () => {
    it("should broadcast to specific device", () => {
      const broadcastSpy = vi.spyOn(wsManager.getIO(), "to");

      wsManager.broadcastToDevice(1, "test-event", { data: "test" });

      expect(broadcastSpy).toHaveBeenCalledWith("device:1");
    });

    it("should broadcast to all clients", () => {
      const emitSpy = vi.spyOn(wsManager.getIO(), "emit");

      wsManager.broadcastToAll("test-event", { data: "test" });

      expect(emitSpy).toHaveBeenCalledWith("test-event", { data: "test" });
    });
  });

  describe("event handlers", () => {
    it("should handle location updates from devices", async () => {
      const location: DeviceLocation = {
        deviceId: 1,
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        timestamp: Date.now(),
      };

      // Simulate device sending location
      await wsManager["handleLocationUpdate"](location);

      const stored = wsManager["lastLocations"].get(1);
      expect(stored).toBeDefined();
    });

    it("should handle SMS messages from devices", async () => {
      const sms: SMSMessage = {
        deviceId: 1,
        phoneNumber: "+1234567890",
        message: "Test SMS",
        timestamp: Date.now(),
        direction: "incoming",
      };

      await wsManager["handleSMSMessage"](sms);

      const messages = wsManager["lastSMS"].get(1);
      expect(messages?.length).toBeGreaterThan(0);
    });
  });

  describe("device management", () => {
    it("should track multiple devices independently", () => {
      wsManager["deviceConnections"].set(1, new Set(["socket-1"]));
      wsManager["deviceConnections"].set(2, new Set(["socket-2"]));
      wsManager["deviceConnections"].set(3, new Set(["socket-3"]));

      expect(wsManager.getDeviceConnections(1)).toBe(1);
      expect(wsManager.getDeviceConnections(2)).toBe(1);
      expect(wsManager.getDeviceConnections(3)).toBe(1);
    });

    it("should handle device with multiple connections", () => {
      wsManager["deviceConnections"].set(1, new Set(["socket-1", "socket-2", "socket-3"]));

      expect(wsManager.getDeviceConnections(1)).toBe(3);
    });
  });
});
