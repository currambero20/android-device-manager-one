const nodemailer = require("nodemailer");

const GMAIL_USER = process.env.GMAIL_USER || "pecesitolindo6677@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "ktbt kkrm uyfa wxby";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
  pool: true,
  maxConnections: 1,
  maxMessages: 10,
  connectionTimeout: 5000,
  socketTimeout: 5000,
  greetingTimeout: 5000,
});

async function testMail() {
  try {
    console.log("Verifying connection...");
    await transporter.verify();
    console.log("Connection verified!");
    
    console.log("Sending test email...");
    const info = await transporter.sendMail({
      from: `"Seguridad ADM" <${GMAIL_USER}>`,
      to: "ekn360@gmail.com", // Send to admin email as test
      subject: "Test Email from Script",
      text: "This is a test email.",
    });
    console.log("Test email sent:", info.messageId);
  } catch (error) {
    console.error("Mail Error:", error);
  }
}

testMail();
