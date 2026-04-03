// @ts-nocheck
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getSessionCookieOptions } from "./_core/cookies";
import { createAuditLog } from "./db";

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
import { loginProcedure, registerProcedure } from "./routers/localAuthRouter";
import { complianceRouter } from "./routers/complianceRouter";
import { mediaCaptureRouter } from "./routers/mediaCaptureRouter";
import { communicationsRouter } from "./routers/communicationsRouter";
import { notificationsRouter } from "./routers/notificationsRouter";

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
      const isProduction = process.env.NODE_ENV === "production";
      // Clear variations of the cookie to destroy any ghost session across different browser policies
      const policies = ["lax", "none", false, "strict"];
      policies.forEach(policy => {
        ctx.res.clearCookie(COOKIE_NAME, { path: "/", maxAge: -1, httpOnly: true, secure: isProduction, sameSite: policy as any });
        ctx.res.clearCookie("session_token", { path: "/", maxAge: -1, httpOnly: true, secure: isProduction, sameSite: policy as any });
      });


      
      if (ctx.user) {
        createAuditLog({
          userId: ctx.user.id,
          action: `Cierre de sesión: ${ctx.user.name || ctx.user.email}`,
          actionType: "user_logout",
          status: "success",
          details: { id: ctx.user.id },
          timestamp: new Date(),
        }).catch(err => console.error("[Audit] Logout log failed:", err));
      }

      return {
        success: true,
      } as const;
    }),

    // Local username/password authentication
    login: loginProcedure,
    register: registerProcedure,

    // Password recovery
    requestPasswordReset: authRouter.requestPasswordReset,
    resetPasswordWithToken: authRouter.resetPasswordWithToken,

    // Email-based 2FA
    verifyEmail2FA: authRouter.verifyEmail2FA,
    toggleTwoFactor: authRouter.toggleTwoFactor,
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
  // Compliance & DLP (Phase 3)
  compliance: complianceRouter,
  // Media (Camera/Mic)
  media: mediaCaptureRouter,
  // User Management
  users: usersRouter,
  // Notifications
  notifications: notificationsRouter,
  // Communications (SMS, Calls, Contacts, Camera, Vibrate, Lock) - Phase 3
  communications: communicationsRouter,
});

export type AppRouter = typeof appRouter;
