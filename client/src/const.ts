// client/src/const.ts

// Exportamos las constantes compartidas
export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Genera la URL de inicio de sesión de Google OAuth 2.0.
 * Se exporta como una función para que use el origen actual (localhost o vercel).
 */
export const getLoginUrl = () => {
  const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  
  // IMPORTANTE: Asegúrate de que VITE_GOOGLE_CLIENT_ID esté en Vercel
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  // La URL a la que Google enviará al usuario tras el login
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  
  // Codificamos la URI de redirección en el estado para recuperarla después
  const state = btoa(redirectUri );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: state,
    access_type: "offline",
    prompt: "select_account"
  });

  return `${googleAuthUrl}?${params.toString()}`;
};
