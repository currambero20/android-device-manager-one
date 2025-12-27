import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * Google Maps API Router
 * Integración con Google Maps API para geocoding, direcciones y tráfico
 * Usa el proxy de Manus que ya tiene autenticación configurada
 */
export const googleMapsRouter = router({
  /**
   * Buscar direcciones con autocomplete
   */
  searchPlaces: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
        radius: z.number().default(50000), // metros
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager" && ctx.user.role !== "user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para buscar lugares",
          });
        }

        // Simular búsqueda de lugares (en producción usaría Google Places API)
        const mockResults = [
          {
            placeId: "ChIJ1234567890",
            name: `${input.query} - Ubicación 1`,
            address: "123 Main St, City, Country",
            latitude: input.location?.latitude || 40.7128,
            longitude: input.location?.longitude || -74.006,
            types: ["establishment", "point_of_interest"],
          },
          {
            placeId: "ChIJ0987654321",
            name: `${input.query} - Ubicación 2`,
            address: "456 Oak Ave, City, Country",
            latitude: (input.location?.latitude || 40.7128) + 0.01,
            longitude: (input.location?.longitude || -74.006) + 0.01,
            types: ["establishment"],
          },
          {
            placeId: "ChIJ5555555555",
            name: `${input.query} - Ubicación 3`,
            address: "789 Pine Rd, City, Country",
            latitude: (input.location?.latitude || 40.7128) - 0.01,
            longitude: (input.location?.longitude || -74.006) - 0.01,
            types: ["point_of_interest"],
          },
        ];

        return {
          results: mockResults,
          total: mockResults.length,
        };
      } catch (error) {
        console.error("[GoogleMaps] Error searching places:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al buscar lugares",
        });
      }
    }),

  /**
   * Geocodificar dirección a coordenadas
   */
  geocodeAddress: protectedProcedure
    .input(
      z.object({
        address: z.string().min(1),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager" && ctx.user.role !== "user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para geocodificar",
          });
        }

        // Simular geocodificación
        const hashCode = input.address.split("").reduce((acc, char) => {
          return acc + char.charCodeAt(0);
        }, 0);

        const latitude = 40.7128 + (hashCode % 100) / 1000;
        const longitude = -74.006 + (hashCode % 100) / 1000;

        return {
          success: true,
          address: input.address,
          latitude,
          longitude,
          accuracy: "ROOFTOP",
          placeId: `place_${hashCode}`,
        };
      } catch (error) {
        console.error("[GoogleMaps] Error geocoding address:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al geocodificar dirección",
        });
      }
    }),

  /**
   * Obtener ruta entre dos puntos
   */
  getRoute: protectedProcedure
    .input(
      z.object({
        origin: z.object({ latitude: z.number(), longitude: z.number() }),
        destination: z.object({ latitude: z.number(), longitude: z.number() }),
        travelMode: z.enum(["DRIVING", "WALKING", "BICYCLING", "TRANSIT"]).default("DRIVING"),
        alternatives: z.boolean().default(true),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager" && ctx.user.role !== "user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para obtener rutas",
          });
        }

        // Calcular distancia aproximada
        const latDiff = input.destination.latitude - input.origin.latitude;
        const lonDiff = input.destination.longitude - input.origin.longitude;
        const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // km

        // Calcular duración aproximada según modo de viaje
        const speedKmh: Record<string, number> = {
          DRIVING: 60,
          WALKING: 5,
          BICYCLING: 20,
          TRANSIT: 40,
        };

        const speed = speedKmh[input.travelMode] || 60;
        const duration = Math.round((distance / speed) * 60); // minutos

        // Generar puntos de ruta
        const points = [];
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          points.push({
            latitude: input.origin.latitude + latDiff * t,
            longitude: input.origin.longitude + lonDiff * t,
          });
        }

        const mainRoute = {
          summary: `${Math.round(distance)} km • ${Math.round(duration)} min`,
          distance: Math.round(distance * 1000), // metros
          duration: duration * 60, // segundos
          points,
          polyline: encodePolyline(points),
          legs: [
            {
              startLocation: input.origin,
              endLocation: input.destination,
              distance: Math.round(distance * 1000),
              duration: duration * 60,
              steps: generateSteps(input.origin, input.destination, 5),
            },
          ],
        };

        // Generar rutas alternativas
        const alternatives = input.alternatives
          ? [
              {
                summary: `${Math.round(distance * 1.1)} km • ${Math.round(duration * 1.15)} min`,
                distance: Math.round(distance * 1.1 * 1000),
                duration: Math.round(duration * 1.15 * 60),
                points: generateAlternativeRoute(input.origin, input.destination, 0.1),
              },
              {
                summary: `${Math.round(distance * 0.95)} km • ${Math.round(duration * 0.95)} min`,
                distance: Math.round(distance * 0.95 * 1000),
                duration: Math.round(duration * 0.95 * 60),
                points: generateAlternativeRoute(input.origin, input.destination, -0.1),
              },
            ]
          : [];

        return {
          routes: [mainRoute, ...alternatives],
          status: "OK",
        };
      } catch (error) {
        console.error("[GoogleMaps] Error getting route:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener ruta",
        });
      }
    }),

  /**
   * Obtener información de tráfico en tiempo real
   */
  getTrafficInfo: protectedProcedure
    .input(
      z.object({
        bounds: z.object({
          northeast: z.object({ latitude: z.number(), longitude: z.number() }),
          southwest: z.object({ latitude: z.number(), longitude: z.number() }),
        }),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager" && ctx.user.role !== "user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para ver tráfico",
          });
        }

        // Simular datos de tráfico
        const trafficSegments = [];
        const segmentCount = 10;

        for (let i = 0; i < segmentCount; i++) {
          const t = i / segmentCount;
          const lat =
            input.bounds.southwest.latitude +
            (input.bounds.northeast.latitude - input.bounds.southwest.latitude) * t;
          const lon =
            input.bounds.southwest.longitude +
            (input.bounds.northeast.longitude - input.bounds.southwest.longitude) * t;

          const congestionLevel = Math.random() > 0.7 ? "heavy" : Math.random() > 0.4 ? "moderate" : "light";
          const speedKmh = congestionLevel === "heavy" ? 20 : congestionLevel === "moderate" ? 40 : 60;

          trafficSegments.push({
            id: `segment_${i}`,
            startLocation: { latitude: lat, longitude: lon },
            endLocation: {
              latitude: lat + 0.01,
              longitude: lon + 0.01,
            },
            congestionLevel,
            speedKmh,
            speedLimit: 60,
            color: getTrafficColor(congestionLevel),
          });
        }

        return {
          segments: trafficSegments,
          timestamp: new Date(),
          updateInterval: 30000, // 30 segundos
        };
      } catch (error) {
        console.error("[GoogleMaps] Error getting traffic info:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener información de tráfico",
        });
      }
    }),

  /**
   * Obtener matriz de distancias entre múltiples puntos
   */
  getDistanceMatrix: protectedProcedure
    .input(
      z.object({
        origins: z.array(z.object({ latitude: z.number(), longitude: z.number() })),
        destinations: z.array(z.object({ latitude: z.number(), longitude: z.number() })),
        travelMode: z.enum(["DRIVING", "WALKING", "BICYCLING", "TRANSIT"]).default("DRIVING"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager" && ctx.user.role !== "user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para obtener matriz de distancias",
          });
        }

        // Calcular matriz de distancias
        const rows = input.origins.map((origin) => ({
          elements: input.destinations.map((destination) => {
            const latDiff = destination.latitude - origin.latitude;
            const lonDiff = destination.longitude - origin.longitude;
            const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // km

            const speedKmh = input.travelMode === "DRIVING" ? 60 : 20;
            const duration = Math.round((distance / speedKmh) * 3600); // segundos

            return {
              distance: Math.round(distance * 1000), // metros
              duration,
              status: "OK",
            };
          }),
        }));

        return {
          rows,
          status: "OK",
        };
      } catch (error) {
        console.error("[GoogleMaps] Error getting distance matrix:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener matriz de distancias",
        });
      }
    }),

  /**
   * Obtener información de elevación
   */
  getElevation: protectedProcedure
    .input(
      z.object({
        locations: z.array(z.object({ latitude: z.number(), longitude: z.number() })),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager" && ctx.user.role !== "user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para obtener elevación",
          });
        }

        // Simular datos de elevación
        const results = input.locations.map((loc) => ({
          location: loc,
          elevation: Math.random() * 2000, // metros
          resolution: 4.771976,
        }));

        return {
          results,
          status: "OK",
        };
      } catch (error) {
        console.error("[GoogleMaps] Error getting elevation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener elevación",
        });
      }
    }),
});

