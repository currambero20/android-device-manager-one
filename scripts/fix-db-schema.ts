import mysql from "mysql2/promise";
import "dotenv/config";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing!");
    process.exit(1);
  }

  console.log("Connecting to database (SSL enabled)...");
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: true
    }
  });

  try {
    console.log("Checking 'devices' table schema...");
    const [rows]: any = await connection.execute("DESCRIBE devices");
    const columns = rows.map((r: any) => r.Field.toLowerCase());

    const requiredColumns = [
      { name: "signalStrength", type: "INT NULL" },
      { name: "storageUsed", type: "BIGINT NULL" },
      { name: "storageTotal", type: "BIGINT NULL" },
      { name: "isStealthMode", type: "BOOLEAN NOT NULL DEFAULT FALSE" }
    ];

    for (const col of requiredColumns) {
      if (!columns.includes(col.name.toLowerCase())) {
        console.log(`Adding missing column: ${col.name}`);
        await connection.execute(`ALTER TABLE devices ADD COLUMN \`${col.name}\` ${col.type}`);
      } else {
        console.log(`Column exists: ${col.name}`);
      }
    }

    console.log("Database schema fixed successfully!");
  } catch (error) {
    console.error("Error fixing database:", error);
  } finally {
    await connection.end();
  }
}

main();
