import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { sdk } from "./sdk";
import * as db from "../db";

export async function createContext(
  opts: CreateExpressContextOptions,
) {
  const { req, res } = opts;
  const sessionToken = req.cookies?.session_token;

  let user = null;

  if (!sessionToken) {
    return {
      req,
      res,
      user: null,
    };
  }

  if (sessionToken) {
    try {
      // Verificar el token con el SDK
      const sessionData = await sdk.verifySession(sessionToken);
      if (sessionData) {
        // Obtener información del usuario de la base de datos
        const dbUser = await db.getUserByOpenId(sessionData.openId);
        if (dbUser) {
          user = {
            id: dbUser.id,
            openId: dbUser.openId,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role || "user",
            loginMethod: dbUser.loginMethod,
          };
        }
      }
    } catch (error) {
      console.error("[Context] Token verification failed:", error);
    }
  }

  return {
    req,
    res,
    user,
  };
}

export type TrpcContext = Awaited<ReturnType<typeof createContext>>;