import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { SignJWT, jwtVerify } from "jose";
import * as db from "../db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "android-device-manager-super-secret-key-2024"
);

const COOKIE_NAME = "session_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Simple password hash using base64 (replace with bcrypt in production)
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

export const localAuthRouter = router({
  /**
   * Login with username and password
   */
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();

      // If no DB, use fallback admin credentials
      if (!dbInstance) {
        const adminUsername = process.env.ADMIN_USERNAME || "admin";
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

        if (input.username !== adminUsername || input.password !== adminPassword) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Credenciales incorrectas",
          });
        }

        // Create JWT for fallback admin
        const token = await new SignJWT({
          sub: "admin-fallback",
          openId: "admin-fallback",
          name: "Administrador",
          email: "admin@device-manager.local",
          role: "admin",
          loginMethod: "local",
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("30d")
          .sign(JWT_SECRET);

        ctx.res.cookie(COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: COOKIE_MAX_AGE,
          path: "/",
        });

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

      // With DB - look up user by email (username field)
      const user = await db.getUserByEmail(input.username);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciales incorrectas",
        });
      }

      // Check password
      if (!user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Este usuario no tiene contraseña configurada. Usa OAuth.",
        });
      }

      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciales incorrectas",
        });
      }

      // Create JWT
      const token = await new SignJWT({
        sub: String(user.id),
        openId: user.openId || String(user.id),
        name: user.name || input.username,
        email: user.email || input.username,
        role: user.role || "user",
        loginMethod: "local",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(JWT_SECRET);

      ctx.res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  /**
   * Register a new user (admin only in production)
   */
  register: publicProcedure
    .input(
      z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().optional(),
        role: z.enum(["admin", "user", "viewer"]).default("user"),
        adminKey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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
    }),

  /**
   * Verify a JWT session token (used by context)
   */
  verifyToken: async (token: string) => {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return {
        openId: payload.openId as string,
        name: payload.name as string,
        email: payload.email as string,
        role: payload.role as string,
        sub: payload.sub as string,
      };
    } catch {
      return null;
    }
  },
});
