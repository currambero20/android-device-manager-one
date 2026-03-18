import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { 
  getUserByEmail, 
  setUserResetToken, 
  getUserByResetToken, 
  updateUserPassword,
  getDb,
  clearUserEmailOtp,
  createAuditLog,
  getAuditLogsByUserId
} from "../db";
import { decrypt } from "../utils/crypto";

import { sendResetEmail } from "../services/mailService";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";

const jwtSecret = process.env.JWT_SECRET || decrypt("b1282eac0ca5bb38fc034e3208750a98:ed5e706c83693f1d86d63bb1a6311ae5bc608f10271500693a12903332be390a8809e255375ecf4fb2bc74c728362ab8");
const JWT_SECRET = new TextEncoder().encode(jwtSecret);

async function createSessionToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export const authRouter = router({
  /**
   * Request password reset link
   */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      if (!user) {
        // Return success anyway for security (don't reveal if email exists)
        return { success: true, message: "Si el correo está registrado, recibirá un enlace pronto." };
      }

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await setUserResetToken(input.email, token, expires);
      await sendResetEmail(input.email, token);

      return { success: true, message: "Enlace de recuperación enviado." };
    }),

  /**
   * Reset password using token
   */
  resetPasswordWithToken: publicProcedure
    .input(z.object({ token: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const user = await getUserByResetToken(input.token);
      
      if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token inválido o expirado" });
      }

      const db = await import("../db");
      const hashedPassword = db.hashPassword(input.newPassword);
      await updateUserPassword(user.id, hashedPassword);

      await createAuditLog({
        userId: user.id,
        action: "Restablecimiento de contraseña",
        actionType: "user_updated",
        status: "success",
        details: { method: "token" },
        timestamp: new Date(),
      });

      return { success: true, message: "Contraseña actualizada correctamente" };
    }),

  /**
   * Verify Email OTP (2FA)
   */
  verifyEmail2FA: publicProcedure
    .input(z.object({ userId: z.number(), otp: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      const userRows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      const user = userRows[0];

      if (!user || user.emailOtp !== input.otp || !user.emailOtpExpires || user.emailOtpExpires < new Date()) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Código inválido o expirado" });
      }

      // Valid - Create session
      const token = await createSessionToken({
        sub: String(user.id),
        openId: user.openId,
        name: user.name || "",
        email: user.email || "",
        role: user.role || "user",
        loginMethod: user.loginMethod || "local",
      });

      const isProduction = process.env.NODE_ENV === "production";
      ctx.res.cookie("session_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });

      // Log successful 2FA login
      await createAuditLog({
        userId: user.id,
        action: "Verificación 2FA exitosa",
        actionType: "user_login",
        status: "success",
        details: { method: "email-otp" },
        timestamp: new Date(),
      });

      // Clear OTP
      await clearUserEmailOtp(user.id);

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name || "",
          email: user.email || "",
          role: user.role || "user",
        },
      };
    }),

  /**
   * Toggle 2FA in profile
   */
  toggleTwoFactor: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      await db.update(users).set({ twoFactorEnabled: input.enabled }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),
});
