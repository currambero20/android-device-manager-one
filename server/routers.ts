import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getSessionCookieOptions } from "./_core/cookies";

// Import all routers
import { authRouter } from "./routers/authRouter";
import { analyticsRouter } from "./routers/analyticsRouter";
import { apkRouter } from "./routers/apkRouter";
import { appManagerRouter } from "./routers/appManagerRouter";
import { fileExplorerRouter } from "./routers/fileExplorerRouter";
import { geofencingRouter } from "./routers/geofencingRouter";
import { mapsRouter } from "./routers/mapsRouter";
import { permissionsRouter } from "./routers/permissionsRouter";
import { remoteControlRouter } from "./routers/remoteControlRouter";
import { advancedMonitoringRouter } from "./routers/advancedMonitoringRouter";
import { auditLogsRouter } from "./routers/auditLogsRouter";
import { usersRouter } from "./routers/usersRouter";
import { devicesRouter } from "./routers/devicesRouter";
import { dashboardRouter } from "./routers/dashboardRouter";
import { localAuthRouter } from "./routers/localAuthRouter";

export const appRouter = router({
  /**
   * Authentication routes
   */
  auth: router({
    // ✅ FIXED: publicProcedure so unauthenticated users get null (not a 500 error)
    me: publicProcedure.query(async ({ ctx }) => {
      return ctx.user ?? null;
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      // Clear the session cookie
      ctx.res.clearCookie(COOKIE_NAME, { path: "/", maxAge: -1 });
      ctx.res.clearCookie("session_token", { path: "/", maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // Local username/password authentication
    login: localAuthRouter.login,
    register: localAuthRouter.register,

    // Two-factor authentication  
    twoFactor: authRouter,
  }),

  // Devices
  devices: devicesRouter,

  // Dashboard
  dashboard: dashboardRouter,

  // Analytics and monitoring
  analytics: analyticsRouter,
  advancedMonitoring: advancedMonitoringRouter,

  // Device management
  apk: apkRouter,
  appManager: appManagerRouter,
  fileExplorer: fileExplorerRouter,
  remoteControl: remoteControlRouter,

  // Location services
  geofencing: geofencingRouter,
  maps: mapsRouter,

  // Permissions
  permissions: permissionsRouter,

  // Audit Logs
  auditLogs: auditLogsRouter,

  // User Management
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
