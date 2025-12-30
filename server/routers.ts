import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
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

export const appRouter = router({
  /**
   * Authentication routes
   */
  auth: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }
      return ctx.user;
    }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // Two-factor authentication
    twoFactor: authRouter,
  }),

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
});

export type AppRouter = typeof appRouter;
