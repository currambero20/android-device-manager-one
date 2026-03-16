import { z } from "zod";
import { publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { SignJWT } from "jose";
import * as db from "../db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "android-device-manager-super-secret-key-2024"
);

const COOKIE_NAME = "session_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Password hash using Web Crypto API (no external deps)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt-adm-2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return hashed === hash;
}

async function createSessionToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

function setCookie(res: any, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Login procedure - exported individually so it can be added to the auth sub-router
 */
export const loginProcedure = publicProcedure
  .input(
    z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const dbInstance = await db.getDb();

    // No DB - use env var admin credentials (fallback mode)
    if (!dbInstance) {
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

      if (input.username !== adminUsername || input.password !== adminPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciales incorrectas",
        });
      }

      const token = await createSessionToken({
        sub: "admin-fallback",
        openId: "admin-fallback",
        name: "Administrador",
        email: "admin@device-manager.local",
        role: "admin",
        loginMethod: "local",
      });

      setCookie(ctx.res, token);

      return {
        success: true,
        user: {
          id: 0,
          name: "Administrador",
          email: "admin@device-manager.local",
          role: "admin",
        },
      };
    }

    // DB available - look up user by email/username
    const user = await db.getUserByEmail(input.username);
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciales incorrectas" });
    }

    if (!user.passwordHash) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Este usuario no tiene contraseña local configurada",
      });
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciales incorrectas" });
    }

    const token = await createSessionToken({
      sub: String(user.id),
      openId: user.openId || String(user.id),
      name: user.name || input.username,
      email: user.email || input.username,
      role: user.role || "user",
      loginMethod: "local",
    });

    setCookie(ctx.res, token);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  });

/**
 * Register procedure - for creating new local users (requires admin key)
 */
export const registerProcedure = publicProcedure
  .input(
    z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      name: z.string().optional(),
      role: z.enum(["admin", "manager", "user", "viewer"]).default("user"),
      adminKey: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const expectedAdminKey = process.env.ADMIN_REGISTRATION_KEY || "adm-register-2024";

    if (input.adminKey !== expectedAdminKey) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Clave de administrador incorrecta",
      });
    }

    const passwordHash = await hashPassword(input.password);
    const dbInstance = await db.getDb();

    if (!dbInstance) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Base de datos no disponible",
      });
    }

    await db.upsertUser({
      openId: `local-${input.username}-${Date.now()}`,
      name: input.name || input.username,
      email: input.username,
      role: input.role,
      loginMethod: "local",
      passwordHash,
    });

    return { success: true, message: "Usuario creado correctamente" };
  });
