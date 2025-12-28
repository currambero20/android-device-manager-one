// client/src/const.ts

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Genera la URL de inicio de sesión de Google OAuth 2.0.
 */
export const getLoginUrl = () => {
  const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId ) {
    console.error("VITE_GOOGLE_CLIENT_ID is not set");
    return "#";
  }

  // La URL a la que Google enviará al usuario tras el login
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  
  // Codificamos la URI de redirección en el estado
  const state = btoa(redirectUri);

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
