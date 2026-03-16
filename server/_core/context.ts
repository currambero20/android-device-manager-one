import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { jwtVerify } from "jose";
import * as db from "../db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "android-device-manager-super-secret-key-2024"
);

export async function createContext(opts: CreateExpressContextOptions) {
  const { req, res } = opts;
  const sessionToken = req.cookies?.session_token;

  let user = null;

  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
      
      // Try to get fresh user data from DB, fall back to JWT payload
      const dbInstance = await db.getDb();
      if (dbInstance && payload.openId) {
        const dbUser = await db.getUserByOpenId(payload.openId as string);
        if (dbUser) {
          user = {
            id: dbUser.id,
            openId: dbUser.openId,
            name: dbUser.name || (payload.name as string),
            email: dbUser.email || (payload.email as string),
            role: dbUser.role || (payload.role as string) || "user",
            loginMethod: dbUser.loginMethod || "local",
          };
        }
      }
      
      // Fallback to JWT payload when DB is not available
      if (!user && payload.sub) {
        user = {
          id: payload.sub === "admin-fallback" ? 0 : parseInt(payload.sub as string, 10) || 0,
          openId: payload.openId as string || payload.sub as string,
          name: payload.name as string || "Usuario",
          email: payload.email as string || "",
          role: payload.role as string || "user",
          loginMethod: payload.loginMethod as string || "local",
        };
      }
    } catch (error) {
      // Invalid or expired token - user stays null
      console.warn("[Context] Invalid session token:", (error as Error).message);
    }
  }

  return {
    req,
    res,
    user,
  };
}

export type TrpcContext = Awaited<ReturnType<typeof createContext>>;