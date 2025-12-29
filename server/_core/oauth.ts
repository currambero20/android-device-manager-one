import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import axios from "axios";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code) {
      console.error("[OAuth] Missing authorization code");
      return res.status(400).json({ error: "code is required" });
    }

    try {
      // 1. Intercambiar código por tokens
      const redirectUri = state ? atob(state) : `${req.protocol}://${req.get('host')}/api/oauth/callback`;
      
      const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      });

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        console.error("[OAuth] No access token received");
        return res.status(400).json({ error: "Failed to get access token" });
      }

      // 2. Obtener información del usuario
      const userRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const userInfo = userRes.data;

      if (!userInfo.sub) {
        console.error("[OAuth] Google ID missing");
        return res.status(400).json({ error: "Google ID missing" });
      }

      // 3. Guardar usuario en BD
      const user = await db.upsertUser({
        openId: userInfo.sub,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      if (!user || !user.id) {
        console.error("[OAuth] Failed to create user");
        return res.status(500).json({ error: "Failed to create user" });
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

      // 5. Establecer cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      console.log(`[OAuth] User ${userInfo.sub} logged in`);

      // 6. Redirigir a Vercel
      const frontendUrl = process.env.FRONTEND_URL || "https://repodeploy.vercel.app";
      res.redirect(302, `${frontendUrl}/dashboard`);
    } catch (error: any) {
      console.error("[OAuth] Callback failed:", error?.message);
      const frontendUrl = process.env.FRONTEND_URL || "https://repodeploy.vercel.app";
      res.redirect(302, `${frontendUrl}/?error=auth_failed`);
    }
  });
}
