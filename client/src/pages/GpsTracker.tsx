import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  MapPin, Navigation, Plus, Trash2, AlertTriangle,
  RefreshCw, Signal, Crosshair, Clock, Layers
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function GpsTracker() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [newFence, setNewFence] = useState({
    name: "", latitude: "", longitude: "", radius: "200",
    alertOnEntry: true, alertOnExit: true,
  });
  const [showAddFence, setShowAddFence] = useState(false);

  const { data: devices = [] } = trpc.devices.getAll.useQuery() as any;
  const { data: latestLocation, refetch: refetchLocation } = trpc.geofencing.getLatestLocation.useQuery(
    { deviceId: selectedDeviceId! },
    { enabled: !!selectedDeviceId, refetchInterval: 15000 }
  );
  const { data: locationHistory = [] } = trpc.geofencing.getLocationHistory.useQuery(
    { deviceId: selectedDeviceId!, limit: 50 },
    { enabled: !!selectedDeviceId }
  );
  const { data: geofences = [], refetch: refetchFences } = trpc.geofencing.getGeofences.useQuery(
    { deviceId: selectedDeviceId! },
    { enabled: !!selectedDeviceId }
  );
  const { data: geofenceEvents = [] } = trpc.geofencing.getGeofenceEvents.useQuery(
    { deviceId: selectedDeviceId! },
    { enabled: !!selectedDeviceId }
  );

  const createGeofence = trpc.geofencing.createGeofence.useMutation({
    onSuccess: () => { toast.success("Geocerca creada"); refetchFences(); setShowAddFence(false); setNewFence({ name: "", latitude: "", longitude: "", radius: "200", alertOnEntry: true, alertOnExit: true }); },
    onError: (e) => toast.error(e.message),
  });
  const deleteGeofence = trpc.geofencing.deleteGeofence.useMutation({
    onSuccess: () => { toast.success("Geocerca eliminada"); refetchFences(); },
    onError: (e) => toast.error(e.message),
  });
  const toggleGeofence = trpc.geofencing.toggleGeofence.useMutation({
    onSuccess: () => refetchFences(),
  });

  const googleMapsUrl = latestLocation
    ? `https://maps.google.com/?q=${latestLocation.latitude},${latestLocation.longitude}&z=16`
    : null;

  return (
    <DashboardLayout title="GPS & Geocercas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
              Rastreo GPS & Geocercas
            </h1>
            <p className="text-muted-foreground mt-1">Ubicación en tiempo real y zonas seguras corporativas</p>
          </div>
          <Navigation className="w-12 h-12 text-emerald-500 opacity-70" />
        </div>

        {/* Device Selector */}
        <Card className="border-accent/20 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  value={selectedDeviceId?.toString() ?? ""}
                  onValueChange={(v) => setSelectedDeviceId(Number(v))}
                >
                  <SelectTrigger className="bg-secondary/50 border-accent/20">
                    <SelectValue placeholder="Selecciona un dispositivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(devices as any[]).map((d: any) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.deviceName} — {d.model ?? "Desconocido"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchLocation()}
                disabled={!selectedDeviceId}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedDeviceId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Location info */}
            <div className="lg:col-span-1 space-y-4">
              {/* Current Location Card */}
              <Card className="border-emerald-200/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                    <Crosshair className="w-4 h-4" />
                    Ubicación Actual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {latestLocation ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                          <p className="text-[10px] text-emerald-600 font-bold uppercase">Latitud</p>
                          <p className="font-mono font-bold text-emerald-900 text-xs mt-0.5">{latestLocation.latitude}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                          <p className="text-[10px] text-emerald-600 font-bold uppercase">Longitud</p>
                          <p className="font-mono font-bold text-emerald-900 text-xs mt-0.5">{latestLocation.longitude}</p>
                        </div>
                      </div>
                      {latestLocation.address && (
                        <div className="bg-secondary/30 rounded-xl p-3 border border-accent/10">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Dirección</p>
                          <p className="text-sm font-medium mt-0.5">{latestLocation.address}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(latestLocation.timestamp), { addSuffix: true, locale: es })}
                        </div>
                        {latestLocation.accuracy && (
                          <div className="flex items-center gap-1">
                            <Signal className="w-3 h-3" />
                            ±{latestLocation.accuracy}m
                          </div>
                        )}
                      </div>
                      {googleMapsUrl && (
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-full"
                        >
                          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm">
                            <MapPin className="w-4 h-4 mr-2" />
                            Ver en Google Maps
                          </Button>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-sm">Sin datos de ubicación</p>
                      <p className="text-xs mt-1">El APK enviará la ubicación automáticamente</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Location History */}
              <Card className="border-accent/20 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Historial GPS
                  </CardTitle>
                  <CardDescription>{(locationHistory as any[]).length} registros recientes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                    {(locationHistory as any[]).slice(0, 20).map((loc: any, i: number) => (
                      <div key={loc.id ?? i} className="flex items-center justify-between py-1.5 border-b border-accent/10 last:border-0">
                        <span className="text-xs font-mono text-muted-foreground">
                          {loc.latitude}, {loc.longitude}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    ))}
                    {(locationHistory as any[]).length === 0 && (
                      <p className="text-sm text-center text-muted-foreground py-4">Sin historial</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column: Geofences */}
            <div className="lg:col-span-2 space-y-4">
              {/* Geofences list */}
              <Card className="border-accent/20 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Geocercas Configuradas
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setShowAddFence(!showAddFence)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Nueva Geocerca
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Add Geofence Form */}
                  {showAddFence && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                      <p className="text-sm font-bold text-emerald-800">Nueva Geocerca</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Nombre (ej: Oficina Central)"
                          value={newFence.name}
                          onChange={(e) => setNewFence({ ...newFence, name: e.target.value })}
                          className="bg-white text-sm col-span-2"
                        />
                        <Input
                          placeholder="Latitud (ej: 4.6097)"
                          value={newFence.latitude}
                          onChange={(e) => setNewFence({ ...newFence, latitude: e.target.value })}
                          className="bg-white text-sm"
                        />
                        <Input
                          placeholder="Longitud (ej: -74.0817)"
                          value={newFence.longitude}
                          onChange={(e) => setNewFence({ ...newFence, longitude: e.target.value })}
                          className="bg-white text-sm"
                        />
                        <Input
                          placeholder="Radio en metros"
                          value={newFence.radius}
                          onChange={(e) => setNewFence({ ...newFence, radius: e.target.value })}
                          className="bg-white text-sm"
                        />
                      </div>
                      <div className="flex gap-4 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Switch
                            checked={newFence.alertOnEntry}
                            onCheckedChange={(v) => setNewFence({ ...newFence, alertOnEntry: v })}
                          />
                          Alerta al entrar
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Switch
                            checked={newFence.alertOnExit}
                            onCheckedChange={(v) => setNewFence({ ...newFence, alertOnExit: v })}
                          />
                          Alerta al salir
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() =>
                            createGeofence.mutate({
                              deviceId: selectedDeviceId,
                              ...newFence,
                            })
                          }
                          disabled={createGeofence.isPending}
                        >
                          Guardar Geocerca
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAddFence(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Geofence items */}
                  {(geofences as any[]).length === 0 && !showAddFence ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No hay geocercas configuradas</p>
                    </div>
                  ) : (
                    (geofences as any[]).map((fence: any) => (
                      <div
                        key={fence.id}
                        className="flex items-center justify-between p-4 bg-secondary/20 border border-accent/10 rounded-2xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${fence.isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                          <div>
                            <p className="font-bold text-sm text-foreground">{fence.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {fence.latitude}, {fence.longitude} — Radio: {fence.radius}m
                            </p>
                            <div className="flex gap-2 mt-1">
                              {fence.alertOnEntry && <Badge variant="outline" className="text-[9px] border-emerald-200 text-emerald-700">Entrada</Badge>}
                              {fence.alertOnExit && <Badge variant="outline" className="text-[9px] border-amber-200 text-amber-700">Salida</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={fence.isActive}
                            onCheckedChange={(v) => toggleGeofence.mutate({ id: fence.id, isActive: v })}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => deleteGeofence.mutate({ id: fence.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Geofence Events */}
              <Card className="border-accent/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Eventos de Geocerca Recientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(geofenceEvents as any[]).length === 0 ? (
                      <p className="text-sm text-center text-muted-foreground py-4">Sin eventos registrados</p>
                    ) : (
                      (geofenceEvents as any[]).map((ev: any) => (
                        <div key={ev.id} className="flex items-center justify-between py-2 border-b border-accent/10 last:border-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={ev.eventType === "entry"
                                ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                                : "text-amber-700 border-amber-200 bg-amber-50"}
                            >
                              {ev.eventType === "entry" ? "▶ Entrada" : "◀ Salida"}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ev.recordedAt), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!selectedDeviceId && (
          <Card className="border-dashed border-accent/20 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center py-16">
                <Navigation className="w-16 h-16 mx-auto mb-4 text-emerald-200" />
                <h3 className="text-xl font-bold text-foreground">Selecciona un dispositivo</h3>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                  Elige un dispositivo del selector superior para ver su ubicación GPS en tiempo real y gestionar sus geocercas corporativas.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
