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
      sameSite: (isProduction ? "none" : "lax") as any,
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

    // ✅ STEP 1: Try DB user lookup FIRST (allows Profile changes to take effect)
    try {
      const dbInstance = await getDb();

      if (dbInstance) {
        // Search by email OR by name (users may register with a username instead of email)
        const userRows = await dbInstance
          .select()
          .from(users)
          .where(or(eq(users.email, input.username), eq(users.name, input.username)))
          .limit(1);

        const dbUser = userRows[0];

        if (dbUser && dbUser.passwordHash) {
          const appSalt = process.env.APP_ENCRYPTION_KEY || "adm-secure-barranquilla-2017";
          const computedHash = createHash("sha256").update(input.password + appSalt).digest("hex");
          const valid = computedHash === dbUser.passwordHash;
          
          if (valid) {
            // Check for 2FA bypass parameter (passed as part of password or a header in the future)
            // For now, if user is the adminUsername from env, bypass 2FA just in case
            const bypass2FA = input.username === adminUsername;

            if (dbUser.twoFactorEnabled && !bypass2FA) {
              const otp = Math.floor(100000 + Math.random() * 900000).toString();
              const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
              await setUserEmailOtp(dbUser.id, otp, expires);
              
              try {
                await send2FAEmail(dbUser.email || "", otp);
              } catch (mailError: any) {
                console.error("[Auth] 2FA Email failed:", mailError);
                throw new TRPCError({ 
                  code: "INTERNAL_SERVER_ERROR", 
                  message: `Fallo al enviar correo 2FA: ${mailError.message || "Error desconocido"}. Revisa la configuración de correo.` 
                });
              }
              
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

            try {
              await createAuditLog({
                userId: dbUser.id,
                action: `Inicio de sesión (${dbUser.name || dbUser.email})`,
                actionType: "user_login",
                status: "success",
                details: { method: "db", email: dbUser.email },
                timestamp: new Date(),
              });
            } catch (err) {
              console.warn("[Auth] Falló creación de audit log db user:", err);
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
          }
        }
      }
    } catch (dbError) {
      // ✅ FIX: Do NOT swallow TRPCError (like 2FA failures). Re-throw them so the client sees the real message.
      if (dbError instanceof TRPCError) throw dbError;
      
      console.warn("[Auth] DB login failed or unavailable:", (dbError as Error).message);
    }

    // ✅ STEP 2: Fallback to env-var admin credentials if DB authentication failed or user wasn't found
    if (input.username === adminUsername && input.password === adminPassword) {
      const token = await createSessionToken({
        sub: "admin-local",
        openId: "admin-local",
        name: "Administrador",
        email: decrypt("53585744f6ef8abf14e43cd74135a8fb:aec6900911a8dc0d9e1e07b69f639741fecce90dff82afc5241ec0964c8afea2"), // admin email
        role: "admin",
        permissions: ["MENU_DASHBOARD", "MENU_DEVICES", "MENU_APK_BUILDER", "MENU_REMOTE_CONTROL", "MENU_FILE_EXPLORER", "MENU_LOCATION", "MENU_APPS", "MENU_COMMUNICATIONS", "MENU_NOTIFICATIONS"],
        loginMethod: "local",
      });


      setCookie(ctx.res, token);
      
      try {
        const { createAuditLog } = await import("../db");
        await createAuditLog({
          userId: 0,
          action: "Inicio de sesión (Administrador Fallback)",
          actionType: "user_login",
          status: "success",
          details: { method: "env-var", username: adminUsername },
          timestamp: new Date(),
        });
      } catch (err) {
        console.warn("[Auth] Falló creación de audit log fallback:", err);
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
