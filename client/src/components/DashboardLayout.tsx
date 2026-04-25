import React, { useState, useEffect } from "react";
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
  Sun,
  Moon,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [location] = useLocation();

  // Handle responsiveness
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar on mobile after navigation
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location, isMobile]);

  const navigationItems = [
    { label: "Panel", icon: LayoutDashboard, href: "/dashboard", roles: ["admin", "manager", "user", "viewer"] },
    { label: "Dispositivos", icon: Smartphone, href: "/devices", roles: ["admin", "manager", "user"] },
    { label: "Usuarios", icon: Users, href: "/users", roles: ["admin"] },
    { label: "Permisos", icon: Shield, href: "/permissions", roles: ["admin", "manager"] },
    { label: "Creador de APK", icon: Zap, href: "/apk-builder", roles: ["admin", "manager", "user"] },
    { label: "Registros de Auditoría", icon: FileText, href: "/audit-logs", roles: ["admin", "manager"] },
    { label: "Monitor de Dispositivo", icon: Smartphone, href: "/monitoring", roles: ["admin", "manager", "user"] },
    { label: "Control Remoto", icon: Zap, href: "/remote-control", roles: ["admin", "manager", "user"] },
    { label: "Análisis y Métricas", icon: Activity, href: "/analytics", roles: ["admin", "manager", "user"] },
    { label: "Notificaciones", icon: Bell, href: "/notifications", roles: ["admin", "manager", "user", "viewer"] },
    { label: "Monitoreo Avanzado", icon: Activity, href: "/advanced-monitoring", roles: ["admin", "manager", "user"] },
    { label: "Permisos Granulares", icon: Shield, href: "/permissions-management", roles: ["admin"] },
    { label: "Explorador de Archivos", icon: Folder, href: "/file-explorer", roles: ["admin", "manager", "user"] },
    { label: "Gestor de Aplicaciones", icon: Package, href: "/app-manager", roles: ["admin", "manager", "user"] },
    { label: "Mapa de Dispositivos", icon: Map, href: "/device-map", roles: ["admin", "manager", "user"] },
    { label: "GPS y Geocercas", icon: Navigation, href: "/gps-tracker", roles: ["admin", "manager", "user"] },
    { label: "Compliance & DLP", icon: ShieldCheck, href: "/compliance", roles: ["admin", "manager"] },
    { label: "Captura Remota", icon: Camera, href: "/media-capture", roles: ["admin", "manager", "user"] },
    { label: "Comunicaciones MDM", icon: MessageSquare, href: "/communications", roles: ["admin", "manager", "user"] },
    { label: "Configuración", icon: Settings, href: "/settings", roles: ["admin", "manager", "user", "viewer"] },
    { label: "Mi Perfil", icon: Users, href: "/profile", roles: ["admin", "manager", "user", "viewer"] },
  ];

  const visibleItems = navigationItems.filter((item: any) => {
    if (user?.role === "admin") return true;
    return item.roles.includes(user?.role || "viewer");
  });

  return (
    <div className="flex h-screen bg-white dark:bg-black text-slate-900 dark:text-white font-sans overflow-hidden relative transition-colors duration-300">
      <div className="hidden dark:block cyber-scanline pointer-events-none" />
      <div className="hidden dark:block absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.05),transparent_70%)] pointer-events-none" />

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0 lg:w-24"
        } glass-panel border-r border-slate-200 dark:border-cyan-500/10 bg-white dark:bg-black/60 transition-all duration-300 fixed lg:static inset-y-0 left-0 z-40 flex flex-col overflow-hidden shadow-sm dark:shadow-[20px_0_50px_rgba(0,0,0,0.5)]`}
      >
        <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />

        {/* Logo */}
        <div className="p-6 lg:p-8 flex items-center justify-between border-b border-cyan-500/5">
          {(sidebarOpen || !isMobile) && (
            <div className="flex items-center gap-3 group">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-cyan-500/5 border border-slate-200 dark:border-cyan-500/20 group-hover:rotate-12 transition-transform duration-500">
                <Smartphone className="w-6 h-6 lg:w-8 lg:h-8 text-primary dark:text-cyan-400" />
              </div>
              {sidebarOpen && (
                <div className="flex flex-col">
                  <span className="font-black text-xl lg:text-2xl tracking-tighter uppercase gradient-text italic">ADM_OS</span>
                  <span className="text-[8px] font-black uppercase tracking-[0.4em] text-cyan-500/50 -mt-1 italic">PLATINUM_V4</span>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-3 glass-panel border-cyan-500/20 rounded-xl hover:text-cyan-400 hover:border-cyan-400/50 transition-all duration-300 group"
          >
            {sidebarOpen ? <X className="w-5 h-5 group-hover:rotate-90 transition-transform" /> : <Menu className="w-5 h-5 group-hover:scale-110 transition-transform" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 lg:p-6 space-y-2 lg:space-y-3 overflow-y-auto custom-scrollbar">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`w-full flex items-center gap-4 px-4 lg:px-6 py-3 lg:py-4 transition-all duration-300 relative group overflow-hidden rounded-xl ${
                  isActive
                    ? "text-primary dark:text-cyan-400 bg-slate-100 dark:bg-cyan-500/10"
                    : "text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-50 dark:hover:bg-cyan-500/5"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 h-full w-1 bg-primary dark:bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                )}
                <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                {(sidebarOpen) && (
                  <span className="text-[10px] font-black uppercase tracking-widest italic truncate">{item.label}</span>
                )}
                {!sidebarOpen && !isMobile && (
                   <div className="absolute left-20 bg-black/90 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                   </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 lg:p-6 border-t border-slate-100 dark:border-cyan-500/5 space-y-4">
          {sidebarOpen && (
            <div className="glass-panel border-slate-100 dark:border-cyan-500/10 p-4 group hover:border-slate-200 dark:hover:border-cyan-500/30 transition-all duration-500 bg-slate-50 dark:bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center">
                  <span className="text-cyan-400 font-black text-sm italic">{user?.name?.[0]?.toUpperCase() || "U"}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-[10px] font-black text-slate-800 dark:text-white truncate uppercase tracking-tight italic">{user?.name || "SYS_OPERATOR"}</p>
                  <p className="text-[8px] font-black text-cyan-500/60 uppercase tracking-widest">{user?.role}</p>
                </div>
              </div>
            </div>
          )}
          <Button
            onClick={logout}
            variant="ghost"
            className={`w-full h-12 lg:h-14 justify-start glass-panel border-rose-500/10 hover:border-rose-500/40 hover:bg-rose-500/5 text-rose-500 font-black uppercase tracking-widest text-[9px] italic transition-all duration-500 ${!sidebarOpen && "justify-center"}`}
          >
            <LogOut className={`w-5 h-5 ${sidebarOpen && "mr-3"}`} />
            {sidebarOpen && "SALIR"}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative z-10 bg-slate-50 dark:bg-black/20">
        {/* Top Bar */}
        <header className="glass-panel border-b border-slate-200 dark:border-cyan-500/5 sticky top-0 z-40 bg-white dark:bg-black/40">
          <div className="px-6 lg:px-10 py-4 lg:py-6 flex items-center justify-between">
            <div className="flex items-center gap-4 lg:gap-6">
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 text-slate-500 dark:text-cyan-400 lg:hidden"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
              <div className="hidden sm:block w-1 h-6 lg:h-8 bg-gradient-to-b from-cyan-400 to-transparent" />
              <h1 className="text-xl lg:text-3xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter truncate">
                {title || "dashboard_root"}
              </h1>
            </div>
            
            <div className="flex items-center gap-3 lg:gap-6">
              <div className="hidden md:flex flex-col items-end">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
                  <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.3em] italic">System_Live</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl glass-panel border-cyan-500/10 text-cyan-500 hover:bg-cyan-500/5"
                  onClick={() => toggleTheme?.()}
                >
                  {theme === "dark" ? <Sun className="w-4 h-4 lg:w-5 lg:h-5" /> : <Moon className="w-4 h-4 lg:w-5 lg:h-5" />}
                </Button>
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl glass-panel border-cyan-500/10 flex items-center justify-center text-cyan-500">
                  <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto custom-scrollbar p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
