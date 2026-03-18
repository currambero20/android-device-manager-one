// @ts-nocheck
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
      try {
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
              twoFactorEnabled: dbUser.twoFactorEnabled ?? false,
              permissions: await db.getUserPermissions(dbUser.id),
            };
          }
        }
      } catch (dbErr) {
        console.warn("[Context] DB error during user lookup:", (dbErr as Error).message);
      }
      
      // Fallback to JWT payload when DB is not available or user not found in DB
      if (!user && payload.sub) {
        user = {
          id: payload.sub === "admin-local" ? 0 : parseInt(payload.sub as string, 10) || 0,
          openId: (payload.openId as string) || (payload.sub as string),
          name: (payload.name as string) || "Usuario",
          email: (payload.email as string) || "",
          role: (payload.role as string) || "user",
          loginMethod: (payload.loginMethod as string) || "local",
          permissions: (payload.permissions as string[]) || [],
        };
      }
    } catch (error) {
      // Invalid or expired token - user stays null
      console.warn("[Context] JWT verification failed:", (error as Error).message);
    }
  } else {
    // Si hay una cookie pero no se llama session_token, mostrar qué cookies hay para debug
    if (Object.keys(req.cookies || {}).length > 0) {
      console.log("[Context] No session_token found, but cookies present:", Object.keys(req.cookies));
    }
  }

  return {
    req,
    res,
    user,
  };
}

export type TrpcContext = Awaited<ReturnType<typeof createContext>>;