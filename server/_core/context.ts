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
      const sessionData = await sdk.verifySession(token);
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

  // Si no hay usuario autenticado, proporcionar un usuario invitado con rol de administrador
  // para permitir el acceso total sin login.
  if (!user) {
    user = {
      id: 0,
      openId: "guest-admin",
      name: "Guest Admin",
      email: "guest@example.com",
      role: "admin",
      loginMethod: "guest",
    };
  }

  return {
    req,
    res,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;