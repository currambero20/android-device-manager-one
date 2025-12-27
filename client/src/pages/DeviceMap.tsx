import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
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
      alert: "bg-red-500/20 text-red-400",
      safe: "bg-green-500/20 text-green-400",
      restricted: "bg-yellow-500/20 text-yellow-400",
    };
    return colors[type] || "bg-gray-500/20 text-gray-400";
  };

  const getTrafficColor = (level: string) => {
    const colors: Record<string, string> = {
      light: "bg-green-500/20 text-green-400",
      moderate: "bg-yellow-500/20 text-yellow-400",
      heavy: "bg-red-500/20 text-red-400",
    };
    return colors[level] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            Mapa de Dispositivos
          </h1>
          <p className="text-gray-400 mt-2">Visualiza ubicaciones, rutas, tráfico y geofences en tiempo real</p>
        </div>
        <MapIcon className="w-12 h-12 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Panel de Control */}
        <Card className="lg:col-span-1 bg-gray-900 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-lg">Controles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Búsqueda de Lugares */}
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <Search className="w-4 h-4" />
                Buscar Lugar
              </div>
              <div className="relative">
                <Input
                  placeholder="Buscar dirección..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-sm"
                />
                {searchLoading && <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin" />}
              </div>
              {searchResults && searchResults.results.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {searchResults.results.map((result: any) => (
                    <div
                      key={result.placeId}
                      className="p-2 bg-gray-800 rounded text-xs cursor-pointer hover:bg-gray-700"
                    >
                      <div className="font-medium">{result.name}</div>
                      <div className="text-gray-400">{result.address}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opciones de Visualización */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Visualización</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGeofences}
                    onChange={(e) => setShowGeofences(e.target.checked)}
                    className="rounded border-gray-700"
                  />
                  <span className="text-sm">Geofences</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    className="rounded border-gray-700"
                  />
                  <span className="text-sm">Rutas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTraffic}
                    onChange={(e) => setShowTraffic(e.target.checked)}
                    className="rounded border-gray-700"
                  />
                  <span className="text-sm">Tráfico en Vivo</span>
                </label>
              </div>
            </div>

            {/* Selección de Dispositivos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Dispositivos</span>
                <Button
                  onClick={handleSelectAllDevices}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-cyan-400 hover:bg-cyan-400/20"
                >
                  {selectedDevices.length === allDevices?.length ? "Desseleccionar" : "Todos"}
                </Button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allDevices?.map((device: any) => (
                  <label key={device.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-800 rounded">
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => handleSelectDevice(device.id)}
                      className="rounded border-gray-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{device.deviceName}</div>
                      <div className="text-xs text-gray-400">
                        {getDeviceStatus(device.id) === "online" ? (
                          <span className="text-green-400">● En línea</span>
                        ) : (
                          <span className="text-gray-500">● Desconectado</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro de Geofences */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Filtrar Geofences</span>
              <Select value={selectedGeofenceType} onValueChange={(val: any) => setSelectedGeofenceType(val)}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
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
          <Card className="bg-gray-900 border-purple-500/30 h-96">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-cyan-400" />
                Mapa Interactivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={mapRef}
                className="w-full h-80 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 flex items-center justify-center relative overflow-hidden"
              >
                {/* Simulación de Mapa Google */}
                <div className="absolute inset-0 opacity-10">
                  <svg className="w-full h-full" viewBox="0 0 400 300">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="400" height="300" fill="url(#grid)" />
                  </svg>
                </div>

                {/* Tráfico en Vivo */}
                {showTraffic &&
                  trafficInfo?.segments?.map((segment: any, idx: number) => (
                    <div
                      key={idx}
                      className="absolute h-1 opacity-70"
                      style={{
                        left: `${((segment.startLocation.longitude + 180) / 360) * 100}%`,
                        top: `${((90 - segment.startLocation.latitude) / 180) * 100}%`,
                        width: "20px",
                        backgroundColor: segment.color,
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
                            className="absolute"
                            style={{
                              left: `${((prev.longitude + 180) / 360) * 100}%`,
                              top: `${((90 - prev.latitude) / 180) * 100}%`,
                            }}
                          >
                            <line
                              x1="0"
                              y1="0"
                              x2={((point.longitude - prev.longitude) / 360) * 400}
                              y2={((prev.latitude - point.latitude) / 180) * 300}
                              stroke={routeIdx === 0 ? "#00bfff" : "#6b7280"}
                              strokeWidth="2"
                              opacity={routeIdx === 0 ? 1 : 0.5}
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
                    className="absolute w-4 h-4 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:w-5 hover:h-5 transition-all"
                    style={{
                      left: `${((device.longitude + 180) / 360) * 100}%`,
                      top: `${((90 - device.latitude) / 180) * 100}%`,
                    }}
                    title={`Dispositivo ${device.deviceId}`}
                  />
                ))}

                {/* Geofences */}
                {showGeofences &&
                  filteredGeofences?.map((geofence: any, idx: number) => (
                    <div
                      key={idx}
                      className="absolute rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 opacity-50"
                      style={{
                        left: `${((geofence.longitude + 180) / 360) * 100}%`,
                        top: `${((90 - geofence.latitude) / 180) * 100}%`,
                        width: `${(geofence.radius / 111) * 10}px`,
                        height: `${(geofence.radius / 111) * 10}px`,
                        borderColor: geofence.color,
                      }}
                      title={geofence.name}
                    />
                  ))}

                {/* Mensaje si no hay datos */}
                {(!deviceLocations?.devices || deviceLocations.devices.length === 0) && (
                  <div className="text-center text-gray-400">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Selecciona dispositivos para ver ubicaciones</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información de Rutas */}
          {showRoutes && routeData?.routes && (
            <Card className="bg-gray-900 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Route className="w-5 h-5 text-cyan-400" />
                  Rutas Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {routeData.routes.map((route: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRoute === idx
                        ? "bg-cyan-500/20 border-cyan-400"
                        : "bg-gray-800 border-gray-700 hover:border-cyan-400/50"
                    }`}
                    onClick={() => setSelectedRoute(idx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {idx === 0 ? (
                          <Zap className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-gray-400" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{route.summary}</div>
                          <div className="text-xs text-gray-400">
                            {idx === 0 ? "Ruta Recomendada" : `Alternativa ${idx}`}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-cyan-500/20 text-cyan-400">{route.distance / 1000} km</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Información de Tráfico */}
          {showTraffic && trafficInfo?.segments && (
            <Card className="bg-gray-900 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Tráfico en Vivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                {trafficInfo.segments.map((segment: any, idx: number) => (
                  <div key={idx} className="p-2 bg-gray-800 rounded text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="capitalize">{segment.congestionLevel}</span>
                      </div>
                      <Badge className={getTrafficColor(segment.congestionLevel)}>
                        {segment.speedKmh} km/h
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tabs de Información */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
              <TabsTrigger value="devices" className="data-[state=active]:bg-purple-600">
                Dispositivos
              </TabsTrigger>
              <TabsTrigger value="geofences" className="data-[state=active]:bg-purple-600">
                Geofences
              </TabsTrigger>
              <TabsTrigger value="events" className="data-[state=active]:bg-purple-600">
                Eventos
              </TabsTrigger>
            </TabsList>

            {/* Tab: Dispositivos */}
            <TabsContent value="devices" className="space-y-3">
              {deviceLocations?.devices?.map((device: any) => (
                <Card key={device.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-cyan-400" />
                        <div>
                          <div className="font-medium text-sm">Dispositivo {device.deviceId}</div>
                          <div className="text-xs text-gray-400">
                            {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          {device.accuracy}m
                        </Badge>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(device.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tab: Geofences */}
            <TabsContent value="geofences" className="space-y-3">
              <div className="space-y-2">
                {filteredGeofences?.map((geofence: any) => (
                  <Card key={geofence.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Circle className="w-5 h-5" style={{ color: geofence.color }} />
                          <div>
                            <div className="font-medium text-sm">{geofence.name}</div>
                            <Badge className={`text-xs mt-1 ${getGeofenceTypeColor(geofence.type)}`}>
                              {geofence.type}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">{geofence.radius}m</div>
                          <Button
                            onClick={() => deleteGeofenceMutation.mutate({ geofenceId: geofence.id })}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:bg-red-400/20 mt-1"
                            disabled={deleteGeofenceMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tab: Eventos */}
            <TabsContent value="events" className="space-y-3">
              {geofenceEvents?.events?.map((event: any) => (
                <Card key={event.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {event.eventType === "enter" ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        )}
                        <div>
                          <div className="font-medium text-sm">
                            {event.eventType === "enter" ? "Entrada" : "Salida"}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={
                          event.eventType === "enter"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }
                      >
                        {event.eventType}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
