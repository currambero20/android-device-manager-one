import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { createHash } from "crypto";

// Hash SHA-256 simple para contraseñas de usuarios manuales
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export const usersRouter = router({
  getAll: adminProcedure.query(async () => {
    return await db.getAllUsers();
  }),

  updateRole: adminProcedure
    .input(
      z.object({
        id: z.number(),
        role: z.enum(["admin", "manager", "user", "viewer"]),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateUserRole(input.id, input.role);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteUser(input.id);
      return { success: true };
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["admin", "manager", "user", "viewer"]),
      })
    )
    .mutation(async ({ input }) => {
      const passwordHash = hashPassword(input.password);
      return await db.createUser({
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash,
      });
    }),

  resetPassword: adminProcedure
    .input(
      z.object({
        id: z.number(),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const passwordHash = hashPassword(input.newPassword);
      await db.updateUserPassword(input.id, passwordHash);
      return { success: true };
    }),

  /**
   * Update current user profile (name and/or password).
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        password: z.string().min(6).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updates: any = {};
      if (input.name) updates.name = input.name;
      if (input.password) {
        updates.passwordHash = hashPassword(input.password);
      }

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const { users: usersTable } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      await dbInstance
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, ctx.user.id));

      return { success: true };
    }),
});
