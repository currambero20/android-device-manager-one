import { z } from "zod";
import { publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { SignJWT } from "jose";
import { or } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "android-device-manager-super-secret-key-2024"
);

const COOKIE_NAME = "session_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

import { hashPassword, setUserEmailOtp, createAuditLog, getDb } from "../db";
import { decrypt } from "../utils/crypto";
import { createHash } from "crypto";

import { send2FAEmail } from "../services/mailService";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

async function verifyPasswordHelper(password: string, hash: string): Promise<boolean> {
  const { verifyPassword } = await import("../db");
  return verifyPassword(password, hash);
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
      secure: true, // Always secure in production (Vercel and Render use HTTPS)
      sameSite: "none", // Required for cross-site cookies in mobile browsers
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      domain: undefined,
    });
  }
}

/**
   * Login procedure
   * 
   * Priority:
   * 1. First try DB credentials (if user exists in DB with valid password)
   * 2. Fall back to ENV VAR credentials if DB auth fails
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

      // ✅ STEP 1: Try DB user FIRST (allows Profile changes to take effect)
      try {
        const dbInstance = await getDb();

        if (dbInstance) {
          // Search by email OR by name
          const userRows = await dbInstance
            .select()
            .from(users)
            .where(or(eq(users.email, input.username), eq(users.name, input.username)))
            .limit(1);

          const dbUser = userRows[0];

          if (dbUser && dbUser.passwordHash) {
            // User found with password - verify
            if (dbUser.lockoutUntil && new Date(dbUser.lockoutUntil) > new Date()) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Cuenta bloqueada temporalmente.",
              });
            }

            const valid = await verifyPasswordHelper(input.password, dbUser.passwordHash);
            
            if (valid) {
              // Reset failed attempts
              if (dbUser.failedLoginAttempts > 0 || dbUser.lockoutUntil) {
                await dbInstance.update(users).set({ failedLoginAttempts: 0, lockoutUntil: null }).where(eq(users.id, dbUser.id));
              }
              
              const bypass2FA = input.username === adminUsername;

              if (dbUser.twoFactorEnabled && !bypass2FA) {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const expires = new Date(Date.now() + 5 * 60 * 1000);
                await setUserEmailOtp(dbUser.id, otp, expires);
                
                try {
                  await send2FAEmail(dbUser.email || "", otp);
                } catch (mailError: any) {
                  console.error("[Auth] 2FA Email failed:", mailError);
                }
                
                return {
                  success: true,
                  requires2FA: true,
                  userId: dbUser.id,
                  message: "Código de verificación enviado"
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

              try {
                await createAuditLog({
                  userId: dbUser.id,
                  action: `Inicio de sesión (${dbUser.name || dbUser.email})`,
                  actionType: "user_login",
                  status: "success",
                  details: { method: "db" },
                  timestamp: new Date(),
                });
              } catch (err) {
                console.warn("[Auth] Audit log failed:", err);
              }

              return {
                success: true,
                user: {
                  id: dbUser.id,
                  name: dbUser.name || "",
                  email: dbUser.email || "",
                  role: dbUser.role || "user",
                },
              };
            } else {
              // Password wrong - try fallback credentials
              console.warn("[Auth] DB password failed for:", input.username);
            }
          }
        }
      } catch (dbError) {
        // Only re-throw TRPCErrors
        if (dbError instanceof TRPCError) throw dbError;
        console.warn("[Auth] DB error:", (dbError as Error).message);
      }

      // ✅ STEP 2: Fallback to ENV credentials
      if (input.username === adminUsername && input.password === adminPassword) {
        const token = await createSessionToken({
          sub: "admin-local",
          openId: "admin-local",
          name: "Administrador",
          email: "admin@device-manager.local",
          role: "admin",
          permissions: ["MENU_DASHBOARD", "MENU_DEVICES", "MENU_APK_BUILDER", "MENU_REMOTE_CONTROL", "MENU_FILE_EXPLORER", "MENU_LOCATION", "MENU_APPS", "MENU_COMMUNICATIONS", "MENU_NOTIFICATIONS"],
          loginMethod: "local",
        });

        setCookie(ctx.res, token);
        
        try {
          const { createAuditLog } = await import("../db");
          await createAuditLog({
            userId: 0,
            action: "Inicio de sesión (Administrador)",
            actionType: "user_login",
            status: "success",
            details: { method: "env-fallback" },
            timestamp: new Date(),
          });
        } catch (err) {
          console.warn("[Auth] Audit log failed:", err);
        }

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

      // Nothing matched
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
    const expectedAdminKey = process.env.ADMIN_REGISTRATION_KEY || "Dylan2017-BackupKey";

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

/**
 * Verify 2FA OTP procedure
 */
export const verify2FAPure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
      otp: z.string().length(6),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const dbInstance = await getDb();
    if (!dbInstance) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
    }

    const userRows = await dbInstance
      .select()
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    const user = userRows[0];

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
    }

    if (!user.emailOtp || user.emailOtp !== input.otp) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Código de verificación incorrecto" });
    }

    if (user.emailOtpExpires && user.emailOtpExpires < new Date()) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "El código ha expirado" });
    }

    // Clear OTP after successful verification
    const { clearUserEmailOtp } = await import("../db");
    await clearUserEmailOtp(user.id);

    // Create session token
    const token = await createSessionToken({
      sub: String(user.id),
      openId: user.openId || String(user.id),
      name: user.name || user.email || "User",
      email: user.email || "User",
      role: user.role || "user",
      loginMethod: "local",
    });

    setCookie(ctx.res, token);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        role: user.role,
      },
    };
  });
