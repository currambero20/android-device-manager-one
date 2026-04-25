export const COOKIE_NAME = "session_token";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const GOOGLE_OAUTH_CONFIG = {
  clientId: (typeof process !== "undefined" && process.env ? process.env.GOOGLE_CLIENT_ID : undefined) || "placeholder_id",
  clientSecret: (typeof process !== "undefined" && process.env ? process.env.GOOGLE_CLIENT_SECRET : undefined) || "placeholder_secret",
  redirectUri: (typeof process !== "undefined" && process.env ? process.env.GOOGLE_REDIRECT_URI : undefined) || "http://localhost:3000/api/auth/callback/google",
};

export const NOT_ADMIN_ERR_MSG = "Solo los administradores pueden realizar esta acción";
export const UNAUTHED_ERR_MSG = "Debes iniciar sesión para realizar esta acción";

export const AXIOS_TIMEOUT_MS = 30000;
export const APP_VERSION = "1.0.0";
