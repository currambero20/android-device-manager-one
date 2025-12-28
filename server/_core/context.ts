import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/express";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "./sdk";
import * as db from "../db";

export async function createContext(
  opts: FetchCreateContextFnOptions,
) {
  const { req, res } = opts;
  const token = req.cookies[COOKIE_NAME];

  let user = null;

  if (token) {
    try {
      // Verificar el token con el SDK
      const sessionData = await sdk.verifySessionToken(token);
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
      // Token inválido, continuar sin usuario
    }
  }

  return {
    req,
    res,
    user: user || null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;