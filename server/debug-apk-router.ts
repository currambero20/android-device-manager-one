import path from "path";
import { fileURLToPath } from "url";

async function run() {
  try {
    console.log("Importing apkRouter in isolation...");
    const router = await import("./routers/apkRouter.ts");
    console.log("Import succeeded!");
    process.exit(0);
  } catch (err: any) {
    console.error("FATAL IMPORT ERROR:");
    console.error(err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}
run();
