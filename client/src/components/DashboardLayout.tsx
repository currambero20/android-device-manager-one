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
  Navigation,
  ShieldCheck,
  FolderOpen,
  Camera,
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
      label: "Panel",
      icon: LayoutDashboard,
      href: "/dashboard",
      roles: ["admin", "manager", "user", "viewer"],
      permission: "MENU_DASHBOARD",
    },
    {
      label: "Dispositivos",
      icon: Smartphone,
      href: "/devices",
      roles: ["admin", "manager", "user"],
      permission: "MENU_DEVICES",
    },
    {
      label: "Usuarios",
      icon: Users,
      href: "/users",
      roles: ["admin"],
    },
    {
      label: "Permisos",
      icon: Shield,
      href: "/permissions",
      roles: ["admin", "manager"],
    },
    {
      label: "Creador de APK",
      icon: Zap,
      href: "/apk-builder",
      roles: ["admin", "manager", "user"],
      permission: "MENU_APK_BUILDER",
    },
    {
      label: "Registros de Auditoría",
      icon: FileText,
      href: "/audit-logs",
      roles: ["admin", "manager"],
    },
    {
      label: "Monitor de Dispositivo",
      icon: Smartphone,
      href: "/monitoring",
      roles: ["admin", "manager", "user"],
      permission: "MENU_DEVICES",
    },
    {
      label: "Control Remoto",
      icon: Zap,
      href: "/remote-control",
      roles: ["admin", "manager", "user"],
      permission: "MENU_REMOTE_CONTROL",
    },
    {
      label: "Análisis y Métricas",
      icon: Activity,
      href: "/analytics",
      roles: ["admin", "manager", "user"],
    },

    {
      label: "Notificaciones",
      icon: Bell,
      href: "/notifications",
      roles: ["admin", "manager", "user", "viewer"],
      permission: "MENU_NOTIFICATIONS",
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
      permission: "MENU_FILE_EXPLORER",
    },
    {
      label: "Gestor de Aplicaciones",
      icon: Package,
      href: "/app-manager",
      roles: ["admin", "manager", "user"],
      permission: "MENU_APPS",
    },
    {
      label: "Mapa de Dispositivos",
      icon: Map,
      href: "/device-map",
      roles: ["admin", "manager", "user"],
      permission: "MENU_LOCATION",
    },
    {
      label: "GPS y Geocercas",
      icon: Navigation,
      href: "/gps-tracker",
      roles: ["admin", "manager", "user"],
      permission: "MENU_LOCATION",
    },
    {
      label: "Compliance & DLP",
      icon: ShieldCheck,
      href: "/compliance",
      roles: ["admin", "manager"],
    },
    {
      label: "Captura Remota",
      icon: Camera,
      href: "/media-capture",
      roles: ["admin", "manager", "user"],
    },
    {
      label: "Configuración",
      icon: Settings,
      href: "/settings",
      roles: ["admin", "manager", "user", "viewer"],
    },
    {
      label: "Mi Perfil",
      icon: Users,
      href: "/profile",
      roles: ["admin", "manager", "user", "viewer"],
    },
  ];

  const visibleItems = navigationItems.filter((item: any) => {
    if (user?.role === "admin") return true;
    const hasRole = item.roles.includes(user?.role || "viewer");
    const hasPermission = !item.permission || user?.permissions?.includes(item.permission);
    return hasRole && hasPermission;
  });

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } border-r border-accent/20 bg-card/80 backdrop-blur-md transition-all duration-300 flex flex-col overflow-hidden shadow-sm`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-accent/10 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-cyan-600" />
              <span className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700">ADM</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-accent/10 rounded transition-colors text-muted-foreground hover:text-foreground"
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
                <a className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/10 transition-colors group">
                  <Icon className="w-5 h-5 text-cyan-600 group-hover:text-blue-600 transition-all" />
                  {sidebarOpen && <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">{item.label}</span>}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-accent/20 p-4 space-y-3">
          {sidebarOpen && (
            <div className="bg-accent/5 border border-accent/10 rounded-lg p-3">
              <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider mb-1">Usuario Actual</p>
              <p className="text-sm font-medium truncate">{user?.name || "Usuario"}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          )}
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
          >
            {sidebarOpen ? (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
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
        <header className="border-b border-accent/20 bg-background/80 backdrop-blur-md z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 lowercase">{title || "dashboard"}</h1>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Sistema Activo</span>
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
