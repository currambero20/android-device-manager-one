// @ts-nocheck
export function getSessionCookieOptions(req: any) {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    // Standard policy for local networks
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    path: "/",
    domain: undefined,
  };
}
