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
  MessageSquare,
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
      label: "Comunicaciones MDM",
      icon: MessageSquare,
      href: "/communications",
      roles: ["admin", "manager", "user"],
      permission: "MENU_COMMUNICATIONS",
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
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden relative">
      <div className="cyber-scanline pointer-events-none" />
      
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.05),transparent_70%)] pointer-events-none" />

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-24"
        } glass-panel border-r border-cyan-500/10 transition-all duration-500 flex flex-col overflow-hidden relative z-20 shadow-[20px_0_50px_rgba(0,0,0,0.5)]`}
      >
        <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />

        {/* Logo */}
        <div className="p-8 pb-10 flex items-center justify-between border-b border-cyan-500/5">
          {sidebarOpen && (
            <div className="flex items-center gap-4 group">
              <div className="p-2 rounded-xl bg-cyan-500/5 border border-cyan-500/20 group-hover:rotate-12 transition-transform duration-500">
                <Smartphone className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-2xl tracking-tighter uppercase gradient-text italic">ADM_OS</span>
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-cyan-500/50 -mt-1 italic">CORE_V4.0</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-3 glass-panel border-cyan-500/20 rounded-xl hover:text-cyan-400 hover:border-cyan-400/50 transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.1)] group"
          >
            {sidebarOpen ? <X className="w-5 h-5 group-hover:rotate-90 transition-transform" /> : <Menu className="w-5 h-5 group-hover:scale-110 transition-transform" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = window.location.pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                  isActive 
                  ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]" 
                  : "hover:bg-cyan-500/5 border border-transparent text-cyan-100/50 hover:text-cyan-200"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 h-full w-1 bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                )}
                <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-cyan-400"}`} />
                {sidebarOpen && (
                  <span className="text-[10px] font-black uppercase tracking-widest italic">{item.label}</span>
                )}
                {!sidebarOpen && (
                   <div className="absolute left-20 bg-black/90 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                   </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-6 border-t border-cyan-500/5 space-y-4">
          {sidebarOpen && (
            <div className="glass-panel border-cyan-500/10 p-5 group hover:border-cyan-500/30 transition-all duration-500 bg-black/40">
              <p className="text-[8px] font-black text-cyan-500/40 uppercase tracking-[0.4em] mb-2 italic">Session_Active</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center group-hover:rotate-3 transition-transform">
                  <span className="text-cyan-400 font-black text-sm italic">{user?.name?.[0]?.toUpperCase() || "U"}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-[10px] font-black text-white truncate uppercase tracking-tight italic">{user?.name || "SYS_OPERATOR"}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <p className="text-[8px] font-black text-cyan-500/60 uppercase tracking-widest">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <Button
            onClick={logout}
            variant="ghost"
            className={`w-full h-14 justify-start glass-panel border-rose-500/10 hover:border-rose-500/40 hover:bg-rose-500/5 text-rose-500 font-black uppercase tracking-widest text-[9px] italic group transition-all duration-500 ${!sidebarOpen && "justify-center"}`}
          >
            <LogOut className={`w-5 h-5 transition-transform duration-500 group-hover:-translate-x-1 ${sidebarOpen && "mr-3"}`} />
            {sidebarOpen && "CIERRE_SESION"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 bg-black/20">
        {/* Top Bar */}
        <header className="glass-panel border-b border-cyan-500/5 sticky top-0 z-40 bg-black/40">
          <div className="px-10 py-6 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-1 h-8 bg-gradient-to-b from-cyan-400 to-transparent" />
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mix-blend-difference">
                {title || "dashboard_root"}
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
                  <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.3em] italic">System_Live</span>
                </div>
                <span className="text-[7px] font-black text-cyan-700 uppercase tracking-widest mt-1">Buffer: Optimal • Uplink: Stable</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto custom-scrollbar p-10">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
