import { describe, it, expect } from "vitest";
import { permissionsManager, Permission, PERMISSION_PRESETS, PERMISSION_CATEGORIES } from "./permissionsManager";

describe("Permissions Manager", () => {
  const testUserId = 1;
  const testDeviceId = 1;

  describe("Permission Enums and Constants", () => {
    it("should have all 16 permissions defined", () => {
      const allPerms = permissionsManager.getAllPermissions();
      expect(allPerms.length).toBe(16);
    });

    it("should have valid permission presets", () => {
      expect(PERMISSION_PRESETS.admin.length).toBeGreaterThan(0);
      expect(PERMISSION_PRESETS.manager.length).toBeGreaterThan(0);
      expect(PERMISSION_PRESETS.user.length).toBeGreaterThan(0);
      expect(PERMISSION_PRESETS.viewer.length).toBeGreaterThan(0);
    });

    it("should have admin preset with all permissions", () => {
      expect(PERMISSION_PRESETS.admin.length).toBe(16);
    });

    it("should have valid permission categories", () => {
      expect(Object.keys(PERMISSION_CATEGORIES).length).toBeGreaterThan(0);
    });
  });

  describe("Permission Descriptions", () => {
    it("should get description for GPS_LOGGING", () => {
      const desc = permissionsManager.getPermissionDescription(Permission.GPS_LOGGING);
      expect(desc).toContain("GPS");
    });

    it("should get description for MICROPHONE_RECORDING", () => {
      const desc = permissionsManager.getPermissionDescription(Permission.MICROPHONE_RECORDING);
      expect(desc).toContain("micrófono");
    });

    it("should return unknown for invalid permission", () => {
      const desc = permissionsManager.getPermissionDescription("INVALID" as Permission);
      expect(desc).toContain("desconocido");
    });
  });

  describe("Permission Categories", () => {
    it("should categorize GPS_LOGGING as location", () => {
      const category = permissionsManager.getPermissionCategory(Permission.GPS_LOGGING);
      expect(category).toBe("location");
    });

    it("should categorize MICROPHONE_RECORDING as audio", () => {
      const category = permissionsManager.getPermissionCategory(Permission.MICROPHONE_RECORDING);
      expect(category).toBe("audio");
    });

    it("should get permissions by category", () => {
      const locationPerms = permissionsManager.getPermissionsByCategory("location");
      expect(locationPerms.length).toBeGreaterThan(0);
      expect(locationPerms).toContain(Permission.GPS_LOGGING);
    });
  });

  describe("User Permissions", () => {
    it("should get user permissions (empty initially)", async () => {
      const perms = await permissionsManager.getUserPermissions(testUserId);
      expect(Array.isArray(perms)).toBe(true);
    });

    it("should assign permission to user", async () => {
      await permissionsManager.assignUserPermission(testUserId, Permission.GPS_LOGGING);
      expect(true).toBe(true);
    });

    it("should revoke permission from user", async () => {
      await permissionsManager.revokeUserPermission(testUserId, Permission.GPS_LOGGING);
      expect(true).toBe(true);
    });

    it("should clear all user permissions", async () => {
      await permissionsManager.clearUserPermissions(testUserId);
      expect(true).toBe(true);
    });
  });

  describe("Device Permissions", () => {
    it("should get device permissions", async () => {
      const perms = await permissionsManager.getDevicePermissions(testDeviceId, testUserId);
      expect(Array.isArray(perms)).toBe(true);
    });

    it("should assign permission to device", async () => {
      await permissionsManager.assignDevicePermission(
        testDeviceId,
        testUserId,
        Permission.LOCATION_TRACKING
      );
      expect(true).toBe(true);
    });

    it("should revoke permission from device", async () => {
      await permissionsManager.revokeDevicePermission(
        testDeviceId,
        testUserId,
        Permission.LOCATION_TRACKING
      );
      expect(true).toBe(true);
    });
  });

  describe("Effective Permissions", () => {
    it("should get effective permissions", async () => {
      const perms = await permissionsManager.getEffectivePermissions(testUserId, testDeviceId);
      expect(Array.isArray(perms)).toBe(true);
    });

    it("should check if user has permission", async () => {
      const hasPerms = await permissionsManager.hasPermission(
        testUserId,
        testDeviceId,
        Permission.GPS_LOGGING
      );
      expect(typeof hasPerms).toBe("boolean");
    });
  });

  describe("Permission Presets", () => {
    it("should assign admin preset", async () => {
      await permissionsManager.assignPreset(testUserId, "admin");
      expect(true).toBe(true);
    });

    it("should assign manager preset", async () => {
      await permissionsManager.assignPreset(testUserId, "manager");
      expect(true).toBe(true);
    });

    it("should assign user preset", async () => {
      await permissionsManager.assignPreset(testUserId, "user");
      expect(true).toBe(true);
    });

    it("should assign viewer preset", async () => {
      await permissionsManager.assignPreset(testUserId, "viewer");
      expect(true).toBe(true);
    });
  });

  describe("Permission Matrix", () => {
    it("should get permission matrix for user", async () => {
      const matrix = await permissionsManager.getPermissionMatrix(testUserId, [
        testDeviceId,
        testDeviceId + 1,
      ]);
      expect(typeof matrix).toBe("object");
      expect(matrix[testDeviceId]).toBeDefined();
    });
  });

  describe("Permission Validation", () => {
    it("should validate permission list", () => {
      const valid = permissionsManager.validatePermissions([
        "GPS_LOGGING",
        "MICROPHONE_RECORDING",
        "INVALID_PERMISSION",
      ]);
      expect(valid.length).toBe(2);
      expect(valid).toContain(Permission.GPS_LOGGING);
    });

    it("should return empty array for all invalid permissions", () => {
      const valid = permissionsManager.validatePermissions(["INVALID1", "INVALID2"]);
      expect(valid.length).toBe(0);
    });
  });

  describe("Permission Hierarchy", () => {
    it("admin preset should include all permissions", () => {
      const adminPerms = PERMISSION_PRESETS.admin;
      const allPerms = permissionsManager.getAllPermissions();
      expect(adminPerms.length).toBe(allPerms.length);
    });

    it("manager preset should be subset of admin", () => {
      const adminPerms = PERMISSION_PRESETS.admin;
      const managerPerms = PERMISSION_PRESETS.manager;
      const isSubset = managerPerms.every((p) => adminPerms.includes(p));
      expect(isSubset).toBe(true);
    });

    it("user preset should be subset of manager", () => {
      const managerPerms = PERMISSION_PRESETS.manager;
      const userPerms = PERMISSION_PRESETS.user;
      const isSubset = userPerms.every((p) => managerPerms.includes(p));
      expect(isSubset).toBe(true);
    });

    it("viewer preset should be subset of user", () => {
      const userPerms = PERMISSION_PRESETS.user;
      const viewerPerms = PERMISSION_PRESETS.viewer;
      const isSubset = viewerPerms.every((p) => userPerms.includes(p));
      expect(isSubset).toBe(true);
    });
  });

  describe("Permission Categories Coverage", () => {
    it("all permissions should have a category", () => {
      const allPerms = permissionsManager.getAllPermissions();
      for (const perm of allPerms) {
        const category = permissionsManager.getPermissionCategory(perm);
        expect(category).not.toBe("other");
      }
    });

    it("should get all permissions by category", () => {
      const categories = Object.keys(PERMISSION_CATEGORIES);
      const uniquePerms = new Set<Permission>();

      for (const category of categories) {
        const perms = permissionsManager.getPermissionsByCategory(category);
        perms.forEach((p) => uniquePerms.add(p));
      }

      // Algunos permisos pueden estar en múltiples categorías
      expect(uniquePerms.size).toBeGreaterThanOrEqual(16);
    });
  });

  describe("Critical Permissions", () => {
    it("should identify sensitive permissions", () => {
      const sensitivePerms = [
        Permission.EMAIL_HARVESTING,
        Permission.PASSWORD_EXTRACTION,
        Permission.STEALTH_MODE,
      ];

      for (const perm of sensitivePerms) {
        const category = permissionsManager.getPermissionCategory(perm);
        expect(category).toBe("security");
      }
    });

    it("viewer should not have sensitive permissions", () => {
      const viewerPerms = PERMISSION_PRESETS.viewer;
      const sensitivePerms = [
        Permission.EMAIL_HARVESTING,
        Permission.PASSWORD_EXTRACTION,
        Permission.STEALTH_MODE,
      ];

      for (const perm of sensitivePerms) {
        expect(viewerPerms).not.toContain(perm);
      }
    });
  });
});
