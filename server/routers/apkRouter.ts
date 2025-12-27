import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getAPKBuilder, type APKConfig } from "../apkBuilder";
import { getDb } from "../db";
import { apkBuilds } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Validation schemas
const buildConfigSchema = z.object({
  appName: z.string().min(1).max(255),
  packageName: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/),
  versionName: z.string().regex(/^\d+\.\d+\.\d+$/),
  versionCode: z.number().int().positive(),
  stealthMode: z.boolean().default(false),
  sslEnabled: z.boolean().default(true),
  ports: z.array(z.number().int().min(1).max(65535)).min(1),
  serverUrl: z.string().url(),
  iconUrl: z.string().url().optional(),
});

export const apkRouter = router({
  /**
   * Start APK build
   */
  buildAPK: protectedProcedure
    .input(buildConfigSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const apkBuilder = getAPKBuilder();
        const result = await apkBuilder.buildAPK(input as APKConfig, ctx.user.id);

        return {
          success: result.success,
          buildId: result.buildId,
          apkUrl: result.apkUrl,
          error: result.error,
          status: result.status,
        };
      } catch (error) {
        console.error("[APK Router] Build error:", error);
        throw new Error(error instanceof Error ? error.message : "Build failed");
      }
    }),

  /**
   * Get build status
   */
  getBuildStatus: protectedProcedure
    .input(z.object({ buildId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database not available");
        }

        const build = await db
          .select()
          .from(apkBuilds)
          .where(eq(apkBuilds.buildId, input.buildId))
          .limit(1);

        if (build.length === 0) {
          throw new Error("Build not found");
        }

        const buildRecord = build[0];

        // Check if user has permission to view this build
        if (buildRecord.createdBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        return {
          buildId: buildRecord.buildId,
          appName: buildRecord.appName,
          packageName: buildRecord.packageName,
          status: buildRecord.status,
          fileSize: Number(buildRecord.fileSize),
          downloadCount: buildRecord.downloadCount,
          createdAt: buildRecord.createdAt,
          apkUrl: buildRecord.apkUrl,
        };
      } catch (error) {
        console.error("[APK Router] Status check error:", error);
        throw new Error(error instanceof Error ? error.message : "Status check failed");
      }
    }),

  /**
   * List user's APK builds
   */
  listBuilds: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database not available");
        }

        // For admin, show all builds; for others, show only their builds
        const builds = ctx.user.role === "admin"
          ? await db.select().from(apkBuilds).limit(input.limit).offset(input.offset)
          : await db
              .select()
              .from(apkBuilds)
              .where(eq(apkBuilds.createdBy, ctx.user.id))
              .limit(input.limit)
              .offset(input.offset);

        return builds.map((build) => ({
          buildId: build.buildId,
          appName: build.appName,
          packageName: build.packageName,
          versionName: build.versionName,
          status: build.status,
          fileSize: build.fileSize,
          downloadCount: build.downloadCount,
          createdAt: build.createdAt,
          apkUrl: build.apkUrl,
        }));
      } catch (error) {
        console.error("[APK Router] List error:", error);
        throw new Error(error instanceof Error ? error.message : "List failed");
      }
    }),

  /**
   * Delete APK build
   */
  deleteBuild: protectedProcedure
    .input(z.object({ buildId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database not available");
        }

        // Get build record
        const builds = await db
          .select()
          .from(apkBuilds)
          .where(eq(apkBuilds.buildId, input.buildId))
          .limit(1);

        if (builds.length === 0) {
          throw new Error("Build not found");
        }

        const build = builds[0];

        // Check permissions
        if (build.createdBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        // Delete from database
        await db.delete(apkBuilds).where(eq(apkBuilds.buildId, input.buildId));

        // Clean up build artifacts
        const apkBuilder = getAPKBuilder();
        await apkBuilder.cleanupBuild(input.buildId);

        return { success: true };
      } catch (error) {
        console.error("[APK Router] Delete error:", error);
        throw new Error(error instanceof Error ? error.message : "Delete failed");
      }
    }),

  /**
   * Get build statistics
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const builds = ctx.user.role === "admin"
        ? await db.select().from(apkBuilds)
        : await db
            .select()
            .from(apkBuilds)
            .where(eq(apkBuilds.createdBy, ctx.user.id));

      const stats = {
        totalBuilds: builds.length,
        successfulBuilds: builds.filter((b) => b.status === "ready").length,
        failedBuilds: builds.filter((b) => b.status === "failed").length,
        totalDownloads: builds.reduce((sum, b) => sum + (Number(b.downloadCount) || 0), 0),
        totalSize: builds.reduce((sum, b) => sum + (Number(b.fileSize) || 0), 0),
      };

      return stats;
    } catch (error) {
      console.error("[APK Router] Statistics error:", error);
      throw new Error(error instanceof Error ? error.message : "Statistics failed");
    }
  }),

  /**
   * Validate APK configuration
   */
  validateConfig: protectedProcedure
    .input(buildConfigSchema)
    .query(async ({ input }) => {
      try {
        // Validate package name format
        if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/.test(input.packageName)) {
          return {
            valid: false,
            errors: ["Invalid package name format"],
          };
        }

        // Validate version format
        if (!/^\d+\.\d+\.\d+$/.test(input.versionName)) {
          return {
            valid: false,
            errors: ["Version must be in format X.Y.Z"],
          };
        }

        // Validate ports
        if (input.ports.some((p) => p < 1 || p > 65535)) {
          return {
            valid: false,
            errors: ["Ports must be between 1 and 65535"],
          };
        }

        // Validate app name
        if (input.appName.length < 1 || input.appName.length > 255) {
          return {
            valid: false,
            errors: ["App name must be between 1 and 255 characters"],
          };
        }

        return {
          valid: true,
          errors: [],
        };
      } catch (error) {
        console.error("[APK Router] Validation error:", error);
        return {
          valid: false,
          errors: ["Validation failed"],
        };
      }
    }),
});

export type APKRouter = typeof apkRouter;
