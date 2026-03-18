import { z } from "zod";
import { publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || decrypt("b1282eac0ca5bb38fc034e3208750a98:ed5e706c83693f1d86d63bb1a6311ae5bc608f10271500693a12903332be390a8809e255375ecf4fb2bc74c728362ab8")
);

const COOKIE_NAME = "session_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

import { hashPassword, setUserEmailOtp, createAuditLog } from "../db";
import { decrypt } from "../utils/crypto";

import { send2FAEmail } from "../services/mailService";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return hashPassword(password) === hash;
}

async function createSessionToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

function setCookie(res: any, token: string) {
  const isProduction = process.env.NODE_ENV === "production";
  
  if (res.cookie) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }
}

/**
 * Login procedure
 * 
 * Priority:
 * 1. Always check ENV VAR credentials first (admin/admin123 or custom via ADMIN_USERNAME / ADMIN_PASSWORD)
 * 2. Only try DB if env-var credentials don't match AND DB is available WITH passwordHash column
 * 
 * This ensures the system works even without a DB or before migrations run.
 */
export const loginProcedure = publicProcedure
  .input(
    z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    // ✅ STEP 1: Always check env-var admin credentials first (works without any DB)
    if (input.username === adminUsername && input.password === adminPassword) {
      const token = await createSessionToken({
        sub: "admin-local",
        openId: "admin-local",
        name: "Administrador",
        email: decrypt("a69d8b3b06099896575389e9899fb8f0:b03ea4ea34d6c7d48c08253a6341f278"),
        role: "admin",
        loginMethod: "local",
      });

      setCookie(ctx.res, token);
      
      await createAuditLog({
        userId: 0,
        action: "Inicio de sesión (Administrador)",
        actionType: "user_login",
        status: "success",
        details: { method: "env-var", username: adminUsername },
        timestamp: new Date(),
      });

      return {
        success: true,
        user: {
          id: 0,
          name: "Administrador",
          email: `${adminUsername}@device-manager.local`,
          role: "admin",
        },
      };
    }

    // ✅ STEP 2: Try DB user lookup (only if DB has passwordHash column)
    try {
      // Lazy import to avoid crash if DB is unavailable
      const db = await import("../db");
      const dbInstance = await db.getDb();

      if (dbInstance) {
        const userRows = await dbInstance
          .select()
          .from(users)
          .where(eq(users.email, input.username))
          .limit(1);

        const dbUser = userRows[0];

        if (dbUser && dbUser.passwordHash) {
          const valid = await verifyPassword(input.password, dbUser.passwordHash);
          if (!valid) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciales incorrectas" });
          }

          if (dbUser.twoFactorEnabled) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
            await setUserEmailOtp(dbUser.id, otp, expires);
            await send2FAEmail(dbUser.email || "", otp);
            
            return {
              success: true,
              requires2FA: true,
              userId: dbUser.id,
              message: "Código de verificación enviado a su correo"
            };
          }

          const token = await createSessionToken({
            sub: String(dbUser.id),
            openId: dbUser.openId || String(dbUser.id),
            name: dbUser.name || input.username,
            email: dbUser.email || input.username,
            role: dbUser.role || "user",
            loginMethod: "local",
          });

          setCookie(ctx.res, token);

          await createAuditLog({
            userId: dbUser.id,
            action: `Inicio de sesión (${dbUser.name || dbUser.email})`,
            actionType: "user_login",
            status: "success",
            details: { method: "db", email: dbUser.email },
            timestamp: new Date(),
          });

          return {
            success: true,
            user: {
              id: dbUser.id,
              name: dbUser.name || "",
              email: dbUser.email || "",
              role: dbUser.role || "user",
            },
          };
        }
      }
    } catch (dbError) {
      // DB query failed (e.g. column doesn't exist) - log and continue to error below
      console.warn("[Auth] DB login failed, falling back:", (dbError as Error).message);
    }

    // If nothing matched
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Credenciales incorrectas",
    });
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

    try {
      const db = await import("../db");
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
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al crear el usuario",
      });
    }

    await createAuditLog({
      userId: 0,
      action: `Usuario creado: ${input.username}`,
      actionType: "user_created",
      status: "success",
      details: { role: input.role, name: input.name },
      timestamp: new Date(),
    });

    return { success: true, message: "Usuario creado correctamente" };
  });
