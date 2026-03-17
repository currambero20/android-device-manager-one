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

  // Registrar rutas de OAuth
  registerOAuthRoutes(app);

  // TRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Health check
  app.get("/", async (req, res) => {
    const dbStatus = await (await import("../db")).getHealthStatus();
    res.json({ 
      message: "Backend is running (V3.4 - Diagnostics)",
      database: dbStatus 
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
