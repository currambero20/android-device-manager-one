const { getDb } from "./server/db";
const { auditLogs } = require("./drizzle/schema");
const { desc } = require("drizzle-orm");

async function dumpLogs() {
  const db = await getDb();
  if (!db) {
    console.log("DB not available");
    return;
  }
  const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(20);
  console.log(JSON.stringify(logs, null, 2));
  process.exit(0);
}

dumpLogs().catch(err => {
  console.error(err);
  process.exit(1);
});
