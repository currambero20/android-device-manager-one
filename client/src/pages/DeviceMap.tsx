import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Navigation,
  Circle,
  Layers,
  Download,
  Plus,
  Trash2,
  MapIcon,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
  Route,
  Zap,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export default function DeviceMap() {
  const [selectedDevices, setSelectedDevices] = useState<number[]>([]);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showRoutes, setShowRoutes] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [selectedGeofenceType, setSelectedGeofenceType] = useState<"all" | "alert" | "safe" | "restricted">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("devices");
  const mapRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: allDevices } = trpc.devices.getAll.useQuery() as any;
  const { data: deviceLocations } = trpc.maps.getCurrentDeviceLocations.useQuery(
    {
      deviceIds: selectedDevices.length > 0 ? selectedDevices : undefined,
    },
    { enabled: true }
  );
  const { data: geofences } = trpc.maps.getGeofencesForMap.useQuery({
    deviceIds: selectedDevices.length > 0 ? selectedDevices : undefined,
  });
  const { data: geofenceEvents } = trpc.maps.getGeofenceEvents.useQuery(
    {
      deviceId: selectedDevices[0] || 0,
    },
    { enabled: selectedDevices.length > 0 }
  );

  // Google Maps API queries
  const { data: searchResults, isLoading: searchLoading } = trpc.googleMaps.searchPlaces.useQuery(
    {
      query: searchQuery,
      location:
        deviceLocations?.devices?.[0]
          ? {
              latitude: deviceLocations.devices[0].latitude,
              longitude: deviceLocations.devices[0].longitude,
            }
          : undefined,
    },
    { enabled: searchQuery.length > 2 }
  );

  const { data: trafficInfo } = trpc.googleMaps.getTrafficInfo.useQuery(
    {
      bounds: {
        northeast: { latitude: 40.8, longitude: -73.9 },
        southwest: { latitude: 40.6, longitude: -74.1 },
      },
    },
    { enabled: showTraffic, refetchInterval: 30000 }
  );

  const { data: routeData } = trpc.googleMaps.getRoute.useQuery(
    {
      origin: deviceLocations?.devices?.[0] || { latitude: 40.7128, longitude: -74.006 },
      destination: deviceLocations?.devices?.[1] || { latitude: 34.0522, longitude: -118.2437 },
      travelMode: "DRIVING",
      alternatives: true,
    },
    { enabled: showRoutes && deviceLocations?.devices && deviceLocations.devices.length >= 2 }
  );

  // Mutations
  const createGeofenceMutation = trpc.maps.createGeofence.useMutation({
    onSuccess: () => {
      toast.success("Geofence creado exitosamente");
    },
    onError: () => {
      toast.error("Error al crear geofence");
    },
  });

  const deleteGeofenceMutation = trpc.maps.deleteGeofence.useMutation({
    onSuccess: () => {
      toast.success("Geofence eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar geofence");
    },
  });

  // Filtered geofences
  const filteredGeofences = useMemo(() => {
    if (!geofences?.geofences) return [];
    if (selectedGeofenceType === "all") return geofences.geofences;
    return geofences.geofences.filter((g: any) => g.type === selectedGeofenceType);
  }, [geofences?.geofences, selectedGeofenceType]);

  const handleSelectDevice = (deviceId: number) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]
    );
  };

  const handleSelectAllDevices = () => {
    if (selectedDevices.length === allDevices?.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(allDevices?.map((d: any) => d.id) || []);
    }
  };

  const getDeviceStatus = (deviceId: number) => {
    const location = deviceLocations?.devices?.find((d: any) => d.deviceId === deviceId);
    return location ? "online" : "offline";
  };

  const getGeofenceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      alert: "bg-destructive/10 text-destructive border-destructive/20",
      safe: "bg-green-500/10 text-green-700 border-green-200",
      restricted: "bg-amber-500/10 text-amber-700 border-amber-200",
    };
    return colors[type] || "bg-secondary text-muted-foreground";
  };

  const getTrafficColor = (level: string) => {
    const colors: Record<string, string> = {
      light: "bg-green-500/10 text-green-700",
      moderate: "bg-amber-500/10 text-amber-700",
      heavy: "bg-destructive/10 text-destructive",
    };
    return colors[level] || "bg-secondary text-muted-foreground";
  };

  return (
    <DashboardLayout title="Mapa de Dispositivos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700">
              Mapa de Dispositivos
            </h1>
            <p className="text-muted-foreground mt-2">Visualiza ubicaciones, rutas, tráfico y geofences en tiempo real</p>
          </div>
          <MapIcon className="w-12 h-12 text-primary opacity-80" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Panel de Control */}
          <Card className="lg:col-span-1 border-accent/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Controles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Búsqueda de Lugares */}
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  Buscar Lugar
                </div>
                <div className="relative">
                  <Input
                    placeholder="Buscar dirección..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-secondary/50 border-accent/20 text-sm"
                  />
                  {searchLoading && <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-primary" />}
                </div>
                {searchResults && searchResults.results.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto pt-1">
                    {searchResults.results.map((result: any) => (
                      <div
                        key={result.placeId}
                        className="p-2 bg-secondary/30 rounded border border-accent/10 text-xs cursor-pointer hover:bg-secondary/50 transition-colors"
                      >
                        <div className="font-medium text-foreground">{result.name}</div>
                        <div className="text-muted-foreground truncate">{result.address}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Opciones de Visualización */}
              <div className="space-y-2 border-t border-accent/10 pt-4">
                <div className="text-sm font-medium">Visualización</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={showGeofences}
                      onChange={(e) => setShowGeofences(e.target.checked)}
                      className="rounded border-accent/40 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">Geofences</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={showRoutes}
                      onChange={(e) => setShowRoutes(e.target.checked)}
                      className="rounded border-accent/40 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">Rutas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={showTraffic}
                      onChange={(e) => setShowTraffic(e.target.checked)}
                      className="rounded border-accent/40 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">Tráfico en Vivo</span>
                  </label>
                </div>
              </div>

              {/* Selección de Dispositivos */}
              <div className="space-y-3 border-t border-accent/10 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dispositivos</span>
                  <Button
                    onClick={handleSelectAllDevices}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary hover:bg-primary/5 px-2 h-7"
                  >
                    {selectedDevices.length === allDevices?.length ? "Ninguno" : "Todos"}
                  </Button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {allDevices?.map((device: any) => (
                    <label 
                      key={device.id} 
                      className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-all ${
                        selectedDevices.includes(device.id) 
                          ? "bg-primary/5 border-primary/20" 
                          : "border-transparent hover:bg-secondary/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.id)}
                        onChange={() => handleSelectDevice(device.id)}
                        className="rounded border-accent/40 text-primary focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate font-medium text-foreground">{device.deviceName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            getDeviceStatus(device.id) === "online" ? "bg-green-500" : "bg-muted-foreground/30"
                          }`} />
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            {getDeviceStatus(device.id) === "online" ? "En línea" : "Desconectado"}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtro de Geofences */}
              <div className="space-y-2 border-t border-accent/10 pt-4">
                <span className="text-sm font-medium">Filtrar Geofences</span>
                <Select value={selectedGeofenceType} onValueChange={(val: any) => setSelectedGeofenceType(val)}>
                  <SelectTrigger className="bg-secondary/50 border-accent/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="alert">Alertas</SelectItem>
                    <SelectItem value="safe">Seguros</SelectItem>
                    <SelectItem value="restricted">Restringidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Mapa y Detalles */}
          <div className="lg:col-span-3 space-y-4">
            {/* Mapa Google Maps */}
            <Card className="border-accent/20 shadow-sm">
              <CardHeader className="py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Mapa Interactivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={mapRef}
                  className="w-full h-[400px] bg-secondary/10 rounded-xl border border-accent/20 flex items-center justify-center relative overflow-hidden shadow-inner"
                >
                  {/* Simulación de Mapa Google (Aspecto Claro) */}
                  <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 400 300">
                      <defs>
                        <pattern id="grid-light" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="400" height="300" fill="url(#grid-light)" />
                    </svg>
                  </div>

                  {/* Tráfico en Vivo */}
                  {showTraffic &&
                    trafficInfo?.segments?.map((segment: any, idx: number) => (
                      <div
                        key={idx}
                        className="absolute h-1 opacity-80 rounded-full"
                        style={{
                          left: `${((segment.startLocation.longitude + 180) / 360) * 100}%`,
                          top: `${((90 - segment.startLocation.latitude) / 180) * 100}%`,
                          width: "30px",
                          backgroundColor: segment.color,
                          boxShadow: `0 0 4px ${segment.color}`,
                        }}
                        title={`Tráfico ${segment.congestionLevel}: ${segment.speedKmh} km/h`}
                      />
                    ))}

                  {/* Rutas */}
                  {showRoutes &&
                    routeData?.routes?.map((route: any, routeIdx: number) => (
                      <div key={routeIdx} className="absolute inset-0 pointer-events-none">
                        {route.points?.map((point: any, idx: number) => {
                          if (idx === 0) return null;
                          const prev = route.points[idx - 1];
                          return (
                            <svg
                              key={idx}
                              className="absolute w-full h-full"
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                            >
                              <line
                                x1={`${((prev.longitude + 180) / 360) * 100}%`}
                                y1={`${((90 - prev.latitude) / 180) * 100}%`}
                                x2={`${((point.longitude + 180) / 360) * 100}%`}
                                y2={`${((90 - point.latitude) / 180) * 100}%`}
                                stroke={routeIdx === 0 ? "#0EA5E9" : "#94A3B8"}
                                strokeWidth={routeIdx === 0 ? "2" : "1"}
                                strokeDasharray={routeIdx === 0 ? "0" : "4 2"}
                                opacity={routeIdx === 0 ? 0.8 : 0.4}
                              />
                            </svg>
                          );
                        })}
                      </div>
                    ))}

                  {/* Dispositivos */}
                  {deviceLocations?.devices?.map((device: any, idx: number) => (
                    <div
                      key={idx}
                      className="absolute w-5 h-5 bg-primary rounded-full shadow-lg ring-4 ring-white/80 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform"
                      style={{
                        left: `${((device.longitude + 180) / 360) * 100}%`,
                        top: `${((90 - device.latitude) / 180) * 100}%`,
                      }}
                      title={`Dispositivo ${device.deviceId}`}
                    >
                      <div className="absolute inset-0 animate-ping rounded-full bg-primary/40 -z-10" />
                    </div>
                  ))}

                  {/* Geofences */}
                  {showGeofences &&
                    filteredGeofences?.map((geofence: any, idx: number) => (
                      <div
                        key={idx}
                        className="absolute rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${((geofence.longitude + 180) / 360) * 100}%`,
                          top: `${((90 - geofence.latitude) / 180) * 100}%`,
                          width: `${(geofence.radius / 111) * 20}px`,
                          height: `${(geofence.radius / 111) * 20}px`,
                          borderColor: geofence.color,
                          backgroundColor: `${geofence.color}15`,
                        }}
                        title={geofence.name}
                      />
                    ))}

                  {/* Mensaje si no hay datos */}
                  {(!deviceLocations?.devices || deviceLocations.devices.length === 0) && (
                    <div className="text-center p-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-accent/20 shadow-xl">
                      <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-muted-foreground">Selecciona dispositivos para visualizar su ubicación</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información de Rutas */}
            {showRoutes && routeData?.routes && (
              <Card className="border-accent/20 shadow-sm overflow-hidden">
                <CardHeader className="bg-secondary/20 py-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-primary" />
                    Rutas Disponibles
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {routeData.routes.map((route: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedRoute === idx
                          ? "bg-primary/10 border-primary/30"
                          : "bg-background border-accent/20 hover:border-primary/40"
                      }`}
                      onClick={() => setSelectedRoute(idx)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${idx === 0 ? "bg-primary/20" : "bg-secondary/50"}`}>
                            {idx === 0 ? <Zap className="w-4 h-4 text-primary" /> : <TrendingUp className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{route.summary}</div>
                            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                              {idx === 0 ? "Recomendada" : "Alternativa"}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                          {(route.distance / 1000).toFixed(1)} km
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Tabs de Información */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-secondary/30 border border-accent/20 p-1 h-11 rounded-xl">
                <TabsTrigger value="devices" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary text-xs font-semibold">
                  Dispositivos
                </TabsTrigger>
                <TabsTrigger value="geofences" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary text-xs font-semibold">
                  Geofences
                </TabsTrigger>
                <TabsTrigger value="events" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary text-xs font-semibold">
                  Eventos
                </TabsTrigger>
              </TabsList>

              {/* Tab: Dispositivos */}
              <TabsContent value="devices" className="mt-4 space-y-3">
                {deviceLocations?.devices?.length > 0 ? (
                  deviceLocations.devices.map((device: any) => (
                    <Card key={device.id} className="border-accent/20 shadow-sm hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-primary/10 rounded-xl">
                              <Smartphone className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground">Dispositivo {device.deviceId}</div>
                              <div className="text-xs font-mono text-muted-foreground mt-0.5">
                                {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] py-0">
                               ±{device.accuracy}m
                            </Badge>
                            <div className="text-[10px] font-semibold text-muted-foreground mt-1.5 uppercase tracking-tighter">
                              {new Date(device.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">No hay ubicaciones de dispositivos disponibles</div>
                )}
              </TabsContent>

              {/* Tab: Geofences */}
              <TabsContent value="geofences" className="mt-4 space-y-3">
                {filteredGeofences?.length > 0 ? (
                  filteredGeofences.map((geofence: any) => (
                    <Card key={geofence.id} className="border-accent/20 shadow-sm hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-secondary/30 rounded-full" style={{ border: `2px solid ${geofence.color}` }}>
                              <Circle className="w-4 h-4" style={{ color: geofence.color }} />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground">{geofence.name}</div>
                              <Badge variant="outline" className={`text-[9px] mt-1 uppercase font-bold tracking-wider ${getGeofenceTypeColor(geofence.type)}`}>
                                {geofence.type === "alert" ? "Alerta" : geofence.type === "safe" ? "Seguro" : "Restringido"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-foreground">{geofence.radius}m radio</div>
                            </div>
                            <Button
                              onClick={() => deleteGeofenceMutation.mutate({ geofenceId: geofence.id })}
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/5 h-8 w-8 p-0"
                              disabled={deleteGeofenceMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">No se encontraron geofences</div>
                )}
              </TabsContent>

              {/* Tab: Eventos */}
              <TabsContent value="events" className="mt-4 space-y-3">
                {geofenceEvents?.events?.length > 0 ? (
                  geofenceEvents.events.map((event: any) => (
                    <Card key={event.id} className="border-accent/20 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ${event.eventType === "enter" ? "bg-green-100" : "bg-red-100"}`}>
                              {event.eventType === "enter" ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground">
                                {event.eventType === "enter" ? "Entrada a Geofence" : "Salida de Geofence"}
                              </div>
                              <div className="text-[10px] font-semibold text-muted-foreground mt-0.5 uppercase">
                                {new Date(event.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <Badge
                            className={`text-[10px] font-bold uppercase ${
                              event.eventType === "enter"
                                ? "bg-green-500/10 text-green-700 border-green-200"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}
                            variant="outline"
                          >
                            {event.eventType === "enter" ? "Entró" : "Salió"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">No hay eventos recientes</div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
