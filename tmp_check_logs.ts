import { getDb } from "./server/db";
import { auditLogs } from "./drizzle/schema";

async function checkLogs() {
  const db = await getDb();
  if (!db) {
    console.error("DB not available");
    return;
  }
  const logs = await db.select().from(auditLogs).limit(5);
  console.log("Last 5 audit logs:", JSON.stringify(logs, null, 2));
}

checkLogs().catch(console.error);
