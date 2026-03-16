import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import Home from "./pages/Home";
import DashboardLayout from "./components/DashboardLayout";
import { useEffect, useState } from "react";

import { Route, Switch, Redirect } from "wouter";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Users from "./pages/Users";
import Permissions from "./pages/Permissions";
import ApkBuilder from "./pages/ApkBuilder";
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

function Router() {
  const { user, isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Home />}
      </Route>
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        {isAuthenticated ? <Dashboard /> : <Redirect to="/" />}
      </Route>
      <Route path="/devices">
        {isAuthenticated ? <Devices /> : <Redirect to="/" />}
      </Route>
      <Route path="/users">
        {isAuthenticated ? <Users /> : <Redirect to="/" />}
      </Route>
      <Route path="/permissions">
        {isAuthenticated ? <Permissions /> : <Redirect to="/" />}
      </Route>
      <Route path="/apk-builder">
        {isAuthenticated ? <ApkBuilder /> : <Redirect to="/" />}
      </Route>
      <Route path="/audit-logs">
        {isAuthenticated ? <AuditLogs /> : <Redirect to="/" />}
      </Route>
      <Route path="/settings">
        {isAuthenticated ? <Settings /> : <Redirect to="/" />}
      </Route>
      <Route path="/device-map">
        {isAuthenticated ? <DeviceMap /> : <Redirect to="/" />}
      </Route>
      <Route path="/app-manager">
        {isAuthenticated ? <AppManager /> : <Redirect to="/" />}
      </Route>
      <Route path="/file-explorer">
        {isAuthenticated ? <FileExplorer /> : <Redirect to="/" />}
      </Route>
      <Route path="/permissions-management">
        {isAuthenticated ? <PermissionsManagement /> : <Redirect to="/" />}
      </Route>
      <Route path="/advanced-monitoring">
        {isAuthenticated ? <AdvancedMonitoring /> : <Redirect to="/" />}
      </Route>
      <Route path="/monitoring">
        {isAuthenticated ? <DeviceMonitoring /> : <Redirect to="/" />}
      </Route>
      <Route path="/remote-control">
        {isAuthenticated ? <RemoteControl /> : <Redirect to="/" />}
      </Route>
      <Route path="/analytics">
        {isAuthenticated ? <Analytics /> : <Redirect to="/" />}
      </Route>
      <Route path="/geofencing">
        {isAuthenticated ? <Geofencing /> : <Redirect to="/" />}
      </Route>
      <Route path="/notifications">
        {isAuthenticated ? <Notifications /> : <Redirect to="/" />}
      </Route>

      <Route>
        <Redirect to="/" />
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
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
