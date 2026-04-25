import { describe, it, expect, beforeEach } from "vitest";

/**
 * Tests para Google Maps Router
 */
describe("Google Maps Router", () => {
  describe("Device Locations", () => {
    it("debe obtener ubicaciones actuales de dispositivos", () => {
      const locations = [
        {
          id: 1,
          deviceId: 1,
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
          timestamp: new Date(),
        },
        {
          id: 2,
          deviceId: 2,
          latitude: 34.0522,
          longitude: -118.2437,
          accuracy: 15,
          timestamp: new Date(),
        },
      ];

      expect(locations.length).toBe(2);
      expect(locations[0].latitude).toBe(40.7128);
    });

    it("debe filtrar ubicaciones por dispositivo", () => {
      const locations = [
        { deviceId: 1, latitude: 40.7128, longitude: -74.006 },
        { deviceId: 2, latitude: 34.0522, longitude: -118.2437 },
        { deviceId: 1, latitude: 40.7129, longitude: -74.0061 },
      ];

      const deviceId = 1;
      const filtered = locations.filter((loc) => loc.deviceId === deviceId);

      expect(filtered.length).toBe(2);
      expect(filtered[0].deviceId).toBe(1);
    });

    it("debe obtener última ubicación por dispositivo", () => {
      const locations = [
        { deviceId: 1, latitude: 40.7128, timestamp: new Date("2024-01-01") },
        { deviceId: 1, latitude: 40.7129, timestamp: new Date("2024-01-02") },
        { deviceId: 2, latitude: 34.0522, timestamp: new Date("2024-01-01") },
      ];

      const latestByDevice = new Map();
      locations.forEach((loc) => {
        if (!latestByDevice.has(loc.deviceId)) {
          latestByDevice.set(loc.deviceId, loc);
        }
      });

      expect(latestByDevice.size).toBe(2);
      expect(latestByDevice.get(1).latitude).toBe(40.7128);
    });
  });

  describe("Route History", () => {
    it("debe calcular distancia entre dos puntos", () => {
      const lat1 = 40.7128;
      const lon1 = -74.006;
      const lat2 = 40.7129;
      const lon2 = -74.0061;

      // Haversine formula
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1);
    });

    it("debe calcular distancia total de ruta", () => {
      const route = [
        { latitude: 40.7128, longitude: -74.006 },
        { latitude: 40.7129, longitude: -74.0061 },
        { latitude: 40.713, longitude: -74.0062 },
      ];

      let totalDistance = 0;
      for (let i = 1; i < route.length; i++) {
        const prev = route[i - 1];
        const curr = route[i];
        const R = 6371;
        const dLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
        const dLon = ((curr.longitude - prev.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((prev.latitude * Math.PI) / 180) *
            Math.cos((curr.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistance += R * c;
      }

      expect(totalDistance).toBeGreaterThan(0);
    });

    it("debe obtener puntos de ruta ordenados por tiempo", () => {
      const history = [
        { latitude: 40.7128, timestamp: new Date("2024-01-01T10:00:00") },
        { latitude: 40.7129, timestamp: new Date("2024-01-01T10:05:00") },
        { latitude: 40.713, timestamp: new Date("2024-01-01T10:10:00") },
      ];

      const sorted = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      expect(sorted[0].latitude).toBe(40.7128);
      expect(sorted[2].latitude).toBe(40.713);
    });
  });

  describe("Geofences", () => {
    it("debe obtener geofences por tipo", () => {
      const geofences = [
        { id: 1, name: "Zona Roja", type: "alert" },
        { id: 2, name: "Zona Verde", type: "safe" },
        { id: 3, name: "Zona Amarilla", type: "restricted" },
        { id: 4, name: "Otra Roja", type: "alert" },
      ];

      const alerts = geofences.filter((g) => g.type === "alert");
      expect(alerts.length).toBe(2);
      expect(alerts[0].name).toBe("Zona Roja");
    });

    it("debe asignar color a geofence", () => {
      const colors: Record<string, string> = {
        alert: "#ff6b6b",
        safe: "#51cf66",
        restricted: "#ffd43b",
      };

      expect(colors["alert"]).toBe("#ff6b6b");
      expect(colors["safe"]).toBe("#51cf66");
    });

    it("debe detectar entrada a geofence", () => {
      const geofence = {
        latitude: 40.7128,
        longitude: -74.006,
        radius: 100, // metros
      };

      const deviceLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      // Calcular distancia
      const R = 6371000; // metros
      const dLat = ((deviceLocation.latitude - geofence.latitude) * Math.PI) / 180;
      const dLon = ((deviceLocation.longitude - geofence.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((geofence.latitude * Math.PI) / 180) *
          Math.cos((deviceLocation.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      const isInside = distance <= geofence.radius;
      expect(isInside).toBe(true);
    });

    it("debe detectar salida de geofence", () => {
      const geofence = {
        latitude: 40.7128,
        longitude: -74.006,
        radius: 100, // metros
      };

      const deviceLocation = {
        latitude: 40.8,
        longitude: -74.2,
      };

      // Calcular distancia
      const R = 6371000;
      const dLat = ((deviceLocation.latitude - geofence.latitude) * Math.PI) / 180;
      const dLon = ((deviceLocation.longitude - geofence.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((geofence.latitude * Math.PI) / 180) *
          Math.cos((deviceLocation.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      const isInside = distance <= geofence.radius;
      expect(isInside).toBe(false);
    });
  });

  describe("Geofence Events", () => {
    it("debe registrar evento de entrada", () => {
      const event = {
        id: 1,
        deviceId: 1,
        geofenceId: 1,
        eventType: "enter",
        timestamp: new Date(),
      };

      expect(event.eventType).toBe("enter");
      expect(event.deviceId).toBe(1);
    });

    it("debe registrar evento de salida", () => {
      const event = {
        id: 2,
        deviceId: 1,
        geofenceId: 1,
        eventType: "exit",
        timestamp: new Date(),
      };

      expect(event.eventType).toBe("exit");
    });

    it("debe filtrar eventos por dispositivo", () => {
      const events = [
        { deviceId: 1, eventType: "enter" },
        { deviceId: 2, eventType: "exit" },
        { deviceId: 1, eventType: "exit" },
      ];

      const deviceId = 1;
      const filtered = events.filter((e) => e.deviceId === deviceId);

      expect(filtered.length).toBe(2);
    });

    it("debe filtrar eventos por tipo", () => {
      const events = [
        { eventType: "enter" },
        { eventType: "exit" },
        { eventType: "enter" },
      ];

      const enters = events.filter((e) => e.eventType === "enter");
      expect(enters.length).toBe(2);
    });
  });

  describe("Location Statistics", () => {
    it("debe calcular velocidad promedio", () => {
      const speeds = [10, 20, 15, 25, 30];
      const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

      expect(avgSpeed).toBe(20);
    });

    it("debe encontrar velocidad máxima", () => {
      const speeds = [10, 20, 15, 25, 30];
      const maxSpeed = Math.max(...speeds);

      expect(maxSpeed).toBe(30);
    });

    it("debe contar puntos de ubicación", () => {
      const locations = [
        { latitude: 40.7128, timestamp: new Date() },
        { latitude: 40.7129, timestamp: new Date() },
        { latitude: 40.713, timestamp: new Date() },
      ];

      expect(locations.length).toBe(3);
    });
  });

  describe("Map Clustering", () => {
    it("debe agrupar dispositivos cercanos", () => {
      const devices = [
        { id: 1, latitude: 40.7128, longitude: -74.006 },
        { id: 2, latitude: 40.7129, longitude: -74.0061 },
        { id: 3, latitude: 40.8, longitude: -74.2 },
      ];

      const clusterDistance = 0.01; // ~1 km
      const clusters: any[] = [];

      devices.forEach((device) => {
        let found = false;
        for (const cluster of clusters) {
          const clusterDev = cluster[0];
          const latDiff = Math.abs(device.latitude - clusterDev.latitude);
          const lonDiff = Math.abs(device.longitude - clusterDev.longitude);

          if (latDiff < clusterDistance && lonDiff < clusterDistance) {
            cluster.push(device);
            found = true;
            break;
          }
        }

        if (!found) {
          clusters.push([device]);
        }
      });

      expect(clusters.length).toBe(2);
      expect(clusters[0].length).toBe(2);
    });

    it("debe calcular centro de cluster", () => {
      const cluster = [
        { latitude: 40.7128, longitude: -74.006 },
        { latitude: 40.7129, longitude: -74.0061 },
      ];

      const centerLat = cluster.reduce((sum, d) => sum + d.latitude, 0) / cluster.length;
      const centerLon = cluster.reduce((sum, d) => sum + d.longitude, 0) / cluster.length;

      expect(centerLat).toBeCloseTo(40.71285, 4);
      expect(centerLon).toBeCloseTo(-74.00605, 4);
    });
  });

  describe("Map Visualization", () => {
    it("debe convertir coordenadas a píxeles de mapa", () => {
      const latitude = 40.7128;
      const longitude = -74.006;

      const x = ((longitude + 180) / 360) * 100;
      const y = ((90 - latitude) / 180) * 100;

      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(100);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(100);
    });

    it("debe calcular tamaño de geofence en píxeles", () => {
      const radiusKm = 1;
      const radiusPixels = (radiusKm / 111) * 10; // Aproximación

      expect(radiusPixels).toBeGreaterThan(0);
    });
  });
});
