export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const getLoginUrl = () => {
  const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    console.error("VITE_GOOGLE_CLIENT_ID is not set");
    return "#";
  }

  // URL de callback en Render
  const redirectUri = `https://android-device-manager-one.onrender.com/api/oauth/callback`;
  
  // Usamos el origin del frontend como state para que el backend sepa a dónde volver (opcional pero útil)
  const state = btoa(window.location.origin);

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
