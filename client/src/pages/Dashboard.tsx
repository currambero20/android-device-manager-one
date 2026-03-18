// @ts-nocheck
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Smartphone,
  Users,
  Activity,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const utils = trpc.useUtils();

  // Real data fetching
  const { data: overview, isLoading: loadingOverview } = trpc.dashboard.getOverview.useQuery(undefined, {
    refetchInterval: 30000, 
  });
  const { data: metrics = [], isLoading: loadingMetrics } = trpc.dashboard.getMetrics.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      utils.dashboard.getOverview.invalidate(),
      utils.dashboard.getMetrics.invalidate(),
    ]);
    setRefreshing(false);
    toast.success("Datos sincronizados");
  };

  const chartScale = Math.max(...metrics.map(d => d.activeDevices || 0), 10);

  const stats = [
    {
      label: "Dispositivos Totales",
      value: overview?.totalDevices?.toString() || "0",
      icon: Smartphone,
      color: "text-cyan-600",
      trend: `${overview?.activeDevices || 0} activos ahora`,
    },
    {
      label: "Usuarios en Sistema",
      value: overview?.totalUsers?.toString() || overview?.totalDevices?.toString() || "0",
      icon: Users,
      color: "text-violet-600",
      trend: "Registrados",
    },
    {
      label: "Comandos Ejecutados",
      value: overview?.totalCommands?.toString() || "0",
      icon: Activity,
      color: "text-cyan-600",
      trend: "Total histórico",
    },
    {
      label: "Tasa de Éxito",
      value: overview?.successRate ? `${overview.successRate.toFixed(1)}%` : "0%",
      icon: TrendingUp,
      color: "text-violet-600",
      trend: "Estabilidad global",
    },
  ];

  const deviceStatusData = [
    { name: "En Línea", value: overview?.deviceStatus?.online || 0, color: "#06b6d4" },
    { name: "Desconectado", value: overview?.deviceStatus?.offline || 0, color: "#94a3b8" },
    { name: "Inactivo", value: overview?.deviceStatus?.inactive || 0, color: "#f59e0b" },
  ];

  const activityData = metrics.map(m => ({
    date: m.date,
    ingresos: m.activeDevices,
    acciones: m.totalCommands,
  }));

  const locationTrendData = metrics.map(m => ({
    time: m.date,
    devices: m.activeDevices,
  }));

  return (
    <DashboardLayout title="Panel de Control">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header with Refresh */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Vista General</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Última actualización: {formatDistanceToNow(new Date(), { addSuffix: true, locale: es })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="rounded-full border-slate-200 text-slate-600"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
            <Button className="rounded-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20">
              <Download className="w-4 h-4 mr-2" />
              Reporte
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl border border-accent/20 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-slate-800">{stat.value}</p>
                    <p className="text-[10px] font-bold text-emerald-500 mt-2 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                      {stat.trend}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl bg-slate-50 ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location Trend Chart */}
          <div className="bg-white p-6 rounded-2xl border border-accent/20 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-slate-800">Tendencia de Actividad</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={locationTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="devices"
                  stroke="#0891b2"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: "#0891b2" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Device Status Pie Chart */}
          <div className="bg-white p-6 rounded-2xl border border-accent/20 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-slate-800">Estado de Dispositivos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Chart */}
          <div className="bg-white p-6 rounded-2xl border border-accent/20 shadow-sm lg:col-span-2">
            <h3 className="text-lg font-bold mb-6 text-slate-800">Actividad Semanal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="ingresos" name="Ingresos" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="acciones" name="Acciones" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Permissions */}
          <div className="bg-white p-6 rounded-2xl border border-accent/20 shadow-sm lg:col-span-2">
            <h3 className="text-lg font-bold mb-6 text-slate-800">Uso del Sistema</h3>
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Activity className="w-12 h-12 mb-4 opacity-20" />
              <p>Esperando telemetría de dispositivos...</p>
              <p className="text-xs">Los datos aparecerán aquí automáticamente al detectar actividad real.</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-2xl border border-accent/20 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-slate-800">Acciones Rápidas</h3>
            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-start hover:bg-cyan-50 text-cyan-700 font-medium">
                <Smartphone className="w-4 h-4 mr-3" />
                Registrar Dispositivo
              </Button>
              <Button variant="ghost" className="w-full justify-start hover:bg-violet-50 text-violet-700 font-medium">
                <Users className="w-4 h-4 mr-3" />
                Añadir Usuario
              </Button>
              <Button variant="ghost" className="w-full justify-start hover:bg-slate-50 text-slate-700 font-medium">
                <Download className="w-4 h-4 mr-3" />
                Exportar Reporte Semanal
              </Button>
              <Button variant="ghost" className="w-full justify-start hover:bg-rose-50 text-rose-700 font-medium">
                <AlertCircle className="w-4 h-4 mr-3" />
                Ver Alertas Críticas
              </Button>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
          <h3 className="text-sm font-bold mb-6 text-slate-400 uppercase tracking-widest">Salud del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse"></div>
              <div>
                <p className="text-sm font-bold text-slate-700">Servidor API</p>
                <p className="text-xs text-slate-400 font-medium">Operacional</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse"></div>
              <div>
                <p className="text-sm font-bold text-slate-700">Base de Datos</p>
                <p className="text-xs text-slate-400 font-medium">Conectado</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse"></div>
              <div>
                <p className="text-sm font-bold text-slate-700">WebSocket</p>
                <p className="text-xs text-slate-400 font-medium">Activo</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse"></div>
              <div>
                <p className="text-sm font-bold text-slate-700">Almacenamiento</p>
                <p className="text-xs text-slate-400 font-medium">Disponible</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
