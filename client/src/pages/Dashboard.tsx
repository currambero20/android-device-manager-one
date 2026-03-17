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

// Datos de ejemplo para los gráficos
const locationTrendData = [
  { time: "00:00", devices: 2 },
  { time: "04:00", devices: 3 },
  { time: "08:00", devices: 5 },
  { time: "12:00", devices: 8 },
  { time: "16:00", devices: 6 },
  { time: "20:00", devices: 4 },
  { time: "23:59", devices: 3 },
];

const deviceStatusData = [
  { name: "En Línea", value: 8, color: "#06b6d4" },
  { name: "Desconectado", value: 5, color: "#94a3b8" },
  { name: "Inactivo", value: 2, color: "#f59e0b" },
];

const activityData = [
  { date: "Lun", ingresos: 12, acciones: 45 },
  { date: "Mar", ingresos: 15, acciones: 52 },
  { date: "Mie", ingresos: 10, acciones: 38 },
  { date: "Jue", ingresos: 18, acciones: 61 },
  { date: "Vie", ingresos: 20, acciones: 72 },
  { date: "Sab", ingresos: 8, acciones: 28 },
  { date: "Dom", ingresos: 5, acciones: 15 },
];

const permissionData = [
  { name: "REGISTRO_GPS", value: 15 },
  { name: "MENSAJES_SMS", value: 12 },
  { name: "LLAMADAS", value: 10 },
  { name: "ARCHIVOS", value: 8 },
  { name: "PORTAPAPELES", value: 7 },
  { name: "PANTALLA", value: 5 },
];

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);

  // In real implementation these would be used
  const { data: overview } = trpc.dashboard.getOverview.useQuery();
  const { data: metrics } = trpc.dashboard.getMetrics.useQuery();

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const stats = [
    {
      label: "Dispositivos Totales",
      value: "15",
      icon: Smartphone,
      color: "text-cyan-600",
      trend: "+2 esta semana",
    },
    {
      label: "Usuarios Activos",
      value: "8",
      icon: Users,
      color: "text-violet-600",
      trend: "+1 hoy",
    },
    {
      label: "Actividad del Sistema",
      value: "342",
      icon: Activity,
      color: "text-cyan-600",
      trend: "+45 hoy",
    },
    {
      label: "Tasa de Éxito",
      value: "98.5%",
      icon: TrendingUp,
      color: "text-violet-600",
      trend: "+0.3% esta semana",
    },
  ];

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
            <h3 className="text-lg font-bold mb-6 text-slate-800">Permisos más Utilizados</h3>
            <div className="space-y-4">
              {permissionData.map((perm, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600">{perm.name}</span>
                    <span className="text-slate-400 font-bold">{perm.value} usos</span>
                  </div>
                  <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                      style={{ width: `${(perm.value / 15) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
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
