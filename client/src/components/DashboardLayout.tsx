import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Shield,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  Activity,
  Bell,
  Folder,
  Package,
  Map,
} from "lucide-react";
import { Link } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigationItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
      roles: ["admin", "manager", "user", "viewer"],
    },
    {
      label: "Devices",
      icon: Smartphone,
      href: "/devices",
      roles: ["admin", "manager", "user"],
    },
    {
      label: "Users",
      icon: Users,
      href: "/users",
      roles: ["admin"],
    },
    {
      label: "Permissions",
      icon: Shield,
      href: "/permissions",
      roles: ["admin", "manager"],
    },
    {
      label: "APK Builder",
      icon: Zap,
      href: "/apk-builder",
      roles: ["admin", "manager", "user"],
    },
    {
      label: "Audit Logs",
      icon: FileText,
      href: "/audit-logs",
      roles: ["admin", "manager"],
    },
    {
      label: "Monitoring",
      icon: Smartphone,
      href: "/monitoring",
      roles: ["admin", "manager", "user"],
    },
    {
      label: "Remote Control",
      icon: Zap,
      href: "/remote-control",
      roles: ["admin", "manager", "user"],
    },
    {
      label: "Analytics",
      icon: Activity,
      href: "/analytics",
      roles: ["admin", "manager", "user"],
    },
    {
      label: "Geofencing",
      icon: Shield,
      href: "/geofencing",
      roles: ["admin", "manager", "user"],
    },
    {
      label: "Notificaciones",
      icon: Bell,
      href: "/notifications",
      roles: ["admin", "manager", "user", "viewer"],
    },
    {
      label: "Monitoreo Avanzado",
      icon: Activity,
      href: "/advanced-monitoring",
      roles: ["admin", "manager", "user"],
    },
    {
      label: "Permisos Granulares",
      icon: Shield,
      href: "/permissions-management",
      roles: ["admin"],
    },
    {
      label: "Explorador de Archivos",
      icon: Folder,
      href: "/file-explorer",
      roles: ["admin", "manager", "user"],
    },
    {
      label: "Gestor de Aplicaciones",
      icon: Package,
      href: "/app-manager",
      roles: ["admin", "manager", "user"],
    },
    {
      label: "Mapa de Dispositivos",
      icon: Map,
      href: "/device-map",
      roles: ["admin", "manager", "user"],
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
      roles: ["admin", "manager", "user", "viewer"],
    },
  ];

  const visibleItems = navigationItems.filter((item) => item.roles.includes(user?.role || "viewer"));

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } border-r border-glow-cyan bg-card/50 backdrop-blur transition-all duration-300 flex flex-col overflow-hidden`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-glow-cyan flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Smartphone className="w-6 h-6 glow-cyan" />
              <span className="font-bold text-sm gradient-text">ADM</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-accent/20 rounded transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <a className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/20 transition-colors group">
                  <Icon className="w-5 h-5 glow-purple group-hover:glow-cyan transition-all" />
                  {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-glow-cyan p-4 space-y-3">
          {sidebarOpen && (
            <div className="card-neon-cyan p-3">
              <p className="text-xs font-bold text-cyan-400 mb-1">Current User</p>
              <p className="text-sm truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          )}
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="w-full btn-neon"
          >
            {sidebarOpen ? (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </>
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="border-b border-glow-cyan bg-card/50 backdrop-blur">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold gradient-text">{title || "Dashboard"}</h1>
            <div className="flex items-center gap-4">
              <div className="status-online animate-pulse"></div>
              <span className="text-sm text-muted-foreground">System Online</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
