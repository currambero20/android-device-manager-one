import dotenv from "dotenv";
import path, { resolve, join } from "path";
import { fileURLToPath } from "url";

// ✅ CARGAR DOTENV DESDE LA RAÍZ DEL PROYECTO (Resuelve problemas de --prefix)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: resolve(join(__dirname, "../../.env")) });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../appRouter";
import { createContext } from "./context";
import { runMigrations } from "../db";

async function startServer() {
  // Run database migrations on startup
  await runMigrations();

  const app = express();
  const server = createServer(app);

  // ✅ CORS CONFIGURADO PARA VERCEL
  const corsOptions = {
    origin: [
      process.env.VITE_APP_URL || "http://localhost:5173",
      "https://repodeploy.vercel.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-TRPC-Source"]
  };

  app.use(cors(corsOptions));
  app.use(cookieParser());
  
  // Health check for auto-discovery
  app.get("/api/health", async (req, res) => {
    try {
      const os = await import("os");
      const networkInterfaces = os.networkInterfaces();
      const localIp = Object.values(networkInterfaces)
        .flat()
        .find(iface => iface?.family === 'IPv4' && !iface.internal)?.address || "localhost";
      
      const port = process.env.PORT || 3000;
      res.json({ 
        status: "ok",
        serverUrl: `http://${localIp}:${port}`,
      });
    } catch (e) {
      res.status(500).json({ status: "error" });
    }
  });

  // Initialize WebSocket server
  const { initializeWebSocket } = await import("../websocket");
  const wsManager = initializeWebSocket(server);

  // [MOD L3MON] Start Active Intelligence Tracking Service
  const { activeTrackingService } = await import("../activeTrackingService");
  activeTrackingService.start(wsManager);

  // [MOD L3MON] Register APK Download Route
  const { handleAPKDownload } = await import("../apkDownload");
  app.get("/api/apk/download/:buildId", handleAPKDownload);

  // [DEBUG] Temporarily disabled for boot check
  // registerOAuthRoutes(app);

  // TRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Backend Platinum V1.0 started on port ${port}`);
    console.log(`[Server] Database URL Configured: ${process.env.DATABASE_URL ? "Yes" : "No"}`);
  });
}

startServer().catch(console.error);
