import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
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
  Activity,
  TrendingUp,
  Smartphone,
  Zap,
  Battery,
  Clock,
  Download,
} from "lucide-react";
import { toast } from "sonner";

export default function Analytics() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<"7d" | "30d">("7d");

  // Fetch dashboard data
  const dashboardQuery = trpc.analytics.getDashboard.useQuery();
  const last7DaysQuery = trpc.analytics.getLast7Days.useQuery();
  const last30DaysQuery = trpc.analytics.getLast30Days.useQuery();

  const activityData = dateRange === "7d" ? last7DaysQuery.data : last30DaysQuery.data;

  const COLORS = ["#00D9FF", "#FF00FF", "#FF6B6B", "#4ECDC4"];
  const STATUS_COLORS = {
    online: "#00D9FF",
    offline: "#FF6B6B",
    inactive: "#FFB800",
  };

  const handleExportStats = () => {
    if (!dashboardQuery.data) return;

    const csvContent = [
      ["Estadísticas del Sistema"],
      ["Fecha", new Date().toISOString()],
      [],
      ["Dispositivos Totales", dashboardQuery.data.systemStats.totalDevices],
      ["Dispositivos Activos", dashboardQuery.data.systemStats.activeDevices],
      ["Comandos Totales", dashboardQuery.data.systemStats.totalCommands],
      ["Tasa de Éxito", `${dashboardQuery.data.systemStats.successRate.toFixed(2)}%`],
      [],
      ["Estado de Dispositivos"],
      ["Online", dashboardQuery.data.deviceStatusStats.online],
      ["Offline", dashboardQuery.data.deviceStatusStats.offline],
      ["Inactivo", dashboardQuery.data.deviceStatusStats.inactive],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Estadísticas exportadas correctamente");
  };

  if (dashboardQuery.isLoading) {
    return (
      <DashboardLayout title="Estadísticas Avanzadas">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-glow-cyan"></div>
        </div>
      </DashboardLayout>
    );
  }

  const dashboard = dashboardQuery.data;
  if (!dashboard) {
    return (
      <DashboardLayout title="Estadísticas Avanzadas">
        <div className="text-center text-muted-foreground">
          No hay datos disponibles
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Estadísticas Avanzadas">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="card-neon-cyan p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dispositivos Totales</p>
                <p className="text-3xl font-bold text-glow-cyan">
                  {dashboard.systemStats.totalDevices}
                </p>
              </div>
              <Smartphone className="w-10 h-10 text-glow-cyan opacity-50" />
            </div>
          </Card>

          <Card className="card-neon-purple p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dispositivos Activos</p>
                <p className="text-3xl font-bold text-glow-purple">
                  {dashboard.systemStats.activeDevices}
                </p>
              </div>
              <Activity className="w-10 h-10 text-glow-purple opacity-50" />
            </div>
          </Card>

          <Card className="card-neon-magenta p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comandos Totales</p>
                <p className="text-3xl font-bold text-glow-magenta">
                  {dashboard.systemStats.totalCommands}
                </p>
              </div>
              <Zap className="w-10 h-10 text-glow-magenta opacity-50" />
            </div>
          </Card>

          <Card className="card-neon-cyan p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa de Éxito</p>
                <p className="text-3xl font-bold text-glow-cyan">
                  {dashboard.systemStats.successRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-glow-cyan opacity-50" />
            </div>
          </Card>
        </div>

        {/* Main Charts */}
        <Tabs defaultValue="activity" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="bg-card/50">
              <TabsTrigger value="activity">Actividad</TabsTrigger>
              <TabsTrigger value="status">Estado</TabsTrigger>
              <TabsTrigger value="battery">Batería</TabsTrigger>
              <TabsTrigger value="commands">Comandos</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button
                variant={dateRange === "7d" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("7d")}
                className="btn-neon"
              >
                7 Días
              </Button>
              <Button
                variant={dateRange === "30d" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("30d")}
                className="btn-neon"
              >
                30 Días
              </Button>
              <Button
                size="sm"
                onClick={handleExportStats}
                className="btn-neon"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card className="card-neon-cyan p-6">
              <h3 className="text-lg font-semibold mb-4 text-glow-cyan">
                Actividad - Últimos {dateRange === "7d" ? "7" : "30"} Días
              </h3>
              {activityData && activityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00D9FF20" />
                    <XAxis
                      dataKey="date"
                      stroke="#00D9FF"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#00D9FF" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d0d0d",
                        border: "1px solid #00D9FF",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="totalCommands"
                      stroke="#00D9FF"
                      strokeWidth={2}
                      dot={{ fill: "#00D9FF", r: 4 }}
                      name="Total de Comandos"
                    />
                    <Line
                      type="monotone"
                      dataKey="successfulCommands"
                      stroke="#00FF00"
                      strokeWidth={2}
                      dot={{ fill: "#00FF00", r: 4 }}
                      name="Exitosos"
                    />
                    <Line
                      type="monotone"
                      dataKey="activeDevices"
                      stroke="#FF00FF"
                      strokeWidth={2}
                      dot={{ fill: "#FF00FF", r: 4 }}
                      name="Dispositivos Activos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No hay datos disponibles
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="card-neon-purple p-6">
                <h3 className="text-lg font-semibold mb-4 text-glow-purple">
                  Estado de Dispositivos
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Online",
                          value: dashboard.deviceStatusStats.online,
                        },
                        {
                          name: "Offline",
                          value: dashboard.deviceStatusStats.offline,
                        },
                        {
                          name: "Inactivo",
                          value: dashboard.deviceStatusStats.inactive,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#00D9FF" />
                      <Cell fill="#FF6B6B" />
                      <Cell fill="#FFB800" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d0d0d",
                        border: "1px solid #FF00FF",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="card-neon-cyan p-6">
                <h3 className="text-lg font-semibold mb-4 text-glow-cyan">
                  Detalles de Estado
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-glow-cyan"></div>
                      Online
                    </span>
                    <span className="font-bold text-glow-cyan">
                      {dashboard.deviceStatusStats.online}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      Offline
                    </span>
                    <span className="font-bold text-red-500">
                      {dashboard.deviceStatusStats.offline}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      Inactivo
                    </span>
                    <span className="font-bold text-yellow-500">
                      {dashboard.deviceStatusStats.inactive}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Battery Tab */}
          <TabsContent value="battery">
            <Card className="card-neon-magenta p-6">
              <h3 className="text-lg font-semibold mb-4 text-glow-magenta">
                Nivel de Batería por Dispositivo
              </h3>
              {dashboard.batteryStats && dashboard.batteryStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dashboard.batteryStats.slice(0, 10)}
                    margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#FF00FF20" />
                    <XAxis
                      dataKey="deviceName"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      stroke="#FF00FF"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#FF00FF" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d0d0d",
                        border: "1px solid #FF00FF",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="currentBattery" fill="#FF00FF" name="Batería Actual" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No hay datos de batería disponibles
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Commands Tab */}
          <TabsContent value="commands">
            <Card className="card-neon-cyan p-6">
              <h3 className="text-lg font-semibold mb-4 text-glow-cyan">
                Comandos Más Ejecutados
              </h3>
              {dashboard.topCommands && dashboard.topCommands.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dashboard.topCommands}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#00D9FF20" />
                    <XAxis type="number" stroke="#00D9FF" style={{ fontSize: "12px" }} />
                    <YAxis
                      dataKey="commandType"
                      type="category"
                      stroke="#00D9FF"
                      style={{ fontSize: "11px" }}
                      width={190}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d0d0d",
                        border: "1px solid #00D9FF",
                        borderRadius: "8px",
                      }}
                      formatter={(value: any) => {
                        if (typeof value === "number" && value > 1) {
                          return `${value.toFixed(1)}%`;
                        }
                        return value;
                      }}
                    />
                    <Bar dataKey="count" fill="#00D9FF" name="Cantidad" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No hay datos de comandos disponibles
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Device Details Table */}
        <Card className="card-neon-purple p-6">
          <h3 className="text-lg font-semibold mb-4 text-glow-purple">
            Detalles de Dispositivos
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glow-purple">
                  <th className="text-left py-2 px-4 text-glow-purple">Dispositivo</th>
                  <th className="text-left py-2 px-4 text-glow-purple">Batería</th>
                  <th className="text-left py-2 px-4 text-glow-purple">Mín</th>
                  <th className="text-left py-2 px-4 text-glow-purple">Máx</th>
                  <th className="text-left py-2 px-4 text-glow-purple">Promedio</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.batteryStats.slice(0, 5).map((device) => (
                  <tr
                    key={device.deviceId}
                    className="border-b border-glow-purple/20 hover:bg-accent/10 transition"
                  >
                    <td className="py-2 px-4">{device.deviceName}</td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <Battery className="w-4 h-4 text-glow-cyan" />
                        <span className="font-semibold">{device.currentBattery}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-muted-foreground">
                      {device.minBattery}%
                    </td>
                    <td className="py-2 px-4 text-muted-foreground">
                      {device.maxBattery}%
                    </td>
                    <td className="py-2 px-4">{device.averageBattery}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
