import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  upsertUser,
  getUserByOpenId,
  getAllPermissions,
  getUserPermissions,
  getDevicesByOwnerId,
  getAllDevices,
  getAuditLogsByUserId,
  getAuditLogsByDeviceId,
  createAuditLog,
} from "./db";
import { apkRouter } from "./routers/apkRouter";
import { remoteControlRouter } from "./routers/remoteControlRouter";
import { analyticsRouter } from "./routers/analyticsRouter";
import { geofencingRouter } from "./routers/geofencingRouter";
import { advancedMonitoringRouter } from "./routers/advancedMonitoringRouter";
import { permissionsRouter } from "./routers/permissionsRouter";
import { fileExplorerRouter } from "./routers/fileExplorerRouter";
import { appManagerRouter } from "./routers/appManagerRouter";
import { mapsRouter } from "./routers/mapsRouter";
import { googleMapsRouter } from "./routers/googleMapsRouter";

/**
 * Admin-only procedure - restricts access to admin users only
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

/**
 * Manager or higher procedure - restricts access to managers and admins
 */
const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Manager access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  /**
   * Authentication routes
   */
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  /**
   * User management routes
   */
  users: router({
    /**
     * Get current user profile
     */
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserByOpenId(ctx.user.openId);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      return user;
    }),

    /**
     * Get all users (admin only)
     */
    getAll: adminProcedure.query(async () => {
      // TODO: Implement getAllUsers query in db.ts
      return [];
    }),

    /**
     * Get user by ID (admin only)
     */
    getById: adminProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
      // TODO: Implement getUserById query in db.ts
      return null;
    }),

    /**
     * Update user (admin only)
     */
    update: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          role: z.enum(["admin", "manager", "user", "viewer"]).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // TODO: Implement updateUser mutation in db.ts
        await createAuditLog({
          userId: ctx.user.id,
          action: "user_updated",
          actionType: "user_updated",
          resourceType: "user",
          resourceId: String(input.userId),
          status: "success",
        });
        return { success: true };
      }),

    /**
     * Delete user (admin only)
     */
    delete: adminProcedure.input(z.object({ userId: z.number() })).mutation(async ({ input, ctx }) => {
      // TODO: Implement deleteUser mutation in db.ts
      await createAuditLog({
        userId: ctx.user.id,
        action: "user_deleted",
        actionType: "user_deleted",
        resourceType: "user",
        resourceId: String(input.userId),
        status: "success",
      });
      return { success: true };
    }),

    /**
     * Get user permissions
     */
    getPermissions: protectedProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const targetUserId = input.userId || ctx.user.id;
        // Only admins can view other users' permissions
        if (targetUserId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await getUserPermissions(targetUserId);
      }),
  }),

  /**
   * Permission management routes
   */
  permissions: router({
    /**
     * Get all available permissions
     */
    getAll: protectedProcedure.query(async () => {
      return await getAllPermissions();
    }),

    /**
     * Grant permission to user (admin only)
     */
    grant: adminProcedure
      .input(z.object({ userId: z.number(), permissionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // TODO: Implement grantPermission mutation in db.ts
        await createAuditLog({
          userId: ctx.user.id,
          action: "permission_granted",
          actionType: "permission_granted",
          resourceType: "permission",
          resourceId: String(input.permissionId),
          details: { targetUserId: input.userId },
          status: "success",
        });
        return { success: true };
      }),

    /**
     * Revoke permission from user (admin only)
     */
    revoke: adminProcedure
      .input(z.object({ userId: z.number(), permissionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // TODO: Implement revokePermission mutation in db.ts
        await createAuditLog({
          userId: ctx.user.id,
          action: "permission_revoked",
          actionType: "permission_revoked",
          resourceType: "permission",
          resourceId: String(input.permissionId),
          details: { targetUserId: input.userId },
          status: "success",
        });
        return { success: true };
      }),
  }),

  /**
   * Device management routes
   */
  devices: router({
    /**
     * Get all devices owned by current user
     */
    getMyDevices: protectedProcedure.query(async ({ ctx }) => {
      return await getDevicesByOwnerId(ctx.user.id);
    }),

    /**
     * Get all devices (admin only)
     */
    getAll: adminProcedure.query(async () => {
      return await getAllDevices();
    }),

    /**
     * Get device by ID
     */
    getById: protectedProcedure.input(z.object({ deviceId: z.number() })).query(async ({ input, ctx }) => {
      // TODO: Implement device access control
      // TODO: Implement getDeviceById query in db.ts
      return null;
    }),

    /**
     * Register new device
     */
    register: protectedProcedure
      .input(
        z.object({
          deviceId: z.string(),
          deviceName: z.string(),
          manufacturer: z.string().optional(),
          model: z.string().optional(),
          androidVersion: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // TODO: Implement registerDevice mutation in db.ts
        await createAuditLog({
          userId: ctx.user.id,
          action: "device_added",
          actionType: "device_added",
          resourceType: "device",
          details: { deviceId: input.deviceId, deviceName: input.deviceName },
          status: "success",
        });
        return { success: true };
      }),

    /**
     * Remove device
     */
    remove: protectedProcedure.input(z.object({ deviceId: z.number() })).mutation(async ({ input, ctx }) => {
      // TODO: Implement device access control
      // TODO: Implement removeDevice mutation in db.ts
      await createAuditLog({
        userId: ctx.user.id,
        action: "device_removed",
        actionType: "device_removed",
        resourceType: "device",
        resourceId: String(input.deviceId),
        status: "success",
      });
      return { success: true };
    }),

    /**
     * Update device status
     */
    updateStatus: protectedProcedure
      .input(
        z.object({
          deviceId: z.number(),
          status: z.enum(["online", "offline", "inactive"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // TODO: Implement updateDeviceStatus mutation in db.ts
        return { success: true };
      }),
  }),

  /**
   * Audit logs routes
   */
  auditLogs: router({
    /**
     * Get audit logs for current user
     */
    getMyLogs: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input, ctx }) => {
        return await getAuditLogsByUserId(ctx.user.id, input.limit);
      }),

    /**
     * Get audit logs for specific device
     */
    getDeviceLogs: protectedProcedure
      .input(z.object({ deviceId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input, ctx }) => {
        // TODO: Implement device access control
        return await getAuditLogsByDeviceId(input.deviceId, input.limit);
      }),

    /**
     * Get all audit logs (admin only)
     */
    getAll: adminProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ input }) => {
        // TODO: Implement getAllAuditLogs query in db.ts
        return [];
      }),
  }),

  /**
   * APK Builder routes
   */
  apk: apkRouter,

  /**
   * Remote Control routes
   */
  remoteControl: remoteControlRouter,

  /**
   * Analytics routes
   */
  analytics: analyticsRouter,

  /**
   * Geofencing routes
   */
  geofencing: geofencingRouter,

  /**
   * Dashboard routes
   */
  dashboard: router({
    /**
     * Get dashboard metrics
     */
    getMetrics: protectedProcedure.query(async ({ ctx }) => {
      return {
        totalDevices: 0,
        onlineDevices: 0,
        totalUsers: 0,
        recentActivity: [],
        // TODO: Implement actual metrics queries
      };
    }),

    /**
     * Get overview data
     */
    getOverview: protectedProcedure.query(async ({ ctx }) => {
      return {
        devices: await getDevicesByOwnerId(ctx.user.id),
        recentLogs: await getAuditLogsByUserId(ctx.user.id, 10),
        // TODO: Add more overview data
      };
    }),
  }),

  advancedMonitoring: advancedMonitoringRouter,
  granularPermissions: permissionsRouter,
  fileExplorer: fileExplorerRouter,
  appManager: appManagerRouter,
  maps: mapsRouter,
  googleMaps: googleMapsRouter,
});

export type AppRouter = typeof appRouter;
