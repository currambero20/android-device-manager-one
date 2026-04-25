import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { sendResetEmail, send2FAEmail } from "../services/mailService";

export const emailRouter = router({
  /**
   * Send custom email notification
   */
  sendNotification: protectedProcedure
    .input(z.object({
      to: z.string().email(),
      subject: z.string().max(200),
      body: z.string().max(10000),
      isHtml: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para enviar emails" });
      }

      try {
        const { default: nodemailer } = await import("nodemailer");
        const SMTP_USER = process.env.SMTP_USER || "pecesitolindo6677@gmail.com";
        const SMTP_PASS = process.env.SMTP_PASS;
        const SMTP_HOST = process.env.SMTP_HOST || "smtp-pulse.com";
        const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

        if (!SMTP_PASS) {
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "SMTP no configurado" });
        }

        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        await transporter.sendMail({
          from: SMTP_USER,
          to: input.to,
          subject: input.subject,
          html: input.isHtml ? input.body : `<p>${input.body.replace(/\n/g, "<br>")}</p>`,
        });

        return { success: true, message: "Email enviado" };
      } catch (error) {
        console.error("[Email Router] Send error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al enviar email" });
      }
    }),

  /**
   * Send device alert email
   */
  sendDeviceAlert: protectedProcedure
    .input(z.object({
      to: z.string().email(),
      deviceName: z.string(),
      alertType: z.enum(["offline", "battery_low", "geofence_breach", "suspicious_activity"]),
      message: z.string().max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const alertSubjects: Record<string, string> = {
        offline: "⚠️ Dispositivo Desconectado",
        battery_low: "🔋 Batería Baja",
        geofence_breach: "📍 Alerta de Geofence",
        suspicious_activity: "🔒 Actividad Sospechosa",
      };

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dc2626; border-radius: 10px;">
          <h2 style="color: #dc2626; text-align: center;">${alertSubjects[input.alertType]}</h2>
          <p><strong>Dispositivo:</strong> ${input.deviceName}</p>
          <p><strong>Mensaje:</strong> ${input.message}</p>
          <p style="color: #666; font-size: 12px;">Revisa el panel de Android Device Manager para más detalles.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="text-align: center; font-size: 10px; color: #999;">Android Device Manager - Notificaciones</p>
        </div>
      `;

      try {
        const { default: nodemailer } = await import("nodemailer");
        const SMTP_USER = process.env.SMTP_USER || "pecesitolindo6677@gmail.com";
        const SMTP_PASS = process.env.SMTP_PASS;
        const SMTP_HOST = process.env.SMTP_HOST || "smtp-pulse.com";
        const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

        if (!SMTP_PASS) {
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "SMTP no configurado" });
        }

        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        await transporter.sendMail({
          from: SMTP_USER,
          to: input.to,
          subject: `${alertSubjects[input.alertType]} - ${input.deviceName}`,
          html,
        });

        return { success: true };
      } catch (error) {
        console.error("[Email Router] Device alert error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al enviar alerta" });
      }
    }),

  /**
   * Send bulk report email
   */
  sendReport: protectedProcedure
    .input(z.object({
      to: z.array(z.string().email()).min(1),
      reportType: z.enum(["daily", "weekly", "monthly"]),
      data: z.record(z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo admins pueden enviar reportes" });
      }

      const reportHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #0891b2; border-radius: 10px;">
          <h2 style="color: #0891b2; text-align: center;">Reporte ${input.reportType} - ADM</h2>
          <pre style="background: #f1f5f9; padding: 15px; border-radius: 5px; overflow-x: auto;">${JSON.stringify(input.data, null, 2)}</pre>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="text-align: center; font-size: 10px; color: #999;">Android Device Manager - Reportes Automáticos</p>
        </div>
      `;

      try {
        const { default: nodemailer } = await import("nodemailer");
        const SMTP_USER = process.env.SMTP_USER || "pecesitolindo6677@gmail.com";
        const SMTP_PASS = process.env.SMTP_PASS;
        const SMTP_HOST = process.env.SMTP_HOST || "smtp-pulse.com";
        const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

        if (!SMTP_PASS) {
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "SMTP no configurado" });
        }

        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        await transporter.sendMail({
          from: SMTP_USER,
          to: input.to.join(","),
          subject: `Reporte ${input.reportType} - Android Device Manager`,
          html: reportHtml,
        });

        return { success: true, sentTo: input.to.length };
      } catch (error) {
        console.error("[Email Router] Report error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al enviar reporte" });
      }
    }),

  /**
   * Test email configuration
   */
  testConnection: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const { default: nodemailer } = await import("nodemailer");
      const SMTP_USER = process.env.SMTP_USER;
      const SMTP_PASS = process.env.SMTP_PASS;
      const SMTP_HOST = process.env.SMTP_HOST || "smtp-pulse.com";
      const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

      if (!SMTP_USER || !SMTP_PASS) {
        return { success: false, message: "SMTP credentials not configured" };
      }

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

      await transporter.verify();
      return { success: true, message: "Email configuration OK" };
    } catch (error) {
      return { success: false, message: "Email configuration failed" };
    }
  }),
});

export type EmailRouter = typeof emailRouter;
