import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { runMigrations } from "../db";

async function startServer() {
  // Run database migrations on startup
  await runMigrations();

  const app = express();
  const server = createServer(app);

  // ✅ CORS CONFIGURADO PARA VERCEL
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = [
        "https://repodeploy.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
      ];
      // Allow requests with no origin (mobile apps, curl, etc) in development
      if (!origin) {
        callback(null, true);
        return;
      }
      // Check if origin matches any allowed pattern
      if (
        allowedOrigins.includes(origin) ||
        origin.match(/\.vercel\.app$/) ||
        origin.match(/localhost/)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  };
  app.use(cors(corsOptions));

  app.use(cookieParser());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Webhook for GitHub Actions to upload compiled APK
  app.post("/api/apk/webhook/:buildId", express.raw({ type: "*/*", limit: "150mb" }), async (req, res) => {
    try {
      const { buildId } = req.params;
      const buffer = req.body;
      if (!buffer || !Buffer.isBuffer(buffer)) {
         return res.status(400).json({ error: "Invalid file buffer" });
      }
      
      const { getAPKBuilder } = await import("./apkBuilder");
      const builder = getAPKBuilder();
      await builder.saveAPK(buildId, buffer);
      
      res.json({ success: true, message: "APK received and saved" });
    } catch (err) {
      console.error("[Server] Webhook APK save error:", err);
      res.status(500).json({ error: "Failed to save APK" });
    }
  });

  // Webhook for failure notification
  app.post("/api/apk/webhook/status/:buildId", express.json(), async (req, res) => {
    try {
      const { buildId } = req.params;
      const { status } = req.body;
      if (status === "failed") {
        const { getAPKBuilder } = await import("./apkBuilder");
        const builder = getAPKBuilder();
        await builder.markBuildFailed(buildId);
      }
      res.json({ success: true });
    } catch(err) {
      console.error("[Server] Webhook Status error:", err);
      res.status(500).json({ error: "Failed to process status webhook" });
    }
  });

  // Registrar rutas de OAuth
  registerOAuthRoutes(app);

  // TRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ path, error }) => {
        console.error(`[tRPC Error] Path: ${path}`, error);
      },
    })
  );

  // Health check
  app.get("/", async (req, res) => {
    const dbStatus = await (await import("../db")).getHealthStatus();
    res.json({ 
      message: "Backend is running (V3.25 - Secure Production Fix)",
      database: dbStatus,
      dbProtocol: process.env.DATABASE_URL?.substring(0, 10)
    });
  });

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Backend V3.25 started on port ${port}`);
    console.log(`[Server] Database URL Configured: ${process.env.DATABASE_URL ? "Yes" : "No"}`);
  });
}

startServer().catch(console.error);
