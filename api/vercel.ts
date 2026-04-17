import { createServer as createHttpServer } from "http";

export default async function handler(req: any, res: any) {
  try {
    const { app } = await import("../../server/_core/index.js");
    const httpServer = createHttpServer(app);
    
    await new Promise<void>((resolve) => {
      httpServer.once("request", (_req: any, _res: any) => {
        _res.on("finish", resolve);
      });
      httpServer.emit("request", req, res);
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}