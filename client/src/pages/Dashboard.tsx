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

// Sample data for charts
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
  { name: "Online", value: 8, color: "#4ade80" },
  { name: "Offline", value: 5, color: "#ef4444" },
  { name: "Inactive", value: 2, color: "#eab308" },
];

const activityData = [
  { date: "Mon", logins: 12, actions: 45 },
  { date: "Tue", logins: 15, actions: 52 },
  { date: "Wed", logins: 10, actions: 38 },
  { date: "Thu", logins: 18, actions: 61 },
  { date: "Fri", logins: 20, actions: 72 },
  { date: "Sat", logins: 8, actions: 28 },
  { date: "Sun", logins: 5, actions: 15 },
];

const permissionData = [
  { name: "GPS_LOGGING", value: 15 },
  { name: "SMS_LOGS", value: 12 },
  { name: "CALL_LOGS", value: 10 },
  { name: "FILE_EXPLORER", value: 8 },
  { name: "CLIPBOARD_LOGGING", value: 7 },
  { name: "SCREEN_RECORDING", value: 5 },
];

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: overview } = trpc.dashboard.getOverview.useQuery();
  const { data: metrics } = trpc.dashboard.getMetrics.useQuery();

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const stats = [
    {
      label: "Total Devices",
      value: "15",
      icon: Smartphone,
      color: "glow-cyan",
      trend: "+2 this week",
    },
    {
      label: "Active Users",
      value: "8",
      icon: Users,
      color: "glow-purple",
      trend: "+1 today",
    },
    {
      label: "System Activity",
      value: "342",
      icon: Activity,
      color: "glow-cyan",
      trend: "+45 today",
    },
    {
      label: "Success Rate",
      value: "98.5%",
      icon: TrendingUp,
      color: "glow-purple",
      trend: "+0.3% this week",
    },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Last updated: {formatDistanceToNow(new Date(), { addSuffix: true })}
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            className="btn-neon-cyan"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className={idx % 2 === 0 ? "card-neon-cyan" : "card-neon"}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold gradient-text">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-2">{stat.trend}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color} opacity-50`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location Trend Chart */}
          <div className="card-neon">
            <h3 className="text-lg font-bold mb-4 glow-cyan">Device Activity Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={locationTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 85, 247, 0.2)" />
                <XAxis stroke="rgba(200, 100, 255, 0.5)" />
                <YAxis stroke="rgba(200, 100, 255, 0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 15, 35, 0.9)",
                    border: "2px solid rgba(168, 85, 247, 0.5)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="devices"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ fill: "#a855f7", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Device Status Pie Chart */}
          <div className="card-neon-cyan">
            <h3 className="text-lg font-bold mb-4 glow-cyan">Device Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 15, 35, 0.9)",
                    border: "2px solid rgba(34, 211, 238, 0.5)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Chart */}
          <div className="card-neon lg:col-span-2">
            <h3 className="text-lg font-bold mb-4 glow-cyan">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 85, 247, 0.2)" />
                <XAxis stroke="rgba(200, 100, 255, 0.5)" />
                <YAxis stroke="rgba(200, 100, 255, 0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 15, 35, 0.9)",
                    border: "2px solid rgba(168, 85, 247, 0.5)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="logins" stackId="a" fill="#a855f7" />
                <Bar dataKey="actions" stackId="a" fill="#22d3ee" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Permissions */}
          <div className="card-neon-cyan lg:col-span-2">
            <h3 className="text-lg font-bold mb-4 glow-cyan">Most Used Permissions</h3>
            <div className="space-y-2">
              {permissionData.map((perm, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{perm.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-accent/20 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
                        style={{ width: `${(perm.value / 15) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {perm.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-neon">
            <h3 className="text-lg font-bold mb-4 glow-purple">Quick Actions</h3>
            <div className="space-y-2">
              <Button className="btn-neon-cyan w-full justify-start">
                <Smartphone className="w-4 h-4 mr-2" />
                Register Device
              </Button>
              <Button className="btn-neon w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Add User
              </Button>
              <Button className="btn-neon-cyan w-full justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button className="btn-neon w-full justify-start">
                <AlertCircle className="w-4 h-4 mr-2" />
                View Alerts
              </Button>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="border-glow p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-4 glow-cyan">System Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="status-online animate-pulse"></div>
              <div>
                <p className="text-sm font-medium">API Server</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="status-online animate-pulse"></div>
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="status-online animate-pulse"></div>
              <div>
                <p className="text-sm font-medium">WebSocket</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="status-online animate-pulse"></div>
              <div>
                <p className="text-sm font-medium">Storage</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
