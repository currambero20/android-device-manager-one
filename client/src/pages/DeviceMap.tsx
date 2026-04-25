import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { MapView } from "@/components/Map";
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
import L from "leaflet";

export default function DeviceMap() {
  const [selectedDevices, setSelectedDevices] = useState<number[]>([]);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showRoutes, setShowRoutes] = useState(false);
  const [selectedGeofenceType, setSelectedGeofenceType] = useState<"all" | "alert" | "safe" | "restricted">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("devices");
  const mapRef = useRef<L.Map | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const { data: allDevices } = trpc.devices.getAll.useQuery() as any;
  const { data: deviceLocations } = trpc.maps.getCurrentDeviceLocations.useQuery(
    {
      deviceIds: selectedDevices.length > 0 ? selectedDevices : undefined,
    },
    { enabled: true }
  ) as any;
  const { data: geofences } = trpc.maps.getGeofencesForMap.useQuery({
    deviceIds: selectedDevices.length > 0 ? selectedDevices : undefined,
  }) as any;
  const { data: geofenceEvents } = trpc.maps.getGeofenceEvents.useQuery(
    {
      deviceId: selectedDevices[0] || 0,
    },
    { enabled: selectedDevices.length > 0 }
  ) as any;

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

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        searchPlaces(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPlaces]);

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
      alert: "#EF4444",
      safe: "#22C55E",
      restricted: "#F59E0B",
    };
    return colors[type] || "#6B7280";
  };

  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
  };

  const markers = useMemo(() => {
    if (!deviceLocations?.devices) return [];
    return deviceLocations.devices.map((device: any) => ({
      id: device.deviceId,
      position: { lat: device.latitude, lng: device.longitude },
      title: `Device ${device.deviceId}`,
      icon: getDeviceStatus(device.deviceId) as "online" | "offline",
    }));
  }, [deviceLocations, selectedDevices]);

  const circles = useMemo(() => {
    if (!showGeofences || !filteredGeofences) return [];
    return filteredGeofences.map((geofence: any) => ({
      id: geofence.id,
      center: { lat: parseFloat(geofence.latitude), lng: parseFloat(geofence.longitude) },
      radius: geofence.radius || 200,
      color: getGeofenceTypeColor(geofence.type),
      fillColor: getGeofenceTypeColor(geofence.type),
    }));
  }, [filteredGeofences, showGeofences]);

  const mapCenter = useMemo(() => {
    if (markers.length > 0) {
      return { lat: markers[0].position.lat, lng: markers[0].position.lng };
    }
    return { lat: 4.6097, lng: -74.0817 };
  }, [markers]);

  const handleSearchResultClick = (result: { lat: string; lon: string; display_name: string }) => {
    if (mapRef.current) {
      mapRef.current.setView([parseFloat(result.lat), parseFloat(result.lon)], 15);
    }
    setSearchResults([]);
    setSearchQuery("");
  };

  return (
    <DashboardLayout title="Mapa de Dispositivos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700">
              Mapa de Dispositivos
            </h1>
            <p className="text-muted-foreground mt-2">Visualiza ubicaciones en tiempo real con OpenStreetMap</p>
          </div>
          <MapIcon className="w-12 h-12 text-primary opacity-80" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-1 border-accent/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Controles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                {searchResults.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto pt-1">
                    {searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSearchResultClick(result)}
                        className="p-2 bg-secondary/30 rounded border border-accent/10 text-xs cursor-pointer hover:bg-secondary/50 transition-colors"
                      >
                        <div className="font-medium text-foreground truncate">{result.display_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                </div>
              </div>

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

          <div className="lg:col-span-3 space-y-4">
            <Card className="border-accent/20 shadow-sm">
              <CardHeader className="py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Mapa Interactivo (OpenStreetMap)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MapView
                  className="w-full h-[450px]"
                  initialCenter={mapCenter}
                  initialZoom={13}
                  markers={markers}
                  circles={circles}
                  onMapReady={handleMapReady}
                />
              </CardContent>
            </Card>

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

              <TabsContent value="geofences" className="mt-4 space-y-3">
                {filteredGeofences?.length > 0 ? (
                  filteredGeofences.map((geofence: any) => (
                    <Card key={geofence.id} className="border-accent/20 shadow-sm hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-secondary/30 rounded-full" style={{ border: `2px solid ${getGeofenceTypeColor(geofence.type)}` }}>
                              <Circle className="w-4 h-4" style={{ color: getGeofenceTypeColor(geofence.type) }} />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground">{geofence.name}</div>
                              <Badge variant="outline" className={`text-[9px] mt-1 uppercase font-bold tracking-wider`}
                                style={{ 
                                  borderColor: getGeofenceTypeColor(geofence.type),
                                  color: getGeofenceTypeColor(geofence.type)
                                }}
                              >
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
