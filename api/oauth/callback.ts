import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import * as db from "../../server/db";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { sdk } from "../../server/_core/sdk";

function getQueryParam(req: VercelRequest, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const code = getQueryParam(req, "code");
  const state = getQueryParam(req, "state");

  if (!code) {
    console.error("[OAuth] Missing authorization code");
    return res.status(400).json({ error: "code is required" });
  }

  try {
    // 1. Intercambiar el código por tokens de Google
    const redirectUri = state
      ? atob(state)
      : `${req.headers["x-forwarded-proto"] || "https"}://${
          req.headers["x-forwarded-host"] || req.headers.host
        }/api/oauth/callback`;

    const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    } );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      console.error("[OAuth] No access token received from Google");
      return res.status(400).json({ error: "Failed to get access token" });
    }

    // 2. Obtener información del usuario desde Google
    const userRes = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
     );

    const userInfo = userRes.data;

    if (!userInfo.sub) {
      console.error("[OAuth] Google ID (sub) missing from user info");
      return res.status(400).json({ error: "Google ID (sub) missing" });
    }

    // 3. Guardar o actualizar el usuario en la base de datos
    const user = await db.upsertUser({
      openId: userInfo.sub,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: "google",
      lastSignedIn: new Date(),
    });

    if (!user || !user.id) {
      console.error("[OAuth] Failed to create/update user");
      return res.status(500).json({ error: "Failed to create user session" });
    }

    // 4. Crear sesión
    const sessionToken = await sdk.createSessionToken(userInfo.sub, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    if (!sessionToken) {
      console.error("[OAuth] Failed to create session token");
      return res.status(500).json({ error: "Failed to create session" });
    }

    // 5. Establecer cookie de sesión
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${ONE_YEAR_MS / 1000}; HttpOnly; Secure; SameSite=Lax`
    );

    console.log(`[OAuth] User ${userInfo.sub} logged in successfully`);

    // 6. Redirigir al dashboard
    return res.redirect(302, "/dashboard");
  } catch (error: any) {
    console.error("[OAuth] Callback failed:", {
      message: error?.message,
      response: error?.response?.data,
    });

    const errorMessage = encodeURIComponent(
      error?.response?.data?.error_description || "Authentication failed"
    );
    return res.redirect(302, `/?error=${errorMessage}`);
  }
}
