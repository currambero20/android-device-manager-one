import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AppWindowIcon,
  PlayIcon,
  StopCircleIcon,
  TrashIcon,
  DownloadIcon,
  SettingsIcon,
  Search,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

export default function AppManager() {
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSystemApps, setShowSystemApps] = useState(false);

  // Queries
  const { data: allDevices } = trpc.devices.getAll.useQuery() as any;
  const { data: installedApps, isLoading: isLoadingApps } = trpc.appManager.getInstalledApps.useQuery(
    {
      deviceId: selectedDevice || 0,
      filterSystemApps: !showSystemApps,
      searchQuery,
    },
    { enabled: !!selectedDevice }
  );
  const { data: appStats } = trpc.appManager.getAppStats.useQuery(
    { deviceId: selectedDevice || 0 },
    { enabled: !!selectedDevice }
  );

  // Mutations
  const launchAppMutation = trpc.appManager.launchApp.useMutation({
    onSuccess: () => {
      toast.success("Aplicación lanzada");
    },
    onError: () => {
      toast.error("Error al lanzar aplicación");
    },
  });

  const stopAppMutation = trpc.appManager.stopApp.useMutation({
    onSuccess: () => {
      toast.success("Aplicación detenida");
    },
    onError: () => {
      toast.error("Error al detener aplicación");
    },
  });

  const uninstallAppMutation = trpc.appManager.uninstallApp.useMutation({
    onSuccess: () => {
      toast.success("Aplicación desinstalada");
    },
    onError: () => {
      toast.error("Error al desinstalar aplicación");
    },
  });

  const clearCacheMutation = trpc.appManager.clearAppCache.useMutation({
    onSuccess: (data) => {
      toast.success(`Caché limpiado: ${formatFileSize(data.clearedSize)}`);
    },
    onError: () => {
      toast.error("Error al limpiar caché");
    },
  });

  // Filtered apps
  const filteredApps = useMemo(() => {
    if (!installedApps?.apps) return [];
    if (!searchQuery) return installedApps.apps;

    return installedApps.apps.filter(
      (app: any) =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [installedApps?.apps, searchQuery]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            Gestor de Aplicaciones
          </h1>
          <p className="text-gray-400 mt-2">Gestiona aplicaciones instaladas en dispositivos</p>
        </div>
        <AppWindowIcon className="w-12 h-12 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Selección de Dispositivo */}
        <Card className="lg:col-span-1 bg-gray-900 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-lg">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedDevice?.toString() || ""} onValueChange={(val) => setSelectedDevice(Number(val))}>
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue placeholder="Selecciona dispositivo" />
              </SelectTrigger>
              <SelectContent>
                {allDevices?.map((device: any) => (
                  <SelectItem key={device.id} value={device.id.toString()}>
                    {device.deviceName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedDevice && appStats && (
              <div className="space-y-2 p-3 bg-gray-800 rounded-lg">
                <div className="text-sm font-medium">Estadísticas</div>
                <div className="space-y-1 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="text-cyan-400 font-medium">{appStats.totalApps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usuario:</span>
                    <span className="text-purple-400 font-medium">{appStats.userApps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sistema:</span>
                    <span className="text-gray-400 font-medium">{appStats.systemApps}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gestor de Aplicaciones */}
        {selectedDevice ? (
          <div className="lg:col-span-3 space-y-4">
            {/* Barra de Búsqueda */}
            <Card className="bg-gray-900 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-lg">Aplicaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Buscar aplicaciones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-gray-800 border-gray-700"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="systemApps"
                    checked={showSystemApps}
                    onChange={(e) => setShowSystemApps(e.target.checked)}
                    className="rounded border-gray-700"
                  />
                  <label htmlFor="systemApps" className="text-sm text-gray-400 cursor-pointer">
                    Mostrar aplicaciones del sistema
                  </label>
                </div>

                <div className="text-xs text-gray-400">
                  {filteredApps.length} de {installedApps?.total} aplicaciones
                  {isLoadingApps && <Loader2 className="w-3 h-3 animate-spin ml-2 inline" />}
                </div>
              </CardContent>
            </Card>

            {/* Lista de Aplicaciones */}
            <Card className="bg-gray-900 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-cyan-400" />
                  Aplicaciones Instaladas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 border border-gray-700 rounded-lg p-3">
                  <div className="space-y-2">
                    {filteredApps.map((app: any) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-all group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{app.name}</div>
                          <div className="text-xs text-gray-400 truncate">{app.packageName}</div>
                          <div className="flex gap-2 mt-1">
                            {app.version && (
                              <Badge variant="outline" className="text-xs">
                                v{app.version}
                              </Badge>
                            )}
                            {app.isSystemApp && (
                              <Badge variant="outline" className="text-xs bg-gray-700">
                                Sistema
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            onClick={() =>
                              launchAppMutation.mutate({
                                deviceId: selectedDevice,
                                packageName: app.packageName,
                              })
                            }
                            variant="ghost"
                            size="sm"
                            className="text-green-400 hover:bg-green-400/20"
                            disabled={launchAppMutation.isPending}
                            title="Lanzar"
                          >
                            <PlayIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() =>
                              stopAppMutation.mutate({
                                deviceId: selectedDevice,
                                packageName: app.packageName,
                              })
                            }
                            variant="ghost"
                            size="sm"
                            className="text-yellow-400 hover:bg-yellow-400/20"
                            disabled={stopAppMutation.isPending}
                            title="Detener"
                          >
                            <StopCircleIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() =>
                              clearCacheMutation.mutate({
                                deviceId: selectedDevice,
                                packageName: app.packageName,
                              })
                            }
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:bg-blue-400/20"
                            disabled={clearCacheMutation.isPending}
                            title="Limpiar caché"
                          >
                            <SettingsIcon className="w-4 h-4" />
                          </Button>
                          {!app.isSystemApp && (
                            <Button
                              onClick={() =>
                                uninstallAppMutation.mutate({
                                  deviceId: selectedDevice,
                                  packageName: app.packageName,
                                })
                              }
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:bg-red-400/20"
                              disabled={uninstallAppMutation.isPending}
                              title="Desinstalar"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="lg:col-span-3 bg-gray-900 border-purple-500/30">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <AppWindowIcon className="w-12 h-12 text-gray-500 mb-4" />
                <p className="text-gray-400">Selecciona un dispositivo para gestionar aplicaciones</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
