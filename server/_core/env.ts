export const ENV = {
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  
  // App Config
  appId: process.env.VITE_APP_ID ?? "google-auth",
  cookieSecret: process.env.JWT_SECRET ?? "default-secret-change-me",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
