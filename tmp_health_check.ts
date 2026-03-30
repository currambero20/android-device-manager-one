import { getDb, getHealthStatus } from "./server/db";

async function check() {
  console.log("Checking DB Health...");
  const status = await getHealthStatus();
  console.log("Status:", JSON.stringify(status, null, 2));
  
  if (status.status === "connected") {
    const db = await getDb();
    if (db) {
       console.log("Successfully retrieved DB instance.");
    }
  }
}

check().catch(console.error);
