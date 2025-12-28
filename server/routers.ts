/**
 * Authentication routes
 */
auth: router({
  me: protectedProcedure.query(async ({ ctx }) => {
    // Solo usuarios autenticados pueden acceder
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }
    return ctx.user;
  }),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),
}),
