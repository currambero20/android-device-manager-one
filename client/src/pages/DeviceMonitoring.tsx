// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MapView } from "@/components/Map";
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
  MapIcon,
} from "lucide-react";
import { useWebSocket, type DeviceLocation, type SMSMessage } from "@/hooks/useWebSocket";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import L from "leaflet";

export default function DeviceMonitoring() {
  const { user } = useAuth();
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMap, setShowMap] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  // tRPC Queries
  const { data: devices = [], isLoading: devicesLoading } = trpc.devices.getAll.useQuery();

  const { getLocation, getSms, joinDevice, leaveDevice, syncDevices, clearAll, isConnected } =
    useWebSocket();

  // Sync WebSocket data with current device list
  useEffect(() => {
    if (devices.length > 0) {
      const deviceIds = devices.map((d: any) => d.id);
      syncDevices(deviceIds);
    } else {
      clearAll();
    }
  }, [devices, syncDevices, clearAll]);

  // Auto-select first device
  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    } else if (devices.length === 0) {
      setSelectedDeviceId(null);
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
  const smsMessages = selectedDeviceId ? getSms(selectedDeviceId) : [];

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

  return    <DashboardLayout title="Monitoreo de Dispositivos">
      <div className="cyber-scanline" />
      <div className="space-y-8 relative z-10">
        {/* Header con Estado de Conexión */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-cyan-500/10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase gradient-text flex items-center gap-3">
              <Activity className="w-10 h-10 text-cyan-400" />
              Centro de Telemétrica
            </h1>
            <p className="text-cyan-500/60 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Vigilancia de Nodos en Tiempo Real</p>
          </div>
          
          <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border transition-all ${
            isConnected 
              ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]" 
              : "bg-rose-500/10 border-rose-500/40 text-rose-500"
          }`}>
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)] animate-pulse" : "bg-rose-500"}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Nivel_Enlace: {isConnected ? "ESTABLE" : "FUERA_DE_LINEA"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Device List */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="glass-panel border-cyan-500/20 shadow-2xl p-6 flex flex-col h-[750px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-cyan-100 flex items-center gap-3 uppercase text-xs tracking-widest italic">
                  <Smartphone className="w-5 h-5 text-cyan-500" />
                  Nodos_Activos ({devices.length})
                </h3>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-cyan-700 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl border border-cyan-500/5">
                  <RefreshCw className="w-5 h-5" />
                </Button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-700" />
                <Input
                  placeholder="IDENTIFICAR_NODO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-neon h-12 pl-12"
                />
              </div>

              <ScrollArea className="flex-1 pr-2 cyber-scrollbar">
                <div className="space-y-3">
                  {devicesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-cyan-500/20">
                      <RefreshCw className="w-10 h-10 animate-spin mb-4" />
                      <p className="text-[9px] font-black uppercase tracking-widest">Sincronizando...</p>
                    </div>
                  ) : filteredDevices.length > 0 ? (
                    filteredDevices.map((device: any) => (
                      <button
                        key={device.id}
                        onClick={() => setSelectedDeviceId(device.id)}
                        className={`w-full group p-5 rounded-2xl border transition-all text-left relative overflow-hidden ${
                          selectedDeviceId === device.id
                            ? "border-cyan-500/50 bg-cyan-500/10 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]"
                            : "border-cyan-500/5 bg-black/40 hover:border-cyan-500/30"
                        }`}
                      >
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex flex-col">
                              <span className={`font-black text-xs uppercase tracking-tight transition-colors ${selectedDeviceId === device.id ? "text-cyan-300" : "text-cyan-100"}`}>
                                {device.deviceName}
                              </span>
                              <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-cyan-900 mt-1">
                                {device.model || "GENERIC_HW"}
                              </span>
                            </div>
                            <div className={`text-[8px] px-2.5 py-1 rounded-lg border font-black uppercase tracking-widest ${
                              device.status === 'online' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                            }`}>
                              {device.status === 'online' ? 'ACTIVE' : 'IDLE'}
                            </div>
                          </div>
                          
                          <p className="text-[10px] text-cyan-900 mb-4 font-mono font-bold tracking-widest">{device.phoneNumber || "NO_SIM_ID"}</p>
                          
                          <div className="flex items-center gap-5 text-[10px] font-black text-cyan-700">
                            <div className="flex items-center gap-2">
                              <Battery className={`w-4 h-4 ${device.batteryLevel < 20 ? "text-rose-500" : "text-cyan-400"}`} />
                              <span>{device.batteryLevel}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Signal className="w-4 h-4 text-fuchsia-500" />
                              <span className="font-mono tracking-tighter">{getSignalBars(device.signalStrength)}</span>
                            </div>
                          </div>
                        </div>
                        {selectedDeviceId === device.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-20">
                      <Smartphone className="w-16 h-16 text-cyan-900/10 mx-auto mb-4" />
                      <p className="text-[10px] text-cyan-900 font-black uppercase tracking-widest italic">No se detectaron frecuencias</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Main Monitoring Detail Area */}
          <div className="lg:col-span-8 flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {selectedDevice ? (
              <>
                {/* Active Device Quick Stats */}
                <div className="glass-panel border-cyan-500/20 shadow-2xl p-8 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-cyan-500/10 transition-all duration-1000" />
                   
                   <div className="flex flex-wrap items-center justify-between gap-6 relative z-10 mb-8 border-b border-cyan-500/10 pb-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]">
                        <Smartphone className="w-8 h-8 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-cyan-100 italic tracking-tighter uppercase">{selectedDevice.deviceName}</h2>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">{selectedDevice.model || "ELITE_CLASS"}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-900" />
                          <span className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest font-mono">{selectedDevice.phoneNumber || "ENCRYPTED_ID"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button variant="ghost" className="btn-neon-cyan h-12 px-6 rounded-xl border border-cyan-500/30 font-black text-[10px] uppercase tracking-widest" onClick={() => {
                        if (!selectedDevice) return;
                        const csvContent = [
                          ["Propiedad", "Valor"],
                          ["Nombre", selectedDevice.deviceName],
                          ["Status", selectedDevice.status],
                          ["Batería", `${selectedDevice.batteryLevel}%`],
                          ["Sinal", `${selectedDevice.signalStrength}%`],
                          ["Última Conexión", selectedDevice.lastSeen ? new Date(selectedDevice.lastSeen).toLocaleString() : "N/A"],
                          ["Latitud", currentLocation?.latitude || "N/A"],
                          ["Longitud", currentLocation?.longitude || "N/A"],
                          ["Precisión", currentLocation?.accuracy || "N/A"],
                        ].map(e => e.join(",")).join("\n");
                        
                        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.setAttribute("href", url);
                        link.setAttribute("download", `telemetria_${selectedDevice.deviceName.replace(/\s/g, "_")}.csv`);
                        link.style.visibility = "hidden";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success("Telemetría exportada");
                      }}>
                        <Download className="w-5 h-5 mr-3" /> Export_CSV
                      </Button>
                      <Button className="btn-neon-cyan h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest" onClick={() => {
                         trpc.devices.refreshStatus.useMutation().mutate({ deviceId: selectedDeviceId! });
                         toast.success("Sincronización forzada enviada");
                      }}>
                        <RefreshCw className="w-5 h-5 mr-3" /> Force_Sync
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                    {[
                      { label: "Batería", value: `${selectedDevice.batteryLevel}%`, icon: Battery, color: "text-cyan-400", bg: "bg-cyan-500/10" },
                      { label: "Signal_Link", value: getSignalBars(selectedDevice.signalStrength), icon: Signal, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
                      { label: "Node_Status", value: selectedDevice.status === "online" ? "ACTIVE" : "IDLE", icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                      { label: "Last_Heartbeat", value: currentLocation ? formatDistanceToNow(new Date(currentLocation.timestamp), { addSuffix: true, locale: es }).toUpperCase() : "SYNCING...", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
                    ].map((stat, i) => (
                      <div key={i} className="p-5 rounded-2xl border border-cyan-500/5 bg-black/40 hover:border-cyan-500/20 transition-all group/stat">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} border border-transparent group-hover/stat:border-current transition-all`}>
                            <stat.icon className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-black text-cyan-900 uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <p className={`text-sm font-black uppercase tracking-tight ${stat.color} transition-all group-hover/stat:scale-105 origin-left`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking Tabs */}
                <Tabs defaultValue="gps" className="w-full">
                  <TabsList className="bg-black/40 border border-cyan-500/20 p-1.5 h-16 rounded-2xl gap-3 mb-8">
                    <TabsTrigger value="gps" className="flex-1 rounded-xl data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:neon-border-cyan font-black text-xs uppercase tracking-widest transition-all">
                      <MapPin className="w-5 h-5 mr-3" />
                      Geolocalización
                    </TabsTrigger>
                    <TabsTrigger value="sms" className="flex-1 rounded-xl data-[state=active]:bg-fuchsia-500/20 data-[state=active]:text-fuchsia-300 data-[state=active]:neon-border-magenta font-black text-xs uppercase tracking-widest transition-all">
                      <MessageSquare className="w-5 h-5 mr-3" />
                      Payload SMS ({smsMessages.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* GPS View */}
                  <TabsContent value="gps" className="glass-panel border-cyan-500/10 shadow-2xl p-8 mt-0 animate-in fade-in duration-500">
                    {currentLocation ? (
                      <div className="space-y-8">
                        <div className="bg-black/40 p-6 rounded-2xl border border-cyan-500/10 grid grid-cols-2 md:grid-cols-3 gap-8">
                          <div>
                            <p className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-2">Latitude_Coord</p>
                            <p className="text-base font-mono font-bold text-cyan-100">{currentLocation.latitude.toFixed(6)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-2">Longitude_Coord</p>
                            <p className="text-base font-mono font-bold text-cyan-100">{currentLocation.longitude.toFixed(6)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-2">Accuracy_Radius</p>
                            <div className="flex items-center gap-3 font-black text-cyan-400 text-base">
                              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,1)]" />
                              ± {currentLocation.accuracy.toFixed(1)}m
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-cyan-100 flex items-center gap-3 uppercase text-xs tracking-widest italic">
                             <MapIcon className="w-5 h-5 text-cyan-500" />
                             Interfaz Visual de Rastreo
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowMap(!showMap)}
                            className="text-cyan-500 hover:text-cyan-300 hover:bg-cyan-500/10 font-black text-[9px] uppercase tracking-widest rounded-xl border border-cyan-500/20 px-4"
                          >
                            {showMap ? <><EyeOff className="w-4 h-4 mr-3" /> Hide_Map</> : <><Eye className="w-4 h-4 mr-3" /> Show_Map</>}
                          </Button>
                        </div>

                        {showMap && currentLocation && (
                          <div className="space-y-6">
                            <div className="w-full h-[450px] rounded-3xl overflow-hidden border-2 border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.1)] grayscale">
                              <MapView
                                className="w-full h-full"
                                initialCenter={{
                                  lat: currentLocation.latitude,
                                  lng: currentLocation.longitude
                                }}
                                initialZoom={15}
                                markers={[{
                                  id: selectedDeviceId,
                                  position: {
                                    lat: currentLocation.latitude,
                                    lng: currentLocation.longitude
                                  },
                                  title: selectedDevice?.deviceName || "NODO_ACTIVO",
                                  icon: "online"
                                }]}
                                onMapReady={(map) => { mapRef.current = map; }}
                              />
                            </div>
                            
                            <div className="flex justify-between items-center px-4 py-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10">
                              <div className="flex items-center gap-5">
                                {currentLocation.speed !== undefined && (
                                  <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-cyan-900 uppercase mb-1">Velocity_Vector</span>
                                    <span className="text-xs font-black text-cyan-400 uppercase tracking-tighter">{Math.round(currentLocation.speed * 3.6)} km/h</span>
                                  </div>
                                )}
                                {currentLocation.bearing !== undefined && (
                                  <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-cyan-900 uppercase mb-1">Compass_Bearing</span>
                                    <span className="text-xs font-black text-cyan-400 uppercase tracking-tighter">{Math.round(currentLocation.bearing)}°</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                                <span className="text-[9px] text-cyan-900 font-black uppercase italic tracking-widest">WS_STREAMING_ACTIVE</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-32 bg-cyan-950/20 rounded-3xl border-2 border-dashed border-cyan-500/10">
                        <MapPin className="w-20 h-20 text-cyan-900/20 mx-auto mb-6" />
                        <h4 className="text-xl font-black text-cyan-100 uppercase tracking-widest italic">Signal_Lost</h4>
                        <p className="text-[10px] text-cyan-900 font-bold uppercase tracking-[0.3em] max-w-xs mx-auto mt-6">Sin coordenadas de telemetría recientes para este nodo.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* SMS View */}
                  <TabsContent value="sms" className="glass-panel border-fuchsia-500/10 shadow-2xl p-8 mt-0 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between mb-8 border-b border-fuchsia-500/10 pb-6">
                       <h4 className="font-black text-cyan-100 flex items-center gap-3 uppercase text-xs tracking-widest italic">
                          <MessageSquare className="w-5 h-5 text-fuchsia-500" />
                          Registro de Intercepciones
                       </h4>
                       <div className="flex items-center gap-6">
                         <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">IN_STREAM</span>
                         </div>
                         <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">OUT_STREAM</span>
                         </div>
                       </div>
                    </div>

                    {smsMessages.length > 0 ? (
                      <ScrollArea className="h-[550px] pr-6 cyber-scrollbar">
                        <div className="space-y-5">
                          {smsMessages.map((sms: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-6 rounded-3xl border transition-all group ${
                                sms.direction === "incoming"
                                  ? "border-emerald-500/20 bg-emerald-500/5 ml-0 mr-20 hover:border-emerald-500/40"
                                  : "border-blue-500/20 bg-blue-500/5 ml-20 mr-0 hover:border-blue-500/40"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-xl border tracking-widest ${
                                  sms.direction === "incoming" 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                    : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                }`}>
                                  {sms.phoneNumber}
                                </span>
                                <span className="text-[9px] font-bold text-cyan-900 group-hover:text-cyan-500 transition-colors uppercase italic font-mono">
                                  {formatDistanceToNow(new Date(sms.timestamp), { addSuffix: true, locale: es }).toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm text-cyan-100 leading-relaxed font-bold font-mono tracking-tight group-hover:text-cyan-300 transition-colors">{sms.message}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-32 bg-fuchsia-950/10 rounded-3xl border-2 border-dashed border-fuchsia-500/10">
                        <MessageSquare className="w-20 h-20 text-fuchsia-900/10 mx-auto mb-6" />
                        <h4 className="text-xl font-black text-cyan-100 uppercase tracking-widest italic">Inbox_Empty</h4>
                        <p className="text-[10px] text-cyan-900 font-bold uppercase tracking-[0.3em] max-w-xs mx-auto mt-6">No se han interceptado transmisiones de datos SMS recientemente.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="glass-panel border-cyan-500/10 shadow-2xl p-20 text-center flex flex-col items-center justify-center h-full group border-dashed">
                <div className="w-32 h-32 rounded-full bg-cyan-500/5 flex items-center justify-center mb-10 border border-cyan-500/10 shadow-[inset_0_0_40px_rgba(34,211,238,0.1)] group-hover:shadow-[inset_0_0_60px_rgba(34,211,238,0.2)] transition-all duration-700">
                   <Smartphone className="w-16 h-16 text-cyan-500/20 group-hover:text-cyan-500/40 group-hover:scale-110 transition-all duration-700 animate-pulse" />
                </div>
                <h3 className="text-2xl font-black text-cyan-100 uppercase tracking-[0.2em] italic gradient-text">Seleccionar Nodo de Red</h3>
                <p className="text-cyan-900 font-bold uppercase text-[10px] tracking-[0.4em] max-w-sm mt-8 leading-relaxed">
                  Elija un terminal activo de la matriz lateral para inicializar el protocolo de monitoreo remoto y telemetría de campo.
                </p>
                <div className="mt-12 flex gap-4">
                   <div className="h-0.5 w-16 bg-cyan-500/20" />
                   <div className="h-0.5 w-6 bg-cyan-500/60 animate-bounce" />
                   <div className="h-0.5 w-16 bg-cyan-500/20" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
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
