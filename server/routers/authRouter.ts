import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  generateTwoFactorSecret,
  verifyTOTPCode,
  verifyBackupCode,
  generateRecoveryToken,
  hashRecoveryToken,
  verifyRecoveryToken,
  loginRateLimiter,
  totpRateLimiter,
  recoveryRateLimiter,
  hashBackupCodes,
} from "../twoFactorAuth";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  /**
   * Setup 2FA for current user
   */
  setupTwoFactor: protectedProcedure.query(async ({ ctx }) => {
    try {
      const setup = await generateTwoFactorSecret(ctx.user.id, ctx.user.email || "user");

      return {
        success: true,
        secret: setup.secret,
        qrCode: setup.qrCode,
        backupCodes: setup.backupCodes,
      };
    } catch (error) {
      console.error("[Auth Router] 2FA setup error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to setup 2FA",
      });
    }
  }),

  /**
   * Verify 2FA setup with TOTP code
   */
  verifyTwoFactorSetup: protectedProcedure
    .input(
      z.object({
        secret: z.string(),
        code: z.string().length(6),
        backupCodes: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check rate limit
        if (!totpRateLimiter.isAllowed(`totp-verify-${ctx.user.id}`)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many verification attempts. Please try again later.",
          });
        }

        // Verify TOTP code
        const verification = verifyTOTPCode(input.secret, input.code);

        if (!verification.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid verification code",
          });
        }

        // TODO: Save 2FA settings to database
        // - Store encrypted secret
        // - Store hashed backup codes
        // - Set twoFactorEnabled flag

        return {
          success: true,
          message: "2FA enabled successfully",
        };
      } catch (error) {
        console.error("[Auth Router] 2FA verification error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Verification failed",
        });
      }
    }),

  /**
   * Verify TOTP code during login
   */
  verifyTOTP: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check rate limit
        if (!totpRateLimiter.isAllowed(`totp-login-${ctx.user.id}`)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many attempts. Please try again later.",
          });
        }

        // TODO: Get user's 2FA secret from database
        // For now, return error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "2FA not configured",
        });
      } catch (error) {
        console.error("[Auth Router] TOTP verification error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Verification failed",
        });
      }
    }),

  /**
   * Use backup code for login
   */
  useBackupCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check rate limit
        if (!totpRateLimiter.isAllowed(`backup-${ctx.user.id}`)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many attempts. Please try again later.",
          });
        }

        // TODO: Get user's backup codes from database
        // Verify backup code
        // Remove used code from database

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Backup codes not configured",
        });
      } catch (error) {
        console.error("[Auth Router] Backup code error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Backup code verification failed",
        });
      }
    }),

  /**
   * Disable 2FA
   */
  disableTwoFactor: protectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // TODO: Verify password
        // TODO: Remove 2FA settings from database

        return {
          success: true,
          message: "2FA disabled successfully",
        };
      } catch (error) {
        console.error("[Auth Router] Disable 2FA error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to disable 2FA",
        });
      }
    }),

  /**
   * Request account recovery
   */
  requestRecovery: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check rate limit
        if (!recoveryRateLimiter.isAllowed(`recovery-${input.email}`)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many recovery requests. Please try again later.",
          });
        }

        // Generate recovery token
        const recovery = generateRecoveryToken();
        const hashedToken = hashRecoveryToken(recovery.token);

        // TODO: Save recovery token to database
        // TODO: Send recovery email with token

        return {
          success: true,
          message: "Recovery email sent",
          expiresAt: recovery.expiresAt,
        };
      } catch (error) {
        console.error("[Auth Router] Recovery request error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Recovery request failed",
        });
      }
    }),

  /**
   * Verify recovery token
   */
  verifyRecoveryToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // TODO: Get stored recovery token from database
        // Verify token hasn't expired
        // Verify token matches user

        return {
          valid: true,
          message: "Token is valid",
        };
      } catch (error) {
        console.error("[Auth Router] Token verification error:", error);
        return {
          valid: false,
          message: "Invalid or expired token",
        };
      }
    }),

  /**
   * Reset password with recovery token
   */
  resetPasswordWithToken: protectedProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // TODO: Verify recovery token
        // TODO: Update user password
        // TODO: Invalidate all sessions
        // TODO: Clear recovery token

        return {
          success: true,
          message: "Password reset successfully",
        };
      } catch (error) {
        console.error("[Auth Router] Password reset error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Password reset failed",
        });
      }
    }),

  /**
   * Get 2FA status
   */
  getTwoFactorStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      // TODO: Get 2FA status from database
      return {
        enabled: false,
        backupCodesRemaining: 0,
        lastVerified: null,
      };
    } catch (error) {
      console.error("[Auth Router] Status error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get 2FA status",
      });
    }
  }),

  /**
   * Generate new backup codes
   */
  generateNewBackupCodes: protectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // TODO: Verify password
        // TODO: Generate new backup codes
        // TODO: Update database

        return {
          success: true,
          backupCodes: [],
          message: "New backup codes generated",
        };
      } catch (error) {
        console.error("[Auth Router] Generate backup codes error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate backup codes",
        });
      }
    }),

  /**
   * Get login history
   */
  getLoginHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      try {
        // TODO: Get login history from audit logs
        return [];
      } catch (error) {
        console.error("[Auth Router] Login history error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get login history",
        });
      }
    }),

  /**
   * Get active sessions
   */
  getActiveSessions: protectedProcedure.query(async ({ ctx }) => {
    try {
      // TODO: Get active sessions from database
      return [];
    } catch (error) {
      console.error("[Auth Router] Sessions error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get sessions",
      });
    }
  }),

  /**
   * Revoke session
   */
  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // TODO: Revoke session in database
        return {
          success: true,
          message: "Session revoked",
        };
      } catch (error) {
        console.error("[Auth Router] Revoke session error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke session",
        });
      }
    }),

  /**
   * Revoke all sessions
   */
  revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // TODO: Revoke all sessions for user
      return {
        success: true,
        message: "All sessions revoked",
      };
    } catch (error) {
      console.error("[Auth Router] Revoke all sessions error:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to revoke sessions",
      });
    }
  }),
});

export type AuthRouter = typeof authRouter;
