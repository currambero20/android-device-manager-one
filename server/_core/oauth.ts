import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import axios from "axios";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Ruta de callback para Google
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code) {
      res.status(400).json({ error: "code is required" });
      return;
    }

    try {
      // 1. Intercambiar el código por tokens de Google
      const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: state ? atob(state) : `${req.protocol}://${req.get('host')}/api/oauth/callback`,
        grant_type: "authorization_code",
      });

      const { access_token } = tokenResponse.data;

      // 2. Obtener información del usuario desde Google
      const userRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const userInfo = userRes.data;

      if (!userInfo.sub) {
        res.status(400).json({ error: "Google ID (sub) missing from user info" });
        return;
      }

      // 3. Guardar o actualizar el usuario en la base de datos
      // Usamos userInfo.sub como openId para mantener compatibilidad con tu esquema
      await db.upsertUser({
        openId: userInfo.sub,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // 4. Crear sesión (usando tu lógica de SDK actual)
      const sessionToken = await sdk.createSessionToken(userInfo.sub, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirigir al home
      res.redirect(302, "/");
    } catch (error: any) {
      console.error("[Google OAuth] Callback failed", error?.response?.data || error.message);
      res.status(500).json({ error: "Google OAuth callback failed" });
    }
  });
}
