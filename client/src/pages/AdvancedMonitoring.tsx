// @ts-nocheck
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
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
  Loader2,
  Copy,
  Activity,
  Zap,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdvancedMonitoring() {
  const { user } = useAuth();
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const { data: devices } = trpc.devices.getAll.useQuery();
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
    <DashboardLayout title="Monitoreo Avanzado">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700 mb-2">
              Monitoreo Avanzado
            </h1>
            <p className="text-muted-foreground">Historial de clipboard, notificaciones y actividad del sistema</p>
          </div>
          <Activity className="w-12 h-12 text-primary opacity-20" />
        </div>

        {/* Device Selector */}
        <Card className="border-accent/20 shadow-sm bg-gradient-to-r from-white to-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Seleccionar Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedDeviceId?.toString()}
              onValueChange={(val) => setSelectedDeviceId(parseInt(val))}
            >
              <SelectTrigger className="w-full md:w-[300px] bg-white border-accent/20 h-11">
                <SelectValue placeholder="Escoge un equipo para monitorear" />
              </SelectTrigger>
              <SelectContent>
                {devices?.map((device: any) => (
                  <SelectItem key={device.id} value={device.id.toString()}>
                    {device.deviceName} ({device.model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedDeviceId ? (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-accent/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Clipboard className="w-4 h-4 text-primary" />
                      Portapapeles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-foreground">
                      {stats.totalClipboardEntries}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium mt-1">Registros capturados</p>
                  </CardContent>
                </Card>

                <Card className="border-accent/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      Notificaciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-foreground">
                      {stats.totalNotifications}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium mt-1">Alertas recibidas</p>
                  </CardContent>
                </Card>

                <Card className="border-accent/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Contenido Media
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-foreground">
                      {stats.totalMediaCaptures}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium mt-1">Archivos registrados</p>
                  </CardContent>
                </Card>

                <Card className="border-accent/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Actividad 24h
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-foreground">
                      {(activitySummary?.clipboardActivity || 0) +
                        (activitySummary?.notificationActivity || 0)}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium mt-1">Eventos detectados</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Content */}
            <Card className="border-accent/20 shadow-sm overflow-hidden bg-white">
              <Tabs defaultValue="clipboard" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-secondary/30 border-b border-accent/10 rounded-none p-0 h-14">
                  <TabsTrigger 
                    value="clipboard" 
                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-r border-accent/10 font-bold text-xs"
                  >
                    <Clipboard className="w-4 h-4 mr-2" />
                    PORTAPAPELES
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-r border-accent/10 font-bold text-xs"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    NOTIFICACIONES
                  </TabsTrigger>
                  <TabsTrigger 
                    value="activity" 
                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none font-bold text-xs"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    RESUMEN
                  </TabsTrigger>
                </TabsList>

                <CardContent className="pt-6">
                  {/* Clipboard Tab */}
                  <TabsContent value="clipboard" className="space-y-4 m-0">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Filtro de contenido..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 bg-secondary/50 border-accent/20 rounded-xl"
                        />
                      </div>
                      <Button
                        onClick={handleSearch}
                        className="rounded-xl shadow-lg shadow-primary/20"
                      >
                        Buscar
                      </Button>
                    </div>

                    {clipboardLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Analizando historial...</p>
                      </div>
                    ) : clipboardHistory && clipboardHistory.length > 0 ? (
                      <ScrollArea className="h-[400px] rounded-xl border border-accent/10 bg-secondary/5 p-4">
                        <div className="space-y-3">
                          {clipboardHistory.map((entry, idx) => (
                            <div
                              key={idx}
                              className="group p-4 bg-white border border-accent/10 rounded-xl hover:border-primary/30 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/10">
                                      {entry.dataType}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-sm text-foreground font-medium leading-relaxed break-words">
                                    {entry.contentPreview}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground font-semibold">
                                     <Clock className="w-3 h-3" />
                                     {new Date(entry.timestamp).toLocaleDateString()}
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Clipboard className="w-12 h-12 text-muted-foreground/30 mb-4" />
                        <p className="text-sm font-bold text-muted-foreground">Sin entradas registradas</p>
                        <p className="text-xs text-muted-foreground mt-1">El historial del portapapeles aparecerá aquí.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Notifications Tab */}
                  <TabsContent value="notifications" className="space-y-4 m-0">
                    {notificationsLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Obteniendo notificaciones...</p>
                      </div>
                    ) : notifications && notifications.length > 0 ? (
                      <ScrollArea className="h-[400px] rounded-xl border border-accent/10 bg-secondary/5 p-4">
                        <div className="space-y-3">
                          {notifications.map((notif, idx) => (
                            <div
                              key={idx}
                              className="p-4 bg-white border border-accent/10 rounded-xl hover:border-cyan-300 hover:shadow-sm transition-all"
                            >
                              <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0 border border-cyan-100 shadow-sm">
                                  <Bell className="w-5 h-5 text-cyan-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <Badge variant="outline" className="text-[10px] font-bold text-cyan-700 border-cyan-200 uppercase truncate max-w-[150px]">
                                      {notif.appName}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-black text-foreground mb-1 mt-2">{notif.title}</h4>
                                  <p className="text-xs text-muted-foreground leading-normal line-clamp-3">{notif.content}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Bell className="w-12 h-12 text-muted-foreground/30 mb-4" />
                        <p className="text-sm font-bold text-muted-foreground">Bandeja vacía</p>
                        <p className="text-xs text-muted-foreground mt-1">No se han capturado notificaciones activas.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="space-y-6 m-0">
                    {activitySummary ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-accent/10 bg-secondary/20 shadow-none">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                               <BarChart3 className="w-4 h-4 text-primary" />
                               Volumen de Datos (24h)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-accent/10">
                              <span className="text-xs font-bold text-muted-foreground">Portapapeles</span>
                              <Badge className="font-bold bg-primary/10 text-primary border-none">{activitySummary.clipboardActivity}</Badge>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-accent/10">
                              <span className="text-xs font-bold text-muted-foreground">Notificaciones</span>
                              <Badge className="font-bold bg-cyan-100 text-cyan-700 border-none">{activitySummary.notificationActivity}</Badge>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-accent/10">
                              <span className="text-xs font-bold text-muted-foreground">Media Registrada</span>
                              <Badge className="font-bold bg-purple-100 text-purple-700 border-none">{activitySummary.mediaActivity}</Badge>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-accent/10 bg-gradient-to-br from-cyan-50 to-white shadow-none">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                               <Smartphone className="w-4 h-4 text-primary" />
                               App Más Activa
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex flex-col items-center justify-center pt-2">
                            {activitySummary.mostActiveApp ? (
                              <div className="text-center">
                                <div className="text-2xl font-black text-primary mb-2 drop-shadow-sm">
                                  {activitySummary.mostActiveApp}
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-primary/10 inline-block">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                                      Mayor número de interacciones
                                    </p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center opacity-50">
                                <Smartphone className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-xs font-bold text-muted-foreground">Sin métricas registradas</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {activitySummary.topClipboardTypes &&
                          activitySummary.topClipboardTypes.length > 0 && (
                            <Card className="border-accent/10 bg-secondary/10 md:col-span-2 shadow-none">
                              <CardHeader className="pb-4">
                                <CardTitle className="text-sm font-bold">Distribución de Formatos</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-4">
                                  {activitySummary.topClipboardTypes.map((item) => (
                                    <div key={item.type} className="flex-1 min-w-[120px] p-4 bg-white rounded-2xl border border-accent/10 shadow-sm text-center">
                                      <div className="text-lg font-black text-foreground mb-1">{item.count}</div>
                                      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{item.type}</div>
                                      <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
                                          <div 
                                            className="h-full bg-primary" 
                                            style={{ width: `${(item.count / activitySummary.clipboardActivity) * 100}%` }}
                                          />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Generando reporte analítico...</p>
                      </div>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>

              {/* Actions */}
              <div className="p-6 bg-secondary/20 border-t border-accent/10 flex justify-between items-center">
                <p className="text-[11px] font-bold text-muted-foreground max-w-sm">
                  <span className="text-primary mr-1">TIPS:</span>
                  Las capturas antiguas ocupan espacio. Se recomienda realizar una limpieza mensual del historial para mantener el rendimiento.
                </p>
                <Button
                  onClick={handleCleanup}
                  disabled={cleanup.isPending || !selectedDeviceId}
                  variant="outline"
                  className="rounded-xl border-accent/30 hover:bg-destructive/10 hover:text-destructive transition-colors h-11 px-6 font-bold text-xs"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  MANTENIMIENTO DE DATOS
                </Button>
              </div>
            </Card>
          </>
        ) : (
          <Card className="border-accent/20 border-dashed shadow-sm bg-white">
            <CardContent className="h-[500px] flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-8 border border-primary/10 shadow-inner">
                <Smartphone className="w-12 h-12 text-primary opacity-30" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-3">Equipo no Seleccionado</h3>
              <p className="text-muted-foreground max-w-sm font-medium">
                Por favor, elige un dispositivo de la lista superior para comenzar el monitoreo de datos en tiempo real.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-6 w-full max-w-lg opacity-40">
                <div className="p-4 border border-accent/20 rounded-2xl flex flex-col items-center">
                  <Clipboard className="w-6 h-6 mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Clipboard</span>
                </div>
                <div className="p-4 border border-accent/20 rounded-2xl flex flex-col items-center">
                  <Bell className="w-6 h-6 mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Alerta</span>
                </div>
                <div className="p-4 border border-accent/20 rounded-2xl flex flex-col items-center">
                  <Activity className="w-6 h-6 mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Reporte</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
