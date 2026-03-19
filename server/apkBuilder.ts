import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getDb } from "./db";
import { apkBuilds } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface APKConfig {
  appName: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  stealthMode: boolean;
  sslEnabled: boolean;
  ports: number[];
  serverUrl: string;
  iconUrl?: string;
}

export interface BuildResult {
  success: boolean;
  buildId: string;
  apkPath?: string;
  apkUrl?: string;
  error?: string;
  progress: number;
  status: "pending" | "building" | "signing" | "completed" | "failed";
}

export class APKBuilder {
  private buildDir: string;
  private outputDir: string;

  constructor() {
    this.buildDir = path.join(process.cwd(), "builds");
    this.outputDir = path.join(this.buildDir, "outputs");
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.buildDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error("[APKBuilder] Failed to initialize directories:", error);
      throw error;
    }
  }

  async buildAPK(config: APKConfig, userId: number): Promise<BuildResult> {
    const buildId = `build-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    try {
      await this.initialize();

      const db = await getDb();
      if (db) {
        await db.insert(apkBuilds).values({
          buildId,
          createdBy: userId,
          appName: config.appName,
          packageName: config.packageName,
          versionName: config.versionName,
          versionCode: config.versionCode,
          stealthMode: config.stealthMode,
          sslEnabled: config.sslEnabled,
          ports: config.ports,
          serverUrl: config.serverUrl,
          status: "building",
          createdAt: new Date(),
        });
      }

      const githubToken = process.env.GITHUB_TOKEN;
      const githubRepo = process.env.GITHUB_REPO; // e.g. "currambero20/android-device-manager-one"
      const serverUrlStr = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || process.env.FRONTEND_URL || "https://your-server.render.com";
      const webhookUrl = `${serverUrlStr}/api/apk/webhook`;
      const configBase64 = Buffer.from(JSON.stringify(config)).toString("base64");

      if (!githubToken || !githubRepo) {
        throw new Error("GITHUB_TOKEN or GITHUB_REPO not configured in environment variables.");
      }

      // We use global fetch (available in Node 18+)
      const response = await fetch(`https://api.github.com/repos/${githubRepo}/actions/workflows/build-apk.yml/dispatches`, {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Authorization": `token ${githubToken}`,
          "Content-Type": "application/json",
          "User-Agent": "APKBuilder-Backend"
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            config_base64: configBase64,
            build_id: buildId,
            webhook_url: webhookUrl
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error: ${response.status} ${errorText}`);
      }

      return {
        success: true,
        buildId,
        apkUrl: `/api/apk/download/${buildId}`,
        progress: 10,
        status: "building",
      };
    } catch (error) {
      console.error(`[APKBuilder] Build failed for ${buildId}:`, error);

      const db = await getDb();
      if (db) {
        await db.update(apkBuilds)
          .set({ status: "failed" })
          .where(eq(apkBuilds.buildId, buildId));
      }

      return {
        success: false,
        buildId,
        error: error instanceof Error ? error.message : "Build failed",
        progress: 0,
        status: "failed",
      };
    }
  }

  async saveAPK(buildId: string, buffer: Buffer): Promise<void> {
    await this.initialize();
    const outputPath = path.join(this.outputDir, `${buildId}.apk`);
    await fs.writeFile(outputPath, buffer);
    console.log(`[APKBuilder] Saved APK for build ${buildId} (${buffer.length} bytes)`);

    const db = await getDb();
    if (db) {
      await db.update(apkBuilds)
        .set({ 
          status: "ready", 
          fileSize: buffer.length,
          apkUrl: `/api/apk/download/${buildId}` 
        })
        .where(eq(apkBuilds.buildId, buildId));
    }
  }

  async markBuildFailed(buildId: string): Promise<void> {
    const db = await getDb();
    if (db) {
      await db.update(apkBuilds)
        .set({ status: "failed" })
        .where(eq(apkBuilds.buildId, buildId));
      console.log(`[APKBuilder] Marked build ${buildId} as failed`);
    }
  }

  async getBuildStatus(buildId: string): Promise<BuildResult | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const dbBuilds = await db.select().from(apkBuilds).where(eq(apkBuilds.buildId, buildId)).limit(1);
      if (dbBuilds.length === 0) return null;
      const b = dbBuilds[0];
      return {
        success: b.status === "ready",
        buildId: b.buildId,
        apkUrl: b.apkUrl || undefined,
        status: b.status as any,
        progress: b.status === "ready" ? 100 : b.status === "building" ? 50 : 0
      };
    } catch (error) {
      console.error("[APKBuilder] Failed to get build status:", error);
      return null;
    }
  }

  async downloadAPK(buildId: string): Promise<Buffer | null> {
    try {
      const apkPath = path.join(this.outputDir, `${buildId}.apk`);
      return await fs.readFile(apkPath);
    } catch (error) {
      console.error("[APKBuilder] Failed to download APK:", error);
      return null;
    }
  }

  async cleanupBuild(buildId: string): Promise<void> {
    try {
      const apkPath = path.join(this.outputDir, `${buildId}.apk`);
      await fs.rm(apkPath, { force: true });
      const db = await getDb();
      if (db) {
         await db.delete(apkBuilds).where(eq(apkBuilds.buildId, buildId));
      }
      console.log(`[APKBuilder] Build artifacts cleaned: ${buildId}`);
    } catch (error) {
      console.error("[APKBuilder] Failed to cleanup build:", error);
    }
  }
}

// Singleton instance
let apkBuilder: APKBuilder | null = null;

export function getAPKBuilder(): APKBuilder {
  if (!apkBuilder) {
    apkBuilder = new APKBuilder();
  }
  return apkBuilder;
}
