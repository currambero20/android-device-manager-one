import nodemailer from "nodemailer";
import admin from "firebase-admin";

// [PROFESSIONAL] Notification Service
// Integrates SendPulse (SMTP) and Firebase (FCM)

const smtpConfig = {
  host: process.env.SMTP_HOST || "smtp-pulse.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

// Initialize Firebase
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString()
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("[NotificationService] Firebase Admin initialized");
  } catch (error) {
    console.error("[NotificationService] Firebase initialization failed:", error);
  }
}

export const notificationService = {
  async sendEmail(to: string, subject: string, html: string) {
    try {
      const info = await transporter.sendMail({
        from: `"ADM Alert System" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log("[NotificationService] Email sent:", info.messageId);
      return true;
    } catch (error) {
      console.error("[NotificationService] Email failed:", error);
      return false;
    }
  },

  async sendPushNotification(token: string, title: string, body: string, data: any = {}) {
    if (!admin.apps.length) return false;
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data,
      });
      return true;
    } catch (error) {
      console.error("[NotificationService] Push failed:", error);
      return false;
    }
  },

  async alertNewConnection(deviceName: string, deviceId: number) {
    const subject = `[ADM] New Device Connected: ${deviceName}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc;">
        <h2 style="color: #22d3ee;">Alert: New Device</h2>
        <p>A new device has established a secure connection to the ADM Panel.</p>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Name:</strong> ${deviceName}</li>
          <li><strong>ID:</strong> ${deviceId}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <div style="margin-top: 20px;">
          <a href="${process.env.VITE_APP_URL}/monitoring" style="background: #22d3ee; color: #0f172a; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Dashboard</a>
        </div>
      </div>
    `;
    return this.sendEmail(process.env.SMTP_USER || "", subject, html);
  },

  async alertCriticalData(deviceName: string, type: string, details: string) {
    const subject = `[ADM] Critical Data Captured: ${type} from ${deviceName}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc;">
        <h2 style="color: #f43f5e;">Alert: Sensitive Data Captured</h2>
        <p>The system has captured new sensitive data from a monitored device.</p>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Device:</strong> ${deviceName}</li>
          <li><strong>Type:</strong> ${type}</li>
          <li><strong>Details Summary:</strong> ${details.substring(0, 100)}...</li>
        </ul>
        <div style="margin-top: 20px;">
          <a href="${process.env.VITE_APP_URL}/monitoring" style="background: #f43f5e; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Intelligence</a>
        </div>
      </div>
    `;
    return this.sendEmail(process.env.SMTP_USER || "", subject, html);
  }
};
