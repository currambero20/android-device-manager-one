// v3.14 - Real Control & Modular Menu 2026-03-18
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

function Router() {
  const { user, isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading spinner only briefly
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

  // Show login page when not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      {/* Protected Routes - all accessible when authenticated */}
      <Route path="/dashboard">
        <Dashboard />
      </Route>
      <Route path="/devices">
        <Devices />
      </Route>
      <Route path="/users">
        <Users />
      </Route>
      <Route path="/permissions">
        <Permissions />
      </Route>
      <Route path="/apk-builder">
        <ApkBuilder />
      </Route>
      <Route path="/audit-logs">
        <AuditLogs />
      </Route>
      <Route path="/settings">
        <Settings />
      </Route>
      <Route path="/profile">
        <Profile />
      </Route>
      <Route path="/device-map">
        <DeviceMap />
      </Route>
      <Route path="/app-manager">
        <AppManager />
      </Route>
      <Route path="/file-explorer">
        <FileExplorer />
      </Route>
      <Route path="/permissions-management">
        <PermissionsManagement />
      </Route>
      <Route path="/advanced-monitoring">
        <AdvancedMonitoring />
      </Route>
      <Route path="/monitoring">
        <DeviceMonitoring />
      </Route>
      <Route path="/remote-control">
        <RemoteControl />
      </Route>
      <Route path="/analytics">
        <Analytics />
      </Route>
      <Route path="/geofencing">
        <Geofencing />
      </Route>
      <Route path="/notifications">
        <Notifications />
      </Route>

      {/* Phase 2: GPS & Geofencing */}
      <Route path="/gps-tracker">
        <GpsTracker />
      </Route>

      {/* Phase 3: Compliance & DLP */}
      <Route path="/compliance">
        <ComplianceDashboard />
      </Route>
      
      {/* Media Capture */}
      <Route path="/media-capture">
        <MediaCapture />
      </Route>

      <Route>
        <Redirect to="/dashboard" />
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
          {/* Version Indicator */}
          <div className="fixed bottom-2 right-2 text-[10px] text-gray-400 opacity-50 z-50 pointer-events-none">
            v3.14 - Control Real
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