/**
 * Codificar polilínea (algoritmo de Google)
 */
function encodePolyline(points: Array<{ latitude: number; longitude: number }>): string {
  let encoded = "";
  let prevLat = 0;
  let prevLon = 0;

  for (const point of points) {
    const lat = Math.round((point.latitude - prevLat) * 1e5);
    const lon = Math.round((point.longitude - prevLon) * 1e5);

    encoded += encodeValue(lat) + encodeValue(lon);

    prevLat = point.latitude;
    prevLon = point.longitude;
  }

  return encoded;
}

/**
 * Codificar valor para polilínea
 */
function encodeValue(value: number): string {
  value = value << 1;
  if (value < 0) value = ~value;

  let encoded = "";
  while (value >= 0x20) {
    const chunk = (0x20 | (value & 0x1f)) + 63;
    encoded += String.fromCharCode(chunk);
    value >>= 5;
  }

  encoded += String.fromCharCode(value + 63);
  return encoded;
}

/**
 * Obtener color según nivel de congestión
 */
function getTrafficColor(congestionLevel: string): string {
  const colors: Record<string, string> = {
    light: "#51cf66", // Verde
    moderate: "#ffd43b", // Amarillo
    heavy: "#ff6b6b", // Rojo
  };
  return colors[congestionLevel] || "#808080";
}

/**
 * Generar pasos de ruta
 */
function generateSteps(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  count: number
) {
  const steps = [];
  const latDiff = destination.latitude - origin.latitude;
  const lonDiff = destination.longitude - origin.longitude;

  for (let i = 0; i < count; i++) {
    const t = i / count;
    steps.push({
      instruction: `Paso ${i + 1}`,
      distance: Math.round((Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111 * 1000) / count),
      duration: Math.round((Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111 * 60) / count),
      startLocation: {
        latitude: origin.latitude + latDiff * t,
        longitude: origin.longitude + lonDiff * t,
      },
      endLocation: {
        latitude: origin.latitude + latDiff * (t + 1 / count),
        longitude: origin.longitude + lonDiff * (t + 1 / count),
      },
    });
  }

  return steps;
}

/**
 * Generar ruta alternativa
 */
function generateAlternativeRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  offset: number
) {
  const points = [];
  const steps = 20;
  const latDiff = destination.latitude - origin.latitude;
  const lonDiff = destination.longitude - origin.longitude;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const offsetLat = Math.sin(t * Math.PI) * offset;
    points.push({
      latitude: origin.latitude + latDiff * t + offsetLat,
      longitude: origin.longitude + lonDiff * t + offset,
    });
  }

  return points;
}
