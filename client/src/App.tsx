// v3.15.1 - Security & Stability 2026-03-18
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import { useEffect, useState } from "react";

import { Route, Switch, Redirect } from "wouter";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Users from "./pages/Users";
import Permissions from "./pages/Permissions";
import ApkBuilder from "./pages/ApkBuilder";
import Profile from "./pages/Profile";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import DeviceMap from "./pages/DeviceMap";
import AppManager from "./pages/AppManager";
import FileExplorer from "./pages/FileExplorer";
import PermissionsManagement from "./pages/PermissionsManagement";
import AdvancedMonitoring from "./pages/AdvancedMonitoring";
import DeviceMonitoring from "./pages/DeviceMonitoring";
import RemoteControl from "./pages/RemoteControl";
import Analytics from "./pages/Analytics";
import Geofencing from "./pages/Geofencing";
import Notifications from "./pages/Notifications";
import GpsTracker from "./pages/GpsTracker";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import MediaCapture from "./pages/MediaCapture";
import Communications from "./pages/Communications";
import { useSectionPermissions, SECTION_PERMISSIONS } from "./hooks/useSectionPermissions";
import NotFound from "./pages/NotFound";

interface ProtectedRouteProps {
  path: string;
  permission?: typeof SECTION_PERMISSIONS[keyof typeof SECTION_PERMISSIONS];
  children: React.ReactNode;
}

function ProtectedRoute({ path, permission, children }: ProtectedRouteProps) {
  const { hasPermission, isAdmin } = useSectionPermissions();
  
  if (isAdmin) {
    return <Route path={path}>{children}</Route>;
  }
  
  if (permission && !hasPermission(permission)) {
    return <Route path={path}><NotFound /></Route>;
  }
  
  return <Route path={path}>{children}</Route>;
}

function Router() {
  const { user, isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      <ProtectedRoute path="/dashboard" permission={SECTION_PERMISSIONS.DASHBOARD}>
        <Dashboard />
      </ProtectedRoute>
      
      <ProtectedRoute path="/devices" permission={SECTION_PERMISSIONS.DEVICES}>
        <Devices />
      </ProtectedRoute>
      
      <ProtectedRoute path="/users" permission={SECTION_PERMISSIONS.USERS}>
        <Users />
      </ProtectedRoute>
      
      <ProtectedRoute path="/permissions" permission={SECTION_PERMISSIONS.PERMISSIONS}>
        <Permissions />
      </ProtectedRoute>
      
      <ProtectedRoute path="/apk-builder" permission={SECTION_PERMISSIONS.APK_BUILDER}>
        <ApkBuilder />
      </ProtectedRoute>
      
      <ProtectedRoute path="/audit-logs" permission={SECTION_PERMISSIONS.AUDIT_LOGS}>
        <AuditLogs />
      </ProtectedRoute>
      
      <ProtectedRoute path="/settings" permission={SECTION_PERMISSIONS.SETTINGS}>
        <Settings />
      </ProtectedRoute>
      
      <ProtectedRoute path="/profile" permission={SECTION_PERMISSIONS.PROFILE}>
        <Profile />
      </ProtectedRoute>
      
      <ProtectedRoute path="/device-map" permission={SECTION_PERMISSIONS.DEVICE_MAP}>
        <DeviceMap />
      </ProtectedRoute>
      
      <ProtectedRoute path="/app-manager" permission={SECTION_PERMISSIONS.APP_MANAGER}>
        <AppManager />
      </ProtectedRoute>
      
      <ProtectedRoute path="/file-explorer" permission={SECTION_PERMISSIONS.FILE_EXPLORER}>
        <FileExplorer />
      </ProtectedRoute>
      
      <ProtectedRoute path="/permissions-management" permission={SECTION_PERMISSIONS.PERMISSIONS_MANAGEMENT}>
        <PermissionsManagement />
      </ProtectedRoute>
      
      <ProtectedRoute path="/advanced-monitoring" permission={SECTION_PERMISSIONS.ADVANCED_MONITORING}>
        <AdvancedMonitoring />
      </ProtectedRoute>
      
      <ProtectedRoute path="/monitoring" permission={SECTION_PERMISSIONS.DEVICE_MONITORING}>
        <DeviceMonitoring />
      </ProtectedRoute>
      
      <ProtectedRoute path="/remote-control" permission={SECTION_PERMISSIONS.REMOTE_CONTROL}>
        <RemoteControl />
      </ProtectedRoute>
      
      <ProtectedRoute path="/analytics" permission={SECTION_PERMISSIONS.ANALYTICS}>
        <Analytics />
      </ProtectedRoute>
      
      <ProtectedRoute path="/geofencing" permission={SECTION_PERMISSIONS.GEOFENCING}>
        <Geofencing />
      </ProtectedRoute>
      
      <ProtectedRoute path="/notifications" permission={SECTION_PERMISSIONS.NOTIFICATIONS}>
        <Notifications />
      </ProtectedRoute>

      <ProtectedRoute path="/gps-tracker" permission={SECTION_PERMISSIONS.GPS_TRACKER}>
        <GpsTracker />
      </ProtectedRoute>

      <ProtectedRoute path="/compliance" permission={SECTION_PERMISSIONS.COMPLIANCE}>
        <ComplianceDashboard />
      </ProtectedRoute>
      
      <ProtectedRoute path="/media-capture/:deviceId?" permission={SECTION_PERMISSIONS.MEDIA_CAPTURE}>
        <MediaCapture deviceId={null} />
      </ProtectedRoute>

      <ProtectedRoute path="/communications" permission={SECTION_PERMISSIONS.COMMUNICATIONS}>
        <Communications />
      </ProtectedRoute>

      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <div className="fixed bottom-2 right-2 text-[10px] text-gray-400 opacity-50 z-50 pointer-events-none">
            Android Device Manager - Enterprise Access
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
