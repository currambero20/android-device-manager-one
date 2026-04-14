import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { devices, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join } from "path";

let FCM_ENABLED = false;

try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decoded);
  } else {
    const serviceAccountPath = join(process.cwd(), "server/config/firebase-service-account.json");
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  }
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  FCM_ENABLED = true;
} catch (error: any) {
  console.error("[FCM] Failed to initialize Firebase Admin SDK:", error.message || error);
}

interface FCMMessage {
  token?: string;
  tokens?: string[];
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
}

async function sendFCMNotification(message: FCMMessage): Promise<boolean> {
  if (!FCM_ENABLED) {
    console.warn("[FCM] Firebase not configured or initialization failed");
    return false;
  }

  try {
    if (message.tokens && message.tokens.length > 0) {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: message.tokens,
        notification: message.notification,
        data: message.data,
      });
      console.log(`[FCM] Multicast sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
      return response.successCount > 0;
    } else if (message.token) {
      await admin.messaging().send({
        token: message.token,
        notification: message.notification,
        data: message.data,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("[FCM] Error sending message:", error);
    return false;
  }
}

export const fcmRouter = router({
  /**
   * Check FCM configuration status
   */
  getStatus: protectedProcedure.query(() => {
    return {
      enabled: FCM_ENABLED,
      v1Configured: FCM_ENABLED,
    };
  }),

  /**
   * Register device FCM token
   */
  registerToken: protectedProcedure
    .input(z.object({ deviceId: z.number(), token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        }

        await db.update(devices)
          .set({ fcmToken: input.token })
          .where(eq(devices.id, input.deviceId));

        return { success: true };
      } catch (error) {
        console.error("[FCM] Register token error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to register token" });
      }
    }),

  /**
   * Send push notification to device
   */
  sendToDevice: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      title: z.string().max(120),
      body: z.string().max(1000),
      data: z.record(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!FCM_ENABLED) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "FCM not configured. Set FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable.",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      }

      const deviceList = await db.select().from(devices).where(eq(devices.id, input.deviceId)).limit(1);
      if (deviceList.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
      }

      const device = deviceList[0];
      const token = (device as any).fcmToken;

      if (!token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Device has no FCM token registered",
        });
      }

      const dataPayload: Record<string, string> = {};
      if (input.data) {
        Object.entries(input.data).forEach(([k, v]) => {
          dataPayload[k] = String(v);
        });
      }

      const success = await sendFCMNotification({
        token: token,
        notification: { title: input.title, body: input.body },
        data: dataPayload,
      });

      return { success, deviceId: input.deviceId };
    }),

  /**
   * Send push notification to all user's devices
   */
  sendToUser: protectedProcedure
    .input(z.object({
      userId: z.number(),
      title: z.string().max(120),
      body: z.string().max(1000),
      data: z.record(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!FCM_ENABLED) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "FCM not configured",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      }

      const userDevices = await db.select({ fcmToken: devices.fcmToken })
        .from(devices)
        .where(eq(devices.ownerId, input.userId));

      const tokens = userDevices
        .map(d => d.fcmToken)
        .filter((t): t is string => !!t);

      if (tokens.length === 0) {
        return { success: false, message: "No devices with FCM tokens", sentCount: 0 };
      }

      const dataPayload2: Record<string, string> = {};
      if (input.data) {
        Object.entries(input.data).forEach(([k, v]) => {
          dataPayload2[k] = String(v);
        });
      }

      const message: FCMMessage = {
        tokens: tokens,
        notification: { title: input.title, body: input.body },
        data: dataPayload2,
      };

      const success = await sendFCMNotification(message);

      return { success, sentCount: tokens.length };
    }),

  /**
   * Test FCM connection
   */
  testConnection: protectedProcedure.mutation(async () => {
    if (!FCM_ENABLED) {
      return { success: false, message: "FCM not configured" };
    }

    const success = await sendFCMNotification({
      token: "test-token",
      notification: { title: "Test", body: "FCM connection test" },
    });

    return { success, message: success ? "Connection OK" : "Connection failed" };
  }),
});

export type FCMRouter = typeof fcmRouter;
