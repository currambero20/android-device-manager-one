import { useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { 
  SECTION_PERMISSIONS, 
  DEFAULT_ROLE_PERMISSIONS, 
  type SectionPermission 
} from "@/lib/sectionPermissions";

const PATH_TO_PERMISSION: Record<string, SectionPermission> = {
  "/dashboard": SECTION_PERMISSIONS.DASHBOARD,
  "/devices": SECTION_PERMISSIONS.DEVICES,
  "/users": SECTION_PERMISSIONS.USERS,
  "/permissions": SECTION_PERMISSIONS.PERMISSIONS,
  "/permissions-management": SECTION_PERMISSIONS.PERMISSIONS_MANAGEMENT,
  "/apk-builder": SECTION_PERMISSIONS.APK_BUILDER,
  "/audit-logs": SECTION_PERMISSIONS.AUDIT_LOGS,
  "/settings": SECTION_PERMISSIONS.SETTINGS,
  "/device-map": SECTION_PERMISSIONS.DEVICE_MAP,
  "/app-manager": SECTION_PERMISSIONS.APP_MANAGER,
  "/file-explorer": SECTION_PERMISSIONS.FILE_EXPLORER,
  "/advanced-monitoring": SECTION_PERMISSIONS.ADVANCED_MONITORING,
  "/monitoring": SECTION_PERMISSIONS.DEVICE_MONITORING,
  "/remote-control": SECTION_PERMISSIONS.REMOTE_CONTROL,
  "/analytics": SECTION_PERMISSIONS.ANALYTICS,
  "/geofencing": SECTION_PERMISSIONS.GEOFENCING,
  "/notifications": SECTION_PERMISSIONS.NOTIFICATIONS,
  "/gps-tracker": SECTION_PERMISSIONS.GPS_TRACKER,
  "/compliance": SECTION_PERMISSIONS.COMPLIANCE,
  "/media-capture": SECTION_PERMISSIONS.MEDIA_CAPTURE,
  "/communications": SECTION_PERMISSIONS.COMMUNICATIONS,
  "/profile": SECTION_PERMISSIONS.PROFILE,
};

export function useSectionPermissions() {
  const { user } = useAuth();
  
  const { data: userPermissionsData } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id || 0 },
    { enabled: !!user?.id }
  );

  const grantedPermissions = useMemo(() => {
    const permissions = new Set<SectionPermission>();
    
    if (!user) return permissions;
    
    if (user.role === "admin") {
      Object.values(SECTION_PERMISSIONS).forEach(p => permissions.add(p));
      return permissions;
    }
    
    const roleDefaults = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    roleDefaults.forEach(p => permissions.add(p));
    
    if (userPermissionsData) {
      userPermissionsData.forEach((up: any) => {
        if (up.permission?.code?.startsWith("section:")) {
          permissions.add(up.permission.code as SectionPermission);
        }
      });
    }
    
    return permissions;
  }, [user, userPermissionsData]);

  const hasPermission = (permission: SectionPermission): boolean => {
    return grantedPermissions.has(permission);
  };

  const hasPathPermission = (path: string): boolean => {
    const permission = PATH_TO_PERMISSION[path];
    if (!permission) return true;
    return hasPermission(permission);
  };

  const getDeniedPaths = (paths: string[]): string[] => {
    return paths.filter(path => !hasPathPermission(path));
  };

  return {
    grantedPermissions: Array.from(grantedPermissions),
    hasPermission,
    hasPathPermission,
    getDeniedPaths,
    isAdmin: user?.role === "admin",
    isManager: user?.role === "manager",
  };
}

export { SECTION_PERMISSIONS, PATH_TO_PERMISSION };
