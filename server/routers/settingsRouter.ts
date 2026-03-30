import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { globalSettings } from "../../drizzle/schema";

export const settingsRouter = router({
  /**
   * Obtener todas las configuraciones globales
   */
  getAll: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(globalSettings);
  }),

  /**
   * Obtener una configuración específica
   */
  get: adminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(globalSettings)
        .where(eq(globalSettings.key, input.key))
        .limit(1);
      return result[0]?.value ?? null;
    }),

  /**
   * Guardar una configuración
   */
  set: adminProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const existing = await db
        .select()
        .from(globalSettings)
        .where(eq(globalSettings.key, input.key))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(globalSettings)
          .set({ value: input.value, updatedAt: new Date() })
          .where(eq(globalSettings.key, input.key));
      } else {
        await db.insert(globalSettings).values({
          key: input.key,
          value: input.value,
        });
      }

      return { success: true };
    }),

  /**
   * Guardar múltiples configuraciones (Batch)
   */
  setBatch: adminProcedure
    .input(z.record(z.string(), z.string()))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      for (const [key, value] of Object.entries(input)) {
         const existing = await db
           .select()
           .from(globalSettings)
           .where(eq(globalSettings.key, key))
           .limit(1);

         if (existing.length > 0) {
           await db
             .update(globalSettings)
             .set({ value, updatedAt: new Date() })
             .where(eq(globalSettings.key, key));
         } else {
           await db.insert(globalSettings).values({ key, value });
         }
      }

      return { success: true };
    }),
});
