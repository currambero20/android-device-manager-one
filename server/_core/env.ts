export const ENV = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "https://repodeploy.vercel.app",
  // Variables requeridas por sdk.ts
  oAuthServerUrl: process.env.OAUTH_SERVER_URL || "",
  cookieSecret: process.env.COOKIE_SECRET || process.env.JWT_SECRET || "default-secret-change-in-production",
  appId: process.env.APP_ID || "android-device-manager",
};

// Validar variables críticas
if (!ENV.GOOGLE_CLIENT_ID || !ENV.GOOGLE_CLIENT_SECRET) {
  console.warn("[ENV] Missing Google OAuth credentials");
}

if (!ENV.cookieSecret || ENV.cookieSecret === "default-secret-change-in-production") {
  console.warn("[ENV] Using default cookie secret - set COOKIE_SECRET in production!");
}
