import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  MapPin,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Navigation,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface Geofence {
  id: number;
  deviceId: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  radius: string | null;
  isActive: boolean;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface GeofenceEvent {
  id: number;
  geofenceId: number;
  deviceId: number;
  eventType: "entry" | "exit";
  timestamp: Date;
  latitude: string | null;
  longitude: string | null;
  recordedAt: Date;
}

export default function Geofencing() {
  const { user } = useAuth();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    deviceId: 1,
    name: "",
    latitude: "",
    longitude: "",
    radius: "500",
  });

  // Fetch geofences
  const { data: geofencesData } = trpc.geofencing.getAllGeofences.useQuery();
  const { data: eventsData } = trpc.geofencing.getGeofenceEvents.useQuery(
    selectedGeofence ? { geofenceId: selectedGeofence.id } : { geofenceId: 0 },
    { enabled: !!selectedGeofence }
  );

  useEffect(() => {
    if (geofencesData) {
      setGeofences(geofencesData);
    }
  }, [geofencesData]);

  useEffect(() => {
    if (eventsData) {
      setEvents(eventsData);
    }
  }, [eventsData]);

  const createMutation = trpc.geofencing.createGeofence.useMutation({
    onSuccess: () => {
      toast.success("Geofence creado exitosamente");
      setFormData({ deviceId: 1, name: "", latitude: "", longitude: "", radius: "500" });
      setIsCreating(false);
      // Refetch geofences
      window.location.reload();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.geofencing.deleteGeofence.useMutation({
    onSuccess: () => {
      toast.success("Geofence eliminado");
      setSelectedGeofence(null);
      window.location.reload();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCreateGeofence = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.latitude || !formData.longitude) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    createMutation.mutate({
      deviceId: formData.deviceId,
      name: formData.name,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radius: parseFloat(formData.radius),
    });
  };

  const handleDeleteGeofence = (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este geofence?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getEventColor = (eventType: string) => {
    return eventType === "entry" ? "text-green-400" : "text-red-400";
  };

  const getEventIcon = (eventType: string) => {
    return eventType === "entry" ? (
      <CheckCircle className="w-4 h-4 text-green-400" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-red-400" />
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-2">
              <MapPin className="w-8 h-8" />
              Geofencing
            </h1>
            <p className="text-gray-400 mt-1">Gestiona zonas de geofence y monitorea eventos de entrada/salida</p>
          </div>
          <Button
            onClick={() => setIsCreating(!isCreating)}
            className="bg-gradient-to-r from-purple-600 to-magenta-600 hover:from-purple-700 hover:to-magenta-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Geofence
          </Button>
        </div>

        {/* Create Form */}
        {isCreating && (
          <Card className="border-purple-500/50 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-purple-400">Crear Nuevo Geofence</CardTitle>
              <CardDescription>Define una zona geográfica para monitoreo</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGeofence} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Nombre</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Oficina Principal"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Radio (metros)</Label>
                    <Input
                      type="number"
                      value={formData.radius}
                      onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                      placeholder="500"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Latitud</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="40.7128"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Longitud</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="-74.0060"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    {createMutation.isPending ? "Creando..." : "Crear Geofence"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreating(false)}
                    className="border-gray-700"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="geofences" className="w-full">
          <TabsList className="bg-gray-800 border-b border-gray-700">
            <TabsTrigger value="geofences" className="text-gray-400 data-[state=active]:text-cyan-400">
              Geofences ({geofences.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="text-gray-400 data-[state=active]:text-cyan-400">
              Eventos ({events.length})
            </TabsTrigger>
            <TabsTrigger value="map" className="text-gray-400 data-[state=active]:text-cyan-400">
              Mapa
            </TabsTrigger>
          </TabsList>

          {/* Geofences Tab */}
          <TabsContent value="geofences" className="space-y-4">
            {geofences.length === 0 ? (
              <Card className="border-gray-700 bg-gray-900/50">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-400">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay geofences creados</p>
                    <p className="text-sm mt-1">Crea uno para comenzar a monitorear zonas</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {geofences.map((geofence) => (
                  <Card
                    key={geofence.id}
                    className={`border-2 cursor-pointer transition-all ${
                      selectedGeofence?.id === geofence.id
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-gray-700 hover:border-cyan-500/50"
                    }`}
                    onClick={() => setSelectedGeofence(geofence)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-cyan-400">{geofence.name}</CardTitle>
                          <CardDescription className="text-gray-400">
                            Radio: {geofence.radius}m
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-cyan-400"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-red-400"
                            onClick={() => handleDeleteGeofence(geofence.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Navigation className="w-4 h-4" />
                        <span>
                          {geofence.latitude}, {geofence.longitude}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {geofence.isActive ? (
                          <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Activo
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Inactivo
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            {!selectedGeofence ? (
              <Card className="border-gray-700 bg-gray-900/50">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Selecciona un geofence para ver eventos</p>
                  </div>
                </CardContent>
              </Card>
            ) : events.length === 0 ? (
              <Card className="border-gray-700 bg-gray-900/50">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-400">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay eventos para este geofence</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <Card key={event.id} className="border-gray-700 bg-gray-900/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getEventIcon(event.eventType)}
                          <div>
                            <p className={`font-semibold ${getEventColor(event.eventType)}`}>
                              {event.eventType === "entry" ? "Entrada" : "Salida"}
                            </p>
                            <p className="text-sm text-gray-400">
                              Dispositivo {event.deviceId} • {event.latitude}, {event.longitude}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map">
            <Card className="border-gray-700 bg-gray-900/50">
              <CardContent className="pt-6">
                <div className="bg-gray-800 rounded-lg h-96 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Integración de Google Maps</p>
                    <p className="text-sm mt-1">Visualización de geofences en mapa interactivo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
