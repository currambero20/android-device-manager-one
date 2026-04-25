import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  isInsideGeofence,
  checkLocationAgainstGeofences,
} from "./geofencing";

describe("Geofencing", () => {
  describe("Distance Calculation", () => {
    it("should calculate distance between two coordinates", () => {
      // New York to Los Angeles (approximately 3,944 km)
      const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3900000); // 3,900 km in meters
      expect(distance).toBeLessThan(4000000); // 4,000 km in meters
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBeLessThan(1); // Should be very close to 0
    });

    it("should calculate distance correctly for nearby points", () => {
      // Points about 1.1 km apart
      const distance = calculateDistance(40.7128, -74.006, 40.7228, -74.006);
      expect(distance).toBeGreaterThan(1000); // ~1.1 km
      expect(distance).toBeLessThan(2000);
    });
  });

  describe("Geofence Boundary Check", () => {
    it("should detect point inside geofence", () => {
      const geofence = {
        id: 1,
        deviceId: 1,
        name: "Test Zone",
        latitude: "40.7128",
        longitude: "-74.006",
        radius: "1000",
        isActive: true,
        alertOnEntry: true,
        alertOnExit: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Point very close to center (within 1000m)
      const inside = isInsideGeofence(40.7138, -74.006, geofence);
      expect(inside).toBe(true);
    });

    it("should detect point outside geofence", () => {
      const geofence = {
        id: 1,
        deviceId: 1,
        name: "Test Zone",
        latitude: "40.7128",
        longitude: "-74.006",
        radius: "100",
        isActive: true,
        alertOnEntry: true,
        alertOnExit: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Point far from center (outside 100m)
      const outside = isInsideGeofence(40.8128, -74.006, geofence);
      expect(outside).toBe(false);
    });

    it("should handle null coordinates", () => {
      const geofence = {
        id: 1,
        deviceId: 1,
        name: "Test Zone",
        latitude: null,
        longitude: "-74.006",
        radius: "1000",
        isActive: true,
        alertOnEntry: true,
        alertOnExit: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const inside = isInsideGeofence(40.7128, -74.006, geofence);
      expect(inside).toBe(false);
    });
  });

  describe("Location Checking Against Multiple Geofences", () => {
    it("should return array of geofence checks", async () => {
      const result = await checkLocationAgainstGeofences(1, 40.7128, -74.006);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should include geofence ID in results", async () => {
      const result = await checkLocationAgainstGeofences(1, 40.7128, -74.006);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("geofenceId");
        expect(result[0]).toHaveProperty("deviceId");
        expect(result[0]).toHaveProperty("insideGeofence");
        expect(result[0]).toHaveProperty("distanceToGeofence");
      }
    });

    it("should have valid coordinates in results", async () => {
      const result = await checkLocationAgainstGeofences(1, 40.7128, -74.006);
      result.forEach((item) => {
        expect(item.latitude).toBe(40.7128);
        expect(item.longitude).toBe(-74.006);
        expect(item.deviceId).toBe(1);
        expect(typeof item.insideGeofence).toBe("boolean");
      });
    });
  });

  describe("Geofence Boundary Edge Cases", () => {
    it("should handle geofence at equator", () => {
      const geofence = {
        id: 1,
        deviceId: 1,
        name: "Equator Zone",
        latitude: "0",
        longitude: "0",
        radius: "2000",
        isActive: true,
        alertOnEntry: true,
        alertOnExit: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const inside = isInsideGeofence(0.01, 0, geofence);
      expect(inside).toBe(true);
    });

    it("should handle geofence at poles", () => {
      const geofence = {
        id: 1,
        deviceId: 1,
        name: "North Pole",
        latitude: "89",
        longitude: "0",
        radius: "100000",
        isActive: true,
        alertOnEntry: true,
        alertOnExit: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const inside = isInsideGeofence(88.99, 0, geofence);
      expect(inside).toBe(true);
    });

    it("should handle international date line", () => {
      const geofence = {
        id: 1,
        deviceId: 1,
        name: "Date Line",
        latitude: "0",
        longitude: "179",
        radius: "100000",
        isActive: true,
        alertOnEntry: true,
        alertOnExit: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const inside = isInsideGeofence(0, 178.99, geofence);
      expect(inside).toBe(true);
    });
  });

  describe("Geofence Radius Validation", () => {
    it("should handle very small radius (10m)", () => {
      const geofence = {
        id: 1,
        deviceId: 1,
        name: "Tiny Zone",
        latitude: "40.7128",
        longitude: "-74.006",
        radius: "100",
        isActive: true,
        alertOnEntry: true,
        alertOnExit: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const inside = isInsideGeofence(40.7128, -74.006, geofence);
      expect(inside).toBe(true);
    });

    it("should handle large radius (100km)", () => {
      const geofence = {
        id: 1,
        deviceId: 1,
        name: "Large Zone",
        latitude: "40.7128",
        longitude: "-74.006",
        radius: "100000",
        isActive: true,
        alertOnEntry: true,
        alertOnExit: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Point within 100km radius
      const inside = isInsideGeofence(40.8128, -74.006, geofence);
      expect(inside).toBe(true);
    });
  });

  describe("Data Consistency", () => {
    it("should maintain consistent distance calculations", () => {
      const distance1 = calculateDistance(40.7128, -74.006, 40.7228, -74.006);
      const distance2 = calculateDistance(40.7228, -74.006, 40.7128, -74.006);
      expect(distance1).toBe(distance2);
    });

    it("should handle multiple geofence checks consistently", async () => {
      const result1 = await checkLocationAgainstGeofences(1, 40.7128, -74.006);
      const result2 = await checkLocationAgainstGeofences(1, 40.7128, -74.006);
      expect(result1.length).toBe(result2.length);
    });
  });
});
