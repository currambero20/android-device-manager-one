import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config();

const REQUIRED_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY"
];

console.log("🔍 Verificando Variables de Entorno...");

const missing = REQUIRED_VARS.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error("❌ Faltan las siguientes variables críticas:");
  missing.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
}

console.log("✅ Todas las variables requeridas están presentes.");
process.exit(0);
