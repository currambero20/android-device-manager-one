import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ✅ CORS CONFIGURADO PARA VERCEL
  app.use(cors({
    origin: [
      "https://repodeploy.vercel.app",
      "http://localhost:3000",
      "http://localhost:5173",
      /\.vercel\.app$/
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

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
  app.get("/", (req, res) => {
    res.json({ message: "Backend is running" });
  });

  // Servir frontend estático si está en desarrollo
  if (process.env.NODE_ENV === "development") {
    serveStatic(app);
  }

  const port = process.env.PORT || 3000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
