import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { installedApps, devices } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * App Manager Router
 * Gestiona aplicaciones instaladas en dispositivos
 */
export const appManagerRouter = router({
  /**
   * Obtener lista de aplicaciones instaladas
   */
  getInstalledApps: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        filterSystemApps: z.boolean().default(false),
        searchQuery: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para acceder a aplicaciones",
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        // Construir condiciones de búsqueda
        const whereConditions = [eq(installedApps.deviceId, input.deviceId)];

        if (!input.filterSystemApps) {
          whereConditions.push(eq(installedApps.isSystemApp, false));
        }

        // Obtener aplicaciones
        const apps = await (db as any).query.installedApps.findMany({
          where: and(...whereConditions),
          limit: input.limit,
          offset: input.offset,
          orderBy: (table: any) => table.appName,
        });

        // Filtrar por búsqueda si se proporciona
        let filteredApps = apps;
        if (input.searchQuery) {
          const query = input.searchQuery.toLowerCase();
          filteredApps = apps.filter(
            (app: any) =>
              app.appName.toLowerCase().includes(query) ||
              app.packageName.toLowerCase().includes(query)
          );
        }

        // Obtener total
        const total = await (db as any).query.installedApps.findMany({
          where: and(...whereConditions),
        });

        return {
          apps: filteredApps.map((app: any) => ({
            id: app.id,
            name: app.appName,
            packageName: app.packageName,
            version: app.version,
            versionCode: app.versionCode,
            isSystemApp: app.isSystemApp,
            installTime: app.installTime,
            updateTime: app.updateTime,
          })),
          total: total.length,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("[AppManager] Error getting installed apps:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener aplicaciones instaladas",
        });
      }
    }),

  /**
   * Instalar aplicación en dispositivo
   */
  installApp: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        packageName: z.string(),
        appName: z.string(),
        apkUrl: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para instalar aplicaciones",
          });
        }

        // Simular instalación
        return {
          success: true,
          deviceId: input.deviceId,
          packageName: input.packageName,
          appName: input.appName,
          status: "installing",
          progress: 0,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[AppManager] Error installing app:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al instalar aplicación",
        });
      }
    }),

  /**
   * Desinstalar aplicación del dispositivo
   */
  uninstallApp: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        packageName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para desinstalar aplicaciones",
          });
        }

        // Simular desinstalación
        return {
          success: true,
          deviceId: input.deviceId,
          packageName: input.packageName,
          status: "uninstalling",
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[AppManager] Error uninstalling app:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al desinstalar aplicación",
        });
      }
    }),

  /**
   * Obtener información detallada de una aplicación
   */
  getAppInfo: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        packageName: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para acceder a información de aplicaciones",
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        // Obtener información de la aplicación
        const app = await (db as any).query.installedApps.findFirst({
          where: and(
            eq(installedApps.deviceId, input.deviceId),
            eq(installedApps.packageName, input.packageName)
          ),
        });

        if (!app) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aplicación no encontrada",
          });
        }

        return {
          id: app.id,
          name: app.appName,
          packageName: app.packageName,
          version: app.version,
          versionCode: app.versionCode,
          isSystemApp: app.isSystemApp,
          installTime: app.installTime,
          updateTime: app.updateTime,
          permissions: getAppPermissions(app.packageName),
          size: Math.floor(Math.random() * 100 * 1024 * 1024), // Simular tamaño
          category: getAppCategory(app.packageName),
        };
      } catch (error) {
        console.error("[AppManager] Error getting app info:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener información de aplicación",
        });
      }
    }),

  /**
   * Obtener estadísticas de aplicaciones
   */
  getAppStats: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para acceder a estadísticas",
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        // Obtener todas las aplicaciones
        const allApps = await (db as any).query.installedApps.findMany({
          where: eq(installedApps.deviceId, input.deviceId),
        });

        const systemApps = allApps.filter((app: any) => app.isSystemApp);
        const userApps = allApps.filter((app: any) => !app.isSystemApp);

        return {
          totalApps: allApps.length,
          systemApps: systemApps.length,
          userApps: userApps.length,
          lastUpdated: new Date(),
        };
      } catch (error) {
        console.error("[AppManager] Error getting app stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener estadísticas de aplicaciones",
        });
      }
    }),

  /**
   * Lanzar aplicación en dispositivo
   */
  launchApp: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        packageName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para lanzar aplicaciones",
          });
        }

        // Simular lanzamiento
        return {
          success: true,
          deviceId: input.deviceId,
          packageName: input.packageName,
          status: "launched",
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[AppManager] Error launching app:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al lanzar aplicación",
        });
      }
    }),

  /**
   * Detener aplicación en dispositivo
   */
  stopApp: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        packageName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para detener aplicaciones",
          });
        }

        // Simular detención
        return {
          success: true,
          deviceId: input.deviceId,
          packageName: input.packageName,
          status: "stopped",
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[AppManager] Error stopping app:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al detener aplicación",
        });
      }
    }),

  /**
   * Limpiar caché de aplicación
   */
  clearAppCache: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        packageName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verificar permisos
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden limpiar caché",
          });
        }

        // Simular limpieza de caché
        return {
          success: true,
          deviceId: input.deviceId,
          packageName: input.packageName,
          clearedSize: Math.floor(Math.random() * 500 * 1024 * 1024), // 0-500 MB
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[AppManager] Error clearing app cache:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al limpiar caché",
        });
      }
    }),
});

/**
 * Función auxiliar para obtener permisos de aplicación
 */
function getAppPermissions(packageName: string): string[] {
  const commonPermissions: Record<string, string[]> = {
    "com.google.android.gms": [
      "android.permission.INTERNET",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
    ],
    "com.whatsapp": [
      "android.permission.INTERNET",
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_CONTACTS",
    ],
    "com.instagram.android": [
      "android.permission.INTERNET",
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
  };

  return commonPermissions[packageName] || [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
  ];
}

/**
 * Función auxiliar para obtener categoría de aplicación
 */
function getAppCategory(packageName: string): string {
  if (packageName.includes("google")) return "Google";
  if (packageName.includes("facebook")) return "Social";
  if (packageName.includes("whatsapp")) return "Communication";
  if (packageName.includes("instagram")) return "Social";
  if (packageName.includes("spotify")) return "Music";
  if (packageName.includes("netflix")) return "Entertainment";
  return "Other";
}
