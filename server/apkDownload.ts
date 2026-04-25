import { Request, Response } from "express";
import { getAPKBuilder } from "./apkBuilder";
import { getDb } from "./db";
import { apkBuilds } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import path from "path";

/**
 * Handle APK download request
 */
export async function handleAPKDownload(req: Request, res: Response): Promise<void> {
  try {
    const { buildId } = req.params;

    if (!buildId) {
      res.status(400).json({ error: "Build ID is required" });
      return;
    }

    // Get build info from database
    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database not available" });
      return;
    }

    const builds = await db
      .select()
      .from(apkBuilds)
      .where(eq(apkBuilds.buildId, buildId))
      .limit(1);

    if (builds.length === 0) {
      res.status(404).json({ error: "Build not found" });
      return;
    }

    const build = builds[0];

    // Check if build is ready
    if (build.status !== "ready") {
      res.status(400).json({ error: `Build status is ${build.status}` });
      return;
    }

    // Check expiration
    if (build.expiresAt && new Date(build.expiresAt) < new Date()) {
      res.status(410).json({ error: "Build has expired" });
      return;
    }

    // Get APK file
    const apkBuilder = getAPKBuilder();
    const apkBuffer = await apkBuilder.downloadAPK(buildId);

    if (!apkBuffer) {
      res.status(404).json({ error: "APK file not found" });
      return;
    }

    // Update download count
    await db
      .update(apkBuilds)
      .set({
        downloadCount: (build.downloadCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(apkBuilds.buildId, buildId));

    // Send file
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${build.appName}.apk"`);
    res.setHeader("Content-Length", apkBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");

    res.send(apkBuffer);

    console.log(`[APK Download] Downloaded: ${buildId} (${build.appName})`);
  } catch (error) {
    console.error("[APK Download] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Download failed",
    });
  }
}

/**
 * Get APK build info
 */
export async function getAPKInfo(req: Request, res: Response): Promise<void> {
  try {
    const { buildId } = req.params;

    if (!buildId) {
      res.status(400).json({ error: "Build ID is required" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database not available" });
      return;
    }

    const builds = await db
      .select()
      .from(apkBuilds)
      .where(eq(apkBuilds.buildId, buildId))
      .limit(1);

    if (builds.length === 0) {
      res.status(404).json({ error: "Build not found" });
      return;
    }

    const build = builds[0];

    res.json({
      buildId: build.buildId,
      appName: build.appName,
      packageName: build.packageName,
      versionName: build.versionName,
      versionCode: build.versionCode,
      status: build.status,
      fileSize: Number(build.fileSize),
      downloadCount: build.downloadCount,
      stealthMode: build.stealthMode,
      sslEnabled: build.sslEnabled,
      createdAt: build.createdAt,
      expiresAt: build.expiresAt,
    });
  } catch (error) {
    console.error("[APK Info] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Request failed",
    });
  }
}

/**
 * List all APK builds (admin only)
 */
export async function listAPKBuilds(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database not available" });
      return;
    }

    const builds = await db.select().from(apkBuilds);

    res.json(
      builds.map((build) => ({
        buildId: build.buildId,
        appName: build.appName,
        packageName: build.packageName,
        status: build.status,
        fileSize: Number(build.fileSize),
        downloadCount: build.downloadCount,
        createdAt: build.createdAt,
      }))
    );
  } catch (error) {
    console.error("[APK List] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Request failed",
    });
  }
}
