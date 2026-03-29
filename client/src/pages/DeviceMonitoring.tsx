// @ts-nocheck
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  MapPin,
  MessageSquare,
  Smartphone,
  Activity,
  Signal,
  Battery,
  Search,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useWebSocket, type DeviceLocation, type SMSMessage } from "@/hooks/useWebSocket";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function DeviceMonitoring() {
  const { user } = useAuth();
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMap, setShowMap] = useState(true);

  // tRPC Queries
  const { data: devices = [], isLoading: devicesLoading } = trpc.devices.getAll.useQuery();

  const { isConnected, getLocation, getSmsMessages, joinDevice, leaveDevice } =
    useWebSocket();

  // Auto-select first device
  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  // Join/leave device on selection
  useEffect(() => {
    if (selectedDeviceId) {
      joinDevice(selectedDeviceId);
      return () => {
        leaveDevice(selectedDeviceId);
      };
    }
  }, [selectedDeviceId, joinDevice, leaveDevice]);

  const selectedDevice = devices.find((d: any) => d.id === selectedDeviceId);
  const currentLocation = selectedDeviceId ? getLocation(selectedDeviceId) : undefined;
  const smsMessages = selectedDeviceId ? getSmsMessages(selectedDeviceId) : [];

  const filteredDevices = devices.filter(
    (device: any) =>
      device.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.phoneNumber && device.phoneNumber.includes(searchTerm))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-emerald-600 bg-emerald-50 border-emerald-100";
      case "offline":
        return "text-rose-600 bg-rose-50 border-rose-100";
      default:
        return "text-amber-600 bg-amber-50 border-amber-100";
    }
  };

  const getSignalBars = (strength: number) => {
    return "▁".repeat(strength || 0) + "▔".repeat(Math.max(0, 5 - (strength || 0)));
  };

  return (
    <DashboardLayout title="Monitoreo de Dispositivos">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header con Estado de Conexión */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-accent/20 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Panel de Monitoreo</h1>
            <p className="text-muted-foreground italic">Supervisión en tiempo real de ubicación y mensajes</p>
          </div>
          
          <div className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all ${
            isConnected ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
          }`}>
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="text-sm font-semibold">
              Servidor: <span className="uppercase">{isConnected ? "Conectado" : "Desconectado"}</span>
            </span>
            {isConnected && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Device List (Sidebar-like on large screens) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white border border-accent/20 rounded-2xl p-5 shadow-sm overflow-hidden flex flex-col h-[700px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-cyan-500" />
                  Dispositivos ({devices.length})
                </h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200 focus:border-cyan-400 focus:ring-cyan-400/20"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {devicesLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2 opacity-20" />
                    <p className="text-sm">Cargando dispositivos...</p>
                  </div>
                ) : filteredDevices.length > 0 ? (
                  filteredDevices.map((device: any) => (
                    <button
                      key={device.id}
                      onClick={() => setSelectedDeviceId(device.id)}
                      className={`w-full group p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                        selectedDeviceId === device.id
                          ? "border-cyan-500 bg-cyan-50/50 shadow-md shadow-cyan-500/5"
                          : "border-slate-100 bg-slate-50/30 hover:border-slate-200 hover:bg-white"
                      }`}
                    >
                      {selectedDeviceId === device.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />
                      )}
                      
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm ${selectedDeviceId === device.id ? "text-cyan-700" : "text-slate-700"}`}>
                            {device.deviceName}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">
                            {device.model || "Modelo Desconocido"}
                          </span>
                        </div>
                        <div className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${getStatusColor(device.status)}`}>
                          {device.status === 'online' ? 'En línea' : 'Desconectado'}
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-500 mb-3 font-mono">{device.phoneNumber || "S/N"}</p>
                      
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Battery className={`w-3.5 h-3.5 ${device.batteryLevel < 20 ? "text-rose-500" : "text-emerald-500"}`} />
                          <span>{device.batteryLevel}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Signal className="w-3.5 h-3.5 text-blue-500" />
                          <span>{getSignalBars(device.signalStrength)}</span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Smartphone className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No se encontraron dispositivos</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Monitoring Detail Area */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {selectedDevice ? (
              <>
                {/* Active Device Quick Stats */}
                <div className="bg-white border border-cyan-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
                   
                   <div className="flex flex-wrap items-center justify-between gap-4 relative z-10 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-600 shadow-inner">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">{selectedDevice.deviceName}</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-widest font-semibold">
                          <span className="text-cyan-600">{selectedDevice.model || "Premium"}</span>
                          <span>•</span>
                          <span>{selectedDevice.phoneNumber || "Sin número"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => window.location.reload()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualizar
                      </Button>
                      <Button size="sm" className="rounded-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20" onClick={() => toast("Reporte PDF", { description: "La generación de reportes avanzados estará disponible en la próxima actualización." })}>
                        <Download className="w-4 h-4 mr-2" />
                        Reporte
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                    {[
                      { label: "Batería", value: `${selectedDevice.batteryLevel}%`, icon: Battery, color: "text-emerald-500", bg: "bg-emerald-50" },
                      { label: "Nivel de Señal", value: getSignalBars(selectedDevice.signalStrength), icon: Signal, color: "text-blue-500", bg: "bg-blue-50" },
                      { label: "Estado del Sistema", value: selectedDevice.status === "online" ? "Activo" : "Inactivo", icon: Activity, color: "text-violet-500", bg: "bg-violet-50" },
                      { label: "Última Actividad", value: currentLocation ? formatDistanceToNow(new Date(currentLocation.timestamp), { addSuffix: true, locale: es }) : "Hace instantes", icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
                    ].map((stat, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                            <stat.icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <p className="text-sm font-black text-slate-700">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking Tabs */}
                <Tabs defaultValue="gps" className="w-full">
                  <TabsList className="flex gap-2 bg-transparent h-auto p-0 mb-4">
                    <TabsTrigger value="gps" className="flex-1 py-3 rounded-xl border border-slate-200 bg-white data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:border-cyan-600 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-600/20 transition-all font-bold">
                      <MapPin className="w-4 h-4 mr-2" />
                      Rastreo GPS
                    </TabsTrigger>
                    <TabsTrigger value="sms" className="flex-1 py-3 rounded-xl border border-slate-200 bg-white data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-600/20 transition-all font-bold">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Bandeja SMS ({smsMessages.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* GPS View */}
                  <TabsContent value="gps" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-0 outline-none">
                    {currentLocation ? (
                      <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 md:grid-cols-3 gap-6">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Latitud</p>
                            <p className="text-sm font-mono font-bold text-slate-700">{currentLocation.latitude.toFixed(6)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Longitud</p>
                            <p className="text-sm font-mono font-bold text-slate-700">{currentLocation.longitude.toFixed(6)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Precisión</p>
                            <div className="flex items-center gap-1.5 capitalize font-bold text-slate-700 text-sm">
                              <div className="w-2 h-2 rounded-full bg-cyan-500" />
                              ± {currentLocation.accuracy.toFixed(1)}m
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-700 flex items-center gap-2">
                             <Activity className="w-4 h-4 text-cyan-500" />
                             Mapa de Ubicación
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowMap(!showMap)}
                            className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 font-bold text-xs"
                          >
                            {showMap ? <><EyeOff className="w-4 h-4 mr-2" /> Ocultar Mapa</> : <><Eye className="w-4 h-4 mr-2" /> Mostrar Mapa</>}
                          </Button>
                        </div>

                        {showMap && (
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 rounded-2xl pointer-events-none z-10" />
                            <div className="w-full h-80 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-slate-300">
                              <div className="text-center relative z-20">
                                <MapPin className="w-16 h-16 text-cyan-500/30 mx-auto mb-4 animate-bounce" />
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Visualización de Mapa</p>
                                <p className="text-slate-400 text-[10px] mt-2 font-mono">
                                  COORDS: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center mt-4 px-2">
                              <div className="flex items-center gap-4">
                                {currentLocation.speed !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 px-2 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                                       Velocidad: {Math.round(currentLocation.speed * 3.6)} km/h
                                    </div>
                                  </div>
                                )}
                                {currentLocation.bearing !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 px-2 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase">
                                       Rumbo: {Math.round(currentLocation.bearing)}°
                                    </div>
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground italic">Sincronizado vía WebSocket</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <MapPin className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h4 className="text-lg font-bold text-slate-400">Sin Ubicación</h4>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">No hemos recibido coordenadas recientes de este dispositivo.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* SMS View */}
                  <TabsContent value="sms" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-0 outline-none">
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="font-bold text-slate-700 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                          Historial de SMS
                       </h4>
                       <div className="flex items-center gap-2">
                         <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Entrante</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Saliente</span>
                         </div>
                       </div>
                    </div>

                    {smsMessages.length > 0 ? (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {smsMessages.map((sms: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl border transition-all hover:shadow-sm ${
                              sms.direction === "incoming"
                                ? "border-emerald-100 bg-emerald-50/30 ml-0 mr-12"
                                : "border-blue-100 bg-blue-50/30 ml-12 mr-0"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                sms.direction === "incoming" 
                                  ? "bg-emerald-100 border-emerald-200 text-emerald-700" 
                                  : "bg-blue-100 border-blue-200 text-blue-700"
                              }`}>
                                {sms.phoneNumber}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {formatDistanceToNow(new Date(sms.timestamp), { addSuffix: true, locale: es })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">{sms.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h4 className="text-lg font-bold text-slate-400">Bandeja Vacía</h4>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">No se han registrado mensajes SMS recientemente.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-20 text-center flex flex-col items-center justify-center h-full shadow-sm">
                <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                   <Smartphone className="w-12 h-12 text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-slate-400">Seleccione un Dispositivo</h3>
                <p className="text-slate-400 text-sm mt-3 max-w-sm">
                  Elija un dispositivo de la lista lateral para comenzar el monitoreo en tiempo real de su ubicación y comunicaciones.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </DashboardLayout>
  );
}

// Stats icons mapping helper
const Clock = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
