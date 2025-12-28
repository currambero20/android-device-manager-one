import type { Request } from "express";

export function getSessionCookieOptions(req: Request) {
  const isProduction = process.env.NODE_ENV === "production";
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    domain: isProduction ? undefined : undefined,
  };
}
