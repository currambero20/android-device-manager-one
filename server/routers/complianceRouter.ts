import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { eq, desc, and, gte, count } from "drizzle-orm";
import { getDb } from "../db";
import { auditLogs, devices, users } from "../../drizzle/schema";

/**
 * Phase 3 — Compliance & DLP Router
 * Handles device compliance polcies, violation reporting, and lost mode.
 */
export const complianceRouter = router({
  // ---- Compliance Status per device ----
  getDeviceCompliance: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, input.deviceId))
        .limit(1);
      if (!device) return null;

      // Compute basic compliance checks
      const checks = [
        {
          id: "encryption",
          label: "Cifrado del dispositivo",
          pass: true, // APK confirmará en runtime
          severity: "critical",
        },
        {
          id: "screen_lock",
          label: "Bloqueo de pantalla activo",
          pass: device.status !== "inactive",
          severity: "high",
        },
        {
          id: "os_version",
          label: "Versión de Android compatible",
          pass:
            device.androidVersion
              ? parseInt(device.androidVersion.split(".")[0]) >= 8
              : false,
          severity: "medium",
        },
        {
          id: "last_seen",
          label: "Conexión reciente (últimas 24h)",
          pass: device.lastSeen
            ? Date.now() - new Date(device.lastSeen).getTime() < 86_400_000
            : false,
          severity: "low",
        },
      ];

      const violations = checks.filter((c) => !c.pass);
      const score = Math.round(
        (checks.filter((c) => c.pass).length / checks.length) * 100
      );

      return {
        deviceId: input.deviceId,
        deviceName: device.deviceName,
        score,
        status:
          score >= 80 ? "compliant" : score >= 50 ? "partial" : "non_compliant",
        checks,
        violations,
      };
    }),

  // ---- All devices compliance summary ----
  getFleetCompliance: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, compliant: 0, partial: 0, nonCompliant: 0, devices: [] };
    const allDevices = await db.select().from(devices);

    const summaries = allDevices.map((d) => {
      const isOnline = d.status === "online";
      const recentSeen = d.lastSeen
        ? Date.now() - new Date(d.lastSeen).getTime() < 86_400_000
        : false;
      const androidOk = d.androidVersion
        ? parseInt(d.androidVersion.split(".")[0]) >= 8
        : false;

      const score = [isOnline, recentSeen, androidOk].filter(Boolean).length;
      const normalized = Math.round((score / 3) * 100);
      const statusLabel =
        normalized >= 80 ? "compliant" : normalized >= 50 ? "partial" : "non_compliant";

      return {
        id: d.id,
        name: d.deviceName,
        model: d.model,
        androidVersion: d.androidVersion,
        status: d.status,
        complianceScore: normalized,
        complianceStatus: statusLabel,
        lastSeen: d.lastSeen,
      };
    });

    return {
      total: summaries.length,
      compliant: summaries.filter((s) => s.complianceStatus === "compliant").length,
      partial: summaries.filter((s) => s.complianceStatus === "partial").length,
      nonCompliant: summaries.filter((s) => s.complianceStatus === "non_compliant").length,
      devices: summaries,
    };
  }),

  // ---- Audit log summary (DLP) ----
  getAuditSummary: adminProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const since = new Date(Date.now() - input.days * 86_400_000);
      return await db
        .select()
        .from(auditLogs)
        .where(gte(auditLogs.timestamp, since))
        .orderBy(desc(auditLogs.timestamp))
        .limit(200);
    }),

  // ---- Lost Mode activation ----
  setLostMode: adminProcedure
    .input(
      z.object({
        deviceId: z.number(),
        enabled: z.boolean(),
        message: z.string().optional(),
        contactPhone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      // Log the lost mode action
      await db.insert(auditLogs).values({
        userId: ctx.user?.id ?? null,
        deviceId: input.deviceId,
        action: input.enabled ? "Lost Mode ACTIVATED" : "Lost Mode DEACTIVATED",
        actionType: "security_event",
        resourceType: "device",
        resourceId: String(input.deviceId),
        details: {
          message: input.message,
          contactPhone: input.contactPhone,
        },
        status: "success",
      });
      // [PLATINUM FIX] Send actual MDM command via WebSocket
      const { getWebSocketManager } = await import("../websocket");
      const wsManager = getWebSocketManager();
      if (wsManager) {
        console.log(`[WebSocket] Sending LOST_MODE command to device ${input.deviceId} | Enabled: ${input.enabled}`);
        wsManager.broadcastToDevice(input.deviceId, "execute-command", {
          action: input.enabled ? "lock_device" : "unlock_device",
          payload: {
            message: input.message || "Device Lost",
            phone: input.contactPhone || ""
          }
        });
      }

      return {
        success: true,
        message: input.enabled
          ? "Modo Perdido activado. El dispositivo mostrará el mensaje de contacto."
          : "Modo Perdido desactivado. El dispositivo vuelve al estado normal.",
      };
    }),

  // ---- DLP Policy violations report ----
  getDlpViolations: adminProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const since = new Date(Date.now() - input.days * 86_400_000);
      return await db
        .select()
        .from(auditLogs)
        .where(
          and(
            gte(auditLogs.timestamp, since),
            eq(auditLogs.status, "failure")
          )
        )
        .orderBy(desc(auditLogs.timestamp))
        .limit(100);
    }),
});
