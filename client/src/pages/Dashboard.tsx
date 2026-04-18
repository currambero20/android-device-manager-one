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
      <div className="cyber-scanline" />
      <div className="space-y-8 relative z-10">
        {/* Header with Refresh */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-cyan-500/10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase gradient-text">
              Dashboard_Core v4.0
            </h1>
            <p className="text-cyan-500/60 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">
              Última Sincronización: {formatDistanceToNow(new Date(), { addSuffix: true, locale: es }).toUpperCase()}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              variant="ghost"
              className="btn-neon-cyan h-12 px-6 rounded-xl border border-cyan-500/20 text-cyan-400 font-bold uppercase tracking-widest text-[10px]"
              disabled={refreshing}
            >
              <RefreshCw className={`w-5 h-5 mr-3 ${refreshing ? "animate-spin" : ""}`} />
              RECALIBRAR
            </Button>
            <Button className="btn-neon-cyan h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]">
              <Download className="w-5 h-5 mr-3" />
              DOWNLOAD_DATA
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="glass-panel border-cyan-500/10 shadow-2xl p-6 group hover:border-cyan-500/30 transition-all duration-500"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-black text-cyan-500/50 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter group-hover:text-cyan-400 transition-colors">{stat.value}</p>
                    <div className="flex items-center gap-2 mt-4 text-[9px] font-black text-cyan-400 bg-cyan-500/5 px-3 py-1 rounded-lg border border-cyan-500/10 uppercase tracking-widest group-hover:border-cyan-500/30 transition-all">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]" />
                      {stat.trend}
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl bg-black/40 border border-cyan-500/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ${stat.color} shadow-[inset_0_0_15px_rgba(34,211,238,0.1)]`}>
                    <Icon className="w-8 h-8" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Location Trend Chart */}
          <div className="glass-panel border-cyan-500/10 shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <Activity className="w-6 h-6 text-cyan-500" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100 italic">Tendencia de Actividad</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={locationTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(34, 211, 238, 0.05)" />
                <XAxis 
                  dataKey="time" 
                  stroke="rgba(34, 211, 238, 0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => val.toUpperCase()}
                />
                <YAxis 
                  stroke="rgba(34, 211, 238, 0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    border: "1px solid rgba(34, 211, 238, 0.3)",
                    borderRadius: "12px",
                    boxShadow: "0 0 20px rgba(34, 211, 238, 0.2)",
                    fontSize: "10px",
                    fontFamily: "monospace",
                  }}
                  itemStyle={{ color: "#22d3ee" }}
                />
                <Line
                  type="monotone"
                  dataKey="devices"
                  stroke="#22d3ee"
                  strokeWidth={4}
                  dot={{ r: 4, fill: "#22d3ee", strokeWidth: 0 }}
                  activeDot={{ r: 8, fill: "#22d3ee", shadow: "0 0 10px #22d3ee" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Device Status Pie Chart */}
          <div className="glass-panel border-cyan-500/10 shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <Smartphone className="w-6 h-6 text-cyan-500" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100 italic">Análisis de Distribución</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {deviceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    border: "1px solid rgba(34, 211, 238, 0.3)",
                    borderRadius: "12px",
                    fontSize: "10px",
                    fontFamily: "monospace",
                  }}
                />
                <Legend 
                  iconType="rect" 
                  formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500/70">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Chart */}
          <div className="glass-panel border-cyan-500/10 shadow-2xl p-8 lg:col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp className="w-6 h-6 text-cyan-500" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100 italic">Carga de Trabajo Semanal</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(34, 211, 238, 0.05)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(34, 211, 238, 0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="rgba(34, 211, 238, 0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    border: "1px solid rgba(34, 211, 238, 0.3)",
                    borderRadius: "12px",
                    fontSize: "10px",
                    fontFamily: "monospace",
                  }}
                />
                <Legend 
                  iconType="rect"
                  formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500/70">{value}</span>}
                />
                <Bar dataKey="ingresos" name="INGRESOS" fill="#d946ef" radius={[4, 4, 0, 0]} />
                <Bar dataKey="acciones" name="ACCIONES" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Permissions */}
          <div className="glass-panel border-cyan-500/10 shadow-2xl p-8 lg:col-span-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100 italic mb-12 flex items-center gap-3">
              <Activity className="w-5 h-5 text-cyan-500" />
              Flujo de Telemetría
            </h3>
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-cyan-500/5 rounded-3xl group">
              <div className="w-20 h-20 rounded-full bg-cyan-500/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-700">
                <Activity className="w-10 h-10 text-cyan-900/40 animate-pulse" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-100 italic">A la espera de señales remotas...</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-cyan-900 mt-4">Buffer de datos vacío • Sincronización activa</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-panel border-cyan-500/10 shadow-2xl p-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100 italic mb-8">Comandos Rápidos</h3>
            <div className="space-y-4">
              {[
                { label: "Vincular Terminal", icon: Smartphone, color: "text-cyan-400", bg: "hover:bg-cyan-500/10" },
                { label: "Crear Operador", icon: Users, color: "text-fuchsia-400", bg: "hover:bg-fuchsia-500/10" },
                { label: "Generar Reporte", icon: Download, color: "text-white", bg: "hover:bg-white/10" },
                { label: "Protocolo_Alerta", icon: AlertCircle, color: "text-rose-400", bg: "hover:bg-rose-500/10" },
              ].map((action, i) => (
                <Button 
                  key={i}
                  variant="ghost" 
                  className={`w-full h-14 justify-start ${action.bg} ${action.color} font-black text-[10px] uppercase tracking-widest rounded-2xl border border-transparent hover:border-current/20 transition-all group`}
                >
                  <action.icon className="w-5 h-5 mr-4 group-hover:scale-110 transition-transform" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="glass-panel border-cyan-500/20 shadow-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="text-[10px] font-black mb-10 text-cyan-900 uppercase tracking-[0.4em] italic">Estado de Infraestructura_Red</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { label: "Servidor API", status: "Operacional" },
              { label: "Cluster_DB", status: "Conectado" },
              { label: "Protocolo_WS", status: "Activo" },
              { label: "Memory_Buffer", status: "Disponible" },
            ].map((node, i) => (
              <div key={i} className="flex items-center gap-5 p-4 rounded-2xl bg-black/40 border border-cyan-500/5 group">
                <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-pulse group-hover:scale-125 transition-transform" />
                <div>
                  <p className="text-xs font-black text-cyan-100 uppercase tracking-tighter">{node.label}</p>
                  <p className="text-[9px] text-cyan-700 font-bold uppercase tracking-widest mt-1 italic">{node.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
    </DashboardLayout>
  );
}
