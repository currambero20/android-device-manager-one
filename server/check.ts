import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function check() {
  console.log("--- STARTING BOOT CHECK ---");
  try {
    console.log("1. Importing database...");
    const dbModule = await import("./db.ts");
    console.log("   Database module loaded.");

    console.log("2. Importing WebSocket...");
    const wsModule = await import("./websocket.ts");
    console.log("   WebSocket module loaded.");

    console.log("3. Importing Routers (ROOT)...");
    const routerModule = await import("./routers.ts");
    console.log("   Root Router module loaded.");

    console.log("4. Importing Active Tracking...");
    const trackingModule = await import("./activeTrackingService.ts");
    console.log("   ActiveTrackingService loaded.");

    console.log("--- ALL MODULES LOADED ---");
    process.exit(0);
  } catch (err: any) {
    console.error("!!! BOOT CHECK FAILED !!!");
    console.error("Message:", err?.message);
    console.error("Stack:", err?.stack);
    process.exit(1);
  }
}

check();
