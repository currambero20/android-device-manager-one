import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import * as db from "../db";

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
        name: z.string(),
        email: z.string().email(),
        role: z.enum(["admin", "manager", "user", "viewer"]),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createUser(input);
    }),
});
