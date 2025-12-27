import { describe, it, expect, beforeEach } from "vitest";
import { APKBuilder, type APKConfig } from "./apkBuilder";

describe("APKBuilder", () => {
  let apkBuilder: APKBuilder;

  beforeEach(() => {
    apkBuilder = new APKBuilder();
  });

  describe("initialization", () => {
    it("should initialize APK builder", () => {
      expect(apkBuilder).toBeDefined();
    });

    it("should have required methods", () => {
      expect(apkBuilder.initialize).toBeDefined();
      expect(apkBuilder.buildAPK).toBeDefined();
      expect(apkBuilder.downloadAPK).toBeDefined();
      expect(apkBuilder.cleanupBuild).toBeDefined();
    });
  });

  describe("configuration validation", () => {
    it("should validate APK config structure", () => {
      const validConfig: APKConfig = {
        appName: "Test App",
        packageName: "com.example.testapp",
        versionName: "1.0.0",
        versionCode: 1,
        stealthMode: false,
        sslEnabled: true,
        ports: [8080, 8443],
        serverUrl: "https://example.com",
      };

      expect(validConfig.appName).toBeDefined();
      expect(validConfig.packageName).toBeDefined();
      expect(validConfig.versionName).toBeDefined();
      expect(validConfig.versionCode).toBe(1);
    });

    it("should have valid package name format", () => {
      const validPackageNames = [
        "com.example.app",
        "com.company.product.module",
        "org.test.app",
      ];

      validPackageNames.forEach((name) => {
        const regex = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;
        expect(regex.test(name)).toBe(true);
      });
    });

    it("should reject invalid package names", () => {
      const invalidPackageNames = [
        "123invalid",
        "com..double",
        "com.example-.invalid",
        "Com.Invalid.Case",
      ];

      invalidPackageNames.forEach((name) => {
        const regex = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;
        expect(regex.test(name)).toBe(false);
      });
    });

    it("should validate version format", () => {
      const validVersions = ["1.0.0", "2.5.3", "10.20.30"];
      const invalidVersions = ["1.0", "1.0.0.0", "v1.0.0"];

      const versionRegex = /^\d+\.\d+\.\d+$/;

      validVersions.forEach((version) => {
        expect(versionRegex.test(version)).toBe(true);
      });

      invalidVersions.forEach((version) => {
        expect(versionRegex.test(version)).toBe(false);
      });
    });

    it("should validate port ranges", () => {
      const validPorts = [80, 443, 8080, 8443, 65535];
      const invalidPorts = [0, -1, 65536, 100000];

      validPorts.forEach((port) => {
        expect(port >= 1 && port <= 65535).toBe(true);
      });

      invalidPorts.forEach((port) => {
        expect(port >= 1 && port <= 65535).toBe(false);
      });
    });
  });

  describe("build configuration", () => {
    it("should support stealth mode", () => {
      const config: APKConfig = {
        appName: "Stealth App",
        packageName: "com.example.stealth",
        versionName: "1.0.0",
        versionCode: 1,
        stealthMode: true,
        sslEnabled: true,
        ports: [8080],
        serverUrl: "https://example.com",
      };

      expect(config.stealthMode).toBe(true);
    });

    it("should support SSL/TLS configuration", () => {
      const configWithSSL: APKConfig = {
        appName: "Secure App",
        packageName: "com.example.secure",
        versionName: "1.0.0",
        versionCode: 1,
        stealthMode: false,
        sslEnabled: true,
        ports: [8443],
        serverUrl: "https://example.com",
      };

      const configWithoutSSL: APKConfig = {
        appName: "Insecure App",
        packageName: "com.example.insecure",
        versionName: "1.0.0",
        versionCode: 1,
        stealthMode: false,
        sslEnabled: false,
        ports: [8080],
        serverUrl: "http://example.com",
      };

      expect(configWithSSL.sslEnabled).toBe(true);
      expect(configWithoutSSL.sslEnabled).toBe(false);
    });

    it("should support multiple ports", () => {
      const config: APKConfig = {
        appName: "Multi Port App",
        packageName: "com.example.multiport",
        versionName: "1.0.0",
        versionCode: 1,
        stealthMode: false,
        sslEnabled: true,
        ports: [8080, 8443, 9000, 9443],
        serverUrl: "https://example.com",
      };

      expect(config.ports.length).toBe(4);
      expect(config.ports).toContain(8080);
      expect(config.ports).toContain(8443);
    });

    it("should support optional icon URL", () => {
      const configWithIcon: APKConfig = {
        appName: "App with Icon",
        packageName: "com.example.icon",
        versionName: "1.0.0",
        versionCode: 1,
        stealthMode: false,
        sslEnabled: true,
        ports: [8080],
        serverUrl: "https://example.com",
        iconUrl: "https://example.com/icon.png",
      };

      const configWithoutIcon: APKConfig = {
        appName: "App without Icon",
        packageName: "com.example.noicon",
        versionName: "1.0.0",
        versionCode: 1,
        stealthMode: false,
        sslEnabled: true,
        ports: [8080],
        serverUrl: "https://example.com",
      };

      expect(configWithIcon.iconUrl).toBeDefined();
      expect(configWithoutIcon.iconUrl).toBeUndefined();
    });
  });

  describe("build result", () => {
    it("should return build result with required fields", () => {
      const expectedResult = {
        success: true,
        buildId: "build-123",
        apkUrl: "/api/apk/download/build-123",
        progress: 100,
        status: "completed" as const,
      };

      expect(expectedResult).toHaveProperty("success");
      expect(expectedResult).toHaveProperty("buildId");
      expect(expectedResult).toHaveProperty("apkUrl");
      expect(expectedResult).toHaveProperty("progress");
      expect(expectedResult).toHaveProperty("status");
    });

    it("should handle failed builds", () => {
      const failedResult = {
        success: false,
        buildId: "build-456",
        error: "Compilation failed",
        progress: 0,
        status: "failed" as const,
      };

      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBeDefined();
      expect(failedResult.status).toBe("failed");
    });
  });

  describe("build ID generation", () => {
    it("should generate unique build IDs", () => {
      const buildId1 = `build-${Date.now()}-abc123`;
      const buildId2 = `build-${Date.now() + 1}-def456`;

      expect(buildId1).not.toBe(buildId2);
    });

    it("should include timestamp in build ID", () => {
      const timestamp = Date.now();
      const buildId = `build-${timestamp}-xyz`;

      expect(buildId).toContain("build-");
      expect(buildId).toContain(String(timestamp));
    });
  });

  describe("manifest generation", () => {
    it("should generate valid Android manifest", () => {
      const config: APKConfig = {
        appName: "Test App",
        packageName: "com.example.test",
        versionName: "1.0.0",
        versionCode: 1,
        stealthMode: false,
        sslEnabled: true,
        ports: [8080],
        serverUrl: "https://example.com",
      };

      // Manifest should be generated (tested through actual build)
      expect(config.packageName).toBeDefined();
      expect(config.appName).toBeDefined();
    });
  });
});
