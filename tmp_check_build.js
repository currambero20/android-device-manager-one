const { getDb } = require("./server/db");
const { apkBuilds } = require("./drizzle/schema");
const { desc } = require("drizzle-orm");

async function checkLogs() {
  const db = await getDb();
  if (!db) {
    console.log("No DB connection");
    process.exit(1);
  }
  const results = await db.select().from(apkBuilds).orderBy(desc(apkBuilds.id)).limit(1);
  if (results.length > 0) {
    console.log("---- LOGS DE LA ULTIMA COMPILACION ----");
    console.log("ID:", results[0].id);
    console.log("Status:", results[0].status);
    console.log("App Name:", results[0].appName);
    console.log("Logs (serverUrl field):", results[0].serverUrl);
  } else {
    console.log("No se encontraron builds.");
  }
}

checkLogs().catch(console.error);
