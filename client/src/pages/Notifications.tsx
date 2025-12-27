import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Bell,
  Volume2,
  Smartphone,
  AlertTriangle,
  MapPin,
  CheckCircle,
  AlertCircle,
  Zap,
  Trash2,
  Settings,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  deviceId?: number;
  geofenceId?: number;
  timestamp: Date;
  read: boolean;
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "geofence_entry",
    "geofence_exit",
    "device_offline",
    "command_executed",
    "security_alert",
  ]);

  // Simulate loading notifications
  useEffect(() => {
    // In a real app, fetch from API
    const mockNotifications: Notification[] = [
      {
        id: "1",
        type: "geofence_entry",
        title: "Entrada a Geofence",
        message: "Dispositivo 1 entró a la zona Oficina Principal",
        deviceId: 1,
        geofenceId: 1,
        timestamp: new Date(Date.now() - 5 * 60000),
        read: false,
      },
      {
        id: "2",
        type: "device_offline",
        title: "Dispositivo Fuera de Línea",
        message: "Samsung Galaxy S21 se desconectó",
        deviceId: 2,
        timestamp: new Date(Date.now() - 15 * 60000),
        read: false,
      },
      {
        id: "3",
        type: "command_executed",
        title: "Comando Ejecutado",
        message: "Comando screenshot en dispositivo 1 ejecutado",
        deviceId: 1,
        timestamp: new Date(Date.now() - 30 * 60000),
        read: true,
      },
    ];
    setNotifications(mockNotifications);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "geofence_entry":
      case "geofence_exit":
        return <MapPin className="w-5 h-5 text-cyan-400" />;
      case "device_online":
      case "device_offline":
        return <Smartphone className="w-5 h-5 text-purple-400" />;
      case "command_executed":
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case "security_alert":
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case "battery_low":
        return <AlertCircle className="w-5 h-5 text-orange-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "geofence_entry":
        return "border-l-4 border-l-green-500";
      case "geofence_exit":
        return "border-l-4 border-l-red-500";
      case "device_offline":
        return "border-l-4 border-l-red-500";
      case "command_executed":
        return "border-l-4 border-l-yellow-500";
      case "security_alert":
        return "border-l-4 border-l-red-500";
      default:
        return "border-l-4 border-l-cyan-500";
    }
  };

  const handlePlaySound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    toast.success("Sonido de notificación reproducido");
  };

  const handleVibrate = () => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
      toast.success("Vibración ejecutada");
    } else {
      toast.error("Vibración no soportada en este dispositivo");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-2">
              <Bell className="w-8 h-8" />
              Notificaciones
            </h1>
            <p className="text-gray-400 mt-1">
              {unreadCount} notificaciones sin leer • Gestiona alertas y preferencias
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="bg-gray-800 border-b border-gray-700">
            <TabsTrigger value="notifications" className="text-gray-400 data-[state=active]:text-cyan-400">
              Notificaciones ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-gray-400 data-[state=active]:text-cyan-400">
              Configuración
            </TabsTrigger>
            <TabsTrigger value="test" className="text-gray-400 data-[state=active]:text-cyan-400">
              Pruebas
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            {notifications.length === 0 ? (
              <Card className="border-gray-700 bg-gray-900/50">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-400">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay notificaciones</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`border-gray-700 bg-gray-900/50 ${getNotificationColor(notification.type)} ${
                      !notification.read ? "ring-1 ring-cyan-500/50" : ""
                    }`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-white">{notification.title}</h3>
                              <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            {notification.deviceId && (
                              <span>Dispositivo {notification.deviceId}</span>
                            )}
                            {notification.geofenceId && (
                              <span>Geofence {notification.geofenceId}</span>
                            )}
                            <span>{new Date(notification.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="border-gray-700 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Preferencias de Notificaciones
                </CardTitle>
                <CardDescription>Personaliza cómo recibes las notificaciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sound Setting */}
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-cyan-400" />
                    <div>
                      <Label className="text-white font-semibold">Sonido de Notificación</Label>
                      <p className="text-sm text-gray-400">Reproducir sonido al recibir alertas</p>
                    </div>
                  </div>
                  <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                </div>

                {/* Vibration Setting */}
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-purple-400" />
                    <div>
                      <Label className="text-white font-semibold">Vibración</Label>
                      <p className="text-sm text-gray-400">Vibrar al recibir notificaciones</p>
                    </div>
                  </div>
                  <Switch checked={vibrationEnabled} onCheckedChange={setVibrationEnabled} />
                </div>

                {/* Notification Types */}
                <div className="space-y-3">
                  <Label className="text-white font-semibold">Tipos de Notificaciones</Label>
                  <div className="space-y-2">
                    {[
                      { id: "geofence_entry", label: "Entrada a Geofence", icon: MapPin },
                      { id: "geofence_exit", label: "Salida de Geofence", icon: MapPin },
                      { id: "device_offline", label: "Dispositivo Fuera de Línea", icon: Smartphone },
                      { id: "command_executed", label: "Comando Ejecutado", icon: Zap },
                      { id: "security_alert", label: "Alerta de Seguridad", icon: AlertTriangle },
                    ].map((type) => (
                      <div key={type.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded border border-gray-700">
                        <input
                          type="checkbox"
                          id={type.id}
                          checked={selectedTypes.includes(type.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTypes([...selectedTypes, type.id]);
                            } else {
                              setSelectedTypes(selectedTypes.filter((t) => t !== type.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 cursor-pointer"
                        />
                        <label htmlFor={type.id} className="flex items-center gap-2 cursor-pointer flex-1">
                          <type.icon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">{type.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
                  Guardar Preferencias
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Tab */}
          <TabsContent value="test" className="space-y-4">
            <Card className="border-gray-700 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="text-cyan-400">Prueba de Notificaciones</CardTitle>
                <CardDescription>Prueba sonidos y vibraciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={handlePlaySound}
                    disabled={!soundEnabled}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Reproducir Sonido
                  </Button>
                  <Button
                    onClick={handleVibrate}
                    disabled={!vibrationEnabled}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Probar Vibración
                  </Button>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400">
                    💡 <strong>Consejo:</strong> Habilita sonido y vibración en las preferencias para recibir
                    alertas completas cuando ocurran eventos importantes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
