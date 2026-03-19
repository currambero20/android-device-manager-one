import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER || "pecesitolindo6677@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "ktbt kkrm uyfa wxby";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL immediately
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
  // Removed pool and strict timeouts that cause Connection Timeout on Render
});

/**
 * Send password reset email
 */
export async function sendResetEmail(to: string, token: string) {
  const resetUrl = `${process.env.VITE_APP_URL || "http://localhost:5173"}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: `"Android Device Manager" <${GMAIL_USER}>`,
    to,
    subject: "Recuperación de Contraseña - ADM",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0891b2; text-align: center;">Android Device Manager</h2>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para continuar:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer Contraseña</a>
        </div>
        <p style="color: #666; font-size: 12px;">Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="text-align: center; font-size: 10px; color: #999;">V3.15 - Security Enforcement</p>
      </div>
    `,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending reset email:", error);
        return reject(error);
      }
      resolve(info);
    });
  });
}

/**
 * Send 2FA Verification Code
 */
export async function send2FAEmail(to: string, otp: string) {
  const mailOptions = {
    from: `"Seguridad ADM" <${GMAIL_USER}>`,
    to,
    subject: "Código de Verificación (2FA) - ADM",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #7c3aed; text-align: center;">Verificación de Seguridad</h2>
        <p>Tu código de acceso para Android Device Manager es:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background: #f1f5f9; padding: 10px 20px; border-radius: 8px;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 12px;">Por razones de seguridad, este código expirará en 5 minutos.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="text-align: center; font-size: 10px; color: #999;">Android Device Manager Pro v3.15</p>
      </div>
    `,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending 2FA email:", error);
        return reject(error);
      }
      resolve(info);
    });
  });
}
