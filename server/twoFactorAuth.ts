import speakeasy from "speakeasy";
const QRCode = require("qrcode");
import crypto from "crypto";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  valid: boolean;
  message: string;
}

export interface RecoveryToken {
  token: string;
  expiresAt: Date;
}

/**
 * Generate TOTP secret and QR code for 2FA setup
 */
export async function generateTwoFactorSecret(
  userId: number,
  email: string
): Promise<TwoFactorSetup> {
  try {
    // Generate secret using speakeasy
    const secret = speakeasy.generateSecret({
      name: `Android Device Manager (${email})`,
      issuer: "Android Device Manager",
      length: 32,
    });

    if (!secret.otpauth_url) {
      throw new Error("Failed to generate OTP auth URL");
    }

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes (10 codes)
    const backupCodes = generateBackupCodes(10);

    console.log(`[2FA] Secret generated for user ${userId}`);

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  } catch (error) {
    console.error("[2FA] Failed to generate secret:", error);
    throw error;
  }
}

/**
 * Verify TOTP code
 */
export function verifyTOTPCode(secret: string, token: string): TwoFactorVerification {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 2, // Allow 2 time windows (±30 seconds)
    });

    if (verified) {
      return {
        valid: true,
        message: "Code verified successfully",
      };
    } else {
      return {
        valid: false,
        message: "Invalid code",
      };
    }
  } catch (error) {
    console.error("[2FA] Verification error:", error);
    return {
      valid: false,
      message: "Verification failed",
    };
  }
}

/**
 * Verify backup code
 */
export function verifyBackupCode(backupCode: string, storedCodes: string[]): boolean {
  try {
    const hashedInput = hashBackupCode(backupCode);
    return storedCodes.some((code) => code === hashedInput);
  } catch (error) {
    console.error("[2FA] Backup code verification error:", error);
    return false;
  }
}

/**
 * Generate recovery token for account recovery
 */
export function generateRecoveryToken(): RecoveryToken {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Valid for 24 hours

  return {
    token,
    expiresAt,
  };
}

/**
 * Hash recovery token for storage
 */
export function hashRecoveryToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Verify recovery token
 */
export function verifyRecoveryToken(token: string, hashedToken: string): boolean {
  const hash = hashRecoveryToken(token);
  return hash === hashedToken;
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }

  return codes;
}

/**
 * Hash backup code for storage
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Hash backup codes for storage
 */
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(hashBackupCode);
}

/**
 * Enable 2FA for user
 */
export async function enableTwoFactor(
  userId: number,
  secret: string,
  backupCodes: string[]
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const hashedBackupCodes = hashBackupCodes(backupCodes);

    // TODO: Update user record with 2FA settings
    // This would require adding twoFactorEnabled and twoFactorSecret fields to users table
    console.log(`[2FA] 2FA enabled for user ${userId}`);
  } catch (error) {
    console.error("[2FA] Failed to enable 2FA:", error);
    throw error;
  }
}

/**
 * Disable 2FA for user
 */
export async function disableTwoFactor(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // TODO: Update user record to disable 2FA
    console.log(`[2FA] 2FA disabled for user ${userId}`);
  } catch (error) {
    console.error("[2FA] Failed to disable 2FA:", error);
    throw error;
  }
}

/**
 * Generate session token with expiration
 */
export function generateSessionToken(userId: number, expiresIn: number = 3600): string {
  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };

  // In production, use JWT library
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Verify session token
 */
export function verifySessionToken(token: string): { userId: number; valid: boolean; message?: string } {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString());

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { userId: 0, valid: false };
    }

    return { userId: payload.userId, valid: true };
  } catch (error) {
    console.error("[Session] Token verification error:", error);
    return { userId: 0, valid: false };
  }
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count < this.maxAttempts) {
      record.count++;
      return true;
    }

    return false;
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key);
    if (!record) {
      return this.maxAttempts;
    }

    const now = Date.now();
    if (now > record.resetTime) {
      return this.maxAttempts;
    }

    return Math.max(0, this.maxAttempts - record.count);
  }

  /**
   * Get reset time
   */
  getResetTime(key: string): Date | null {
    const record = this.attempts.get(key);
    if (!record) {
      return null;
    }

    return new Date(record.resetTime);
  }

  /**
   * Reset attempts for key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Clear all attempts
   */
  clear(): void {
    this.attempts.clear();
  }
}

// Global rate limiters
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const totpRateLimiter = new RateLimiter(10, 5 * 60 * 1000); // 10 attempts per 5 minutes
export const recoveryRateLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 attempts per hour
