import { apkCompiler } from "./server/apkCompiler.js";

async function verifyBuild() {
  console.log("Starting Local APK Verification...");
  try {
    const config = {
      buildId: 9999,
      appName: "Platinum Test App",
      packageName: "com.platinum.test",
      versionCode: 1,
      versionName: "1.0.0",
      stealthMode: false,
      enableSSL: true,
      ports: [3000],
      payloadCode: "http://192.168.1.100:3000",
      obfuscate: false,
      targetArchitectures: ["arm64-v8a", "armeabi-v7a"]
    };

    const result = await apkCompiler.compileAPK(config);
    if (result.success) {
      console.log("SUCCESS! APK Generated at:", result.apkPath);
      console.log("SUCCESS LOGS:\n" + result.logs.join('\n'));
    } else {
      console.log("FAILED to compile APK");
      console.log("FAILED ERROR:", result.error);
      console.log("FAILED LOGS:", result.logs.join('\n'));
    }
  } catch (error: any) {
    console.error("CRITICAL EXCEPTION:", error.stack || error.message);
  }
}

verifyBuild();
