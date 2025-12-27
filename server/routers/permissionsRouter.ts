import { protectedProcedure, router } from "../_core/trpc";
import { permissionsManager, Permission, PERMISSION_PRESETS, PERMISSION_DESCRIPTIONS, PERMISSION_CATEGORIES } from "../permissionsManager";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const permissionsRouter = router({
  /**
   * Obtener todos los permisos disponibles
   */
  getAllPermissions: protectedProcedure.query(() => {
    return permissionsManager.getAllPermissions().map((perm) => ({
      code: perm,
      description: permissionsManager.getPermissionDescription(perm),
      category: permissionsManager.getPermissionCategory(perm),
    }));
  }),

  /**
   * Obtener permisos por categoría
   */
  getPermissionsByCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(({ input }) => {
      const perms = permissionsManager.getPermissionsByCategory(input.category);
      return perms.map((perm) => ({
        code: perm,
        description: permissionsManager.getPermissionDescription(perm),
      }));
    }),

  /**
   * Obtener permisos de usuario
   */
  getUserPermissions: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const perms = await permissionsManager.getUserPermissions(input.userId);
      return perms.map((perm) => ({
        code: perm,
        description: permissionsManager.getPermissionDescription(perm),
        category: permissionsManager.getPermissionCategory(perm),
      }));
    }),

  /**
   * Obtener permisos de dispositivo para usuario
   */
  getDevicePermissions: protectedProcedure
    .input(z.object({ deviceId: z.number(), userId: z.number() }))
    .query(async ({ input }) => {
      const perms = await permissionsManager.getDevicePermissions(input.deviceId, input.userId);
      return perms.map((perm) => ({
        code: perm,
        description: permissionsManager.getPermissionDescription(perm),
      }));
    }),

  /**
   * Obtener permisos efectivos (intersección)
   */
  getEffectivePermissions: protectedProcedure
    .input(z.object({ deviceId: z.number(), userId: z.number() }))
    .query(async ({ input }) => {
      const perms = await permissionsManager.getEffectivePermissions(input.userId, input.deviceId);
      return perms.map((perm) => ({
        code: perm,
        description: permissionsManager.getPermissionDescription(perm),
        category: permissionsManager.getPermissionCategory(perm),
      }));
    }),

  /**
   * Verificar permiso específico
   */
  hasPermission: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        userId: z.number(),
        permission: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Solo admin o el usuario mismo puede verificar
      if (ctx.user.role !== "admin" && ctx.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return await permissionsManager.hasPermission(
        input.userId,
        input.deviceId,
        input.permission as Permission
      );
    }),

  /**
   * Asignar permiso a usuario
   */
  assignUserPermission: protectedProcedure
    .input(z.object({ userId: z.number(), permission: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Solo admin puede asignar permisos
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await permissionsManager.assignUserPermission(input.userId, input.permission as Permission);
      return { success: true };
    }),

  /**
   * Revocar permiso de usuario
   */
  revokeUserPermission: protectedProcedure
    .input(z.object({ userId: z.number(), permission: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await permissionsManager.revokeUserPermission(input.userId, input.permission as Permission);
      return { success: true };
    }),

  /**
   * Asignar permiso a dispositivo
   */
  assignDevicePermission: protectedProcedure
    .input(z.object({ deviceId: z.number(), userId: z.number(), permission: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await permissionsManager.assignDevicePermission(
        input.deviceId,
        input.userId,
        input.permission as Permission
      );
      return { success: true };
    }),

  /**
   * Revocar permiso de dispositivo
   */
  revokeDevicePermission: protectedProcedure
    .input(z.object({ deviceId: z.number(), userId: z.number(), permission: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await permissionsManager.revokeDevicePermission(
        input.deviceId,
        input.userId,
        input.permission as Permission
      );
      return { success: true };
    }),

  /**
   * Asignar preset de permisos
   */
  assignPreset: protectedProcedure
    .input(z.object({ userId: z.number(), preset: z.enum(["admin", "manager", "user", "viewer"]) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await permissionsManager.assignPreset(input.userId, input.preset);
      return { success: true };
    }),

  /**
   * Limpiar permisos de usuario
   */
  clearUserPermissions: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await permissionsManager.clearUserPermissions(input.userId);
      return { success: true };
    }),

  /**
   * Obtener matriz de permisos
   */
  getPermissionMatrix: protectedProcedure
    .input(z.object({ userId: z.number(), deviceIds: z.array(z.number()) }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return await permissionsManager.getPermissionMatrix(input.userId, input.deviceIds);
    }),

  /**
   * Obtener presets disponibles
   */
  getPresets: protectedProcedure.query(() => {
    return Object.entries(PERMISSION_PRESETS).map(([name, perms]) => ({
      name,
      count: perms.length,
      permissions: perms.map((p) => ({
        code: p,
        description: permissionsManager.getPermissionDescription(p),
      })),
    }));
  }),

  /**
   * Obtener categorías de permisos
   */
  getCategories: protectedProcedure.query(() => {
    return Object.entries(PERMISSION_CATEGORIES).map(([name, perms]) => ({
      name,
      count: perms.length,
      permissions: perms,
    }));
  }),

  /**
   * Actualizar matriz de permisos usuario-dispositivo
   * Guarda los cambios en la base de datos
   */
  updatePermissionMatrix: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        deviceId: z.number(),
        permissions: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Solo admin o manager pueden actualizar permisos de dispositivos
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Validar que los permisos sean válidos
      const allPermissions = permissionsManager.getAllPermissions();
      const invalidPerms = input.permissions.filter((p) => !allPermissions.includes(p as Permission));
      if (invalidPerms.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Permisos inválidos: ${invalidPerms.join(", ")}`,
        });
      }

      try {
        // Obtener permisos actuales
        const currentPerms = await permissionsManager.getDevicePermissions(input.deviceId, input.userId);
        const currentSet = new Set(currentPerms);
        const newSet = new Set(input.permissions);

        // Encontrar permisos a agregar y remover
        const toAdd = input.permissions.filter((p) => !currentSet.has(p as Permission));
        const toRemove = currentPerms.filter((p) => !newSet.has(p));

        // Aplicar cambios
        for (const perm of toAdd) {
          await permissionsManager.assignDevicePermission(
            input.deviceId,
            input.userId,
            perm as Permission
          );
        }

        for (const perm of toRemove) {
          await permissionsManager.revokeDevicePermission(
            input.deviceId,
            input.userId,
            perm as Permission
          );
        }

        return {
          success: true,
          added: toAdd.length,
          removed: toRemove.length,
          total: input.permissions.length,
        };
      } catch (error) {
        console.error("[PermissionsRouter] Error updating permission matrix:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al actualizar permisos",
        });
      }
    }),
});
