export function getSessionCookieOptions(req: Request) {
  const isProduction = process.env.NODE_ENV === "production";
  
  return {
    httpOnly: true,
    secure: isProduction,
    // ✅ Crucial para comunicación Vercel -> Render
    sameSite: (isProduction ? "none" : "lax") as const,
    path: "/",
    domain: undefined,
  };
}
