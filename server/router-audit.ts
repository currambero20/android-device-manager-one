import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function check() {
  console.log("--- ROUTER AUDIT START ---");
  try {
    console.log("Loading appRouter from routers.ts...");
    const { appRouter } = await import("./routers.ts");
    console.log("Success! appRouter keys:", Object.keys(appRouter._def.procedures));
    process.exit(0);
  } catch (err: any) {
    console.error("!!! ROUTER AUDIT FAILED !!!");
    console.error(err);
    process.exit(1);
  }
}

check();
