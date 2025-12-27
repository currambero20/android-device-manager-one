import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Smartphone,
  Lock,
  Trash2,
  Monitor,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Device {
  id: number;
  deviceName: string;
  status: "online" | "offline";
  battery: number;
  signal: number;
}

interface Command {
  commandId: string;
  type: string;
  status: "pending" | "sent" | "executing" | "success" | "failed";
  createdAt: Date;
  result?: unknown;
}

export default function RemoteControl() {
  const { user } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const [commandPayload, setCommandPayload] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Mock devices
  const devices: Device[] = [
    {
      id: 1,
      deviceName: "Samsung Galaxy S21",
      status: "online",
      battery: 85,
      signal: 4,
    },
    {
      id: 2,
      deviceName: "iPhone 13 Pro",
      status: "online",
      battery: 45,
      signal: 3,
    },
    {
      id: 3,
      deviceName: "Pixel 6",
      status: "offline",
      battery: 0,
      signal: 0,
    },
  ];

  const commandTypes = [
    { value: "screenshot", label: "📸 Capturar Pantalla", dangerous: false },
    { value: "lock_device", label: "🔒 Bloquear Dispositivo", dangerous: false },
    { value: "unlock_device", label: "🔓 Desbloquear Dispositivo", dangerous: false },
    { value: "ring_alarm", label: "🔔 Sonar Alarma", dangerous: false },
    { value: "disable_wifi", label: "📡 Desactivar WiFi", dangerous: false },
    { value: "enable_wifi", label: "📡 Activar WiFi", dangerous: false },
    { value: "send_sms", label: "💬 Enviar SMS", dangerous: false },
    { value: "make_call", label: "☎️ Realizar Llamada", dangerous: false },
    { value: "shell_command", label: "⌨️ Comando Shell", dangerous: false },
    { value: "wipe_data", label: "🗑️ Borrar Datos", dangerous: true },
    { value: "factory_reset", label: "⚙️ Restaurar Fábrica", dangerous: true },
    { value: "reboot", label: "🔄 Reiniciar", dangerous: true },
  ];

  const handleSendCommand = async (commandType: string) => {
    if (!selectedDevice) {
      toast.error("Selecciona un dispositivo");
      return;
    }

    const isDangerous = commandTypes.find((c) => c.value === commandType)?.dangerous;

    if (isDangerous) {
      setSelectedCommand(commandType);
      setShowConfirmation(true);
      return;
    }

    await executeCommand(commandType);
  };

  const executeCommand = async (commandType: string) => {
    if (!selectedDevice) return;

    try {
      setIsLoading(true);

      // TODO: Call tRPC mutation
      const newCommand: Command = {
        commandId: `cmd-${Date.now()}`,
        type: commandType,
        status: "pending",
        createdAt: new Date(),
      };

      setCommands((prev) => [newCommand, ...prev]);
      toast.success("Comando enviado");

      // Simulate command execution
      setTimeout(() => {
        setCommands((prev) =>
          prev.map((cmd) =>
            cmd.commandId === newCommand.commandId
              ? { ...cmd, status: "success" as const }
              : cmd
          )
        );
      }, 2000);
    } catch (error) {
      toast.error("Error al enviar comando");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 glow-cyan" />
          <h1 className="text-3xl font-bold glow-cyan">Control Remoto</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dispositivos */}
        <div className="lg:col-span-1">
          <Card className="card-neon-cyan">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Dispositivos
              </h2>

              <div className="space-y-2">
                {devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => setSelectedDevice(device)}
                    className={`w-full p-3 rounded border-2 transition text-left ${
                      selectedDevice?.id === device.id
                        ? "border-glow-cyan bg-glow-cyan/10"
                        : "border-border hover:border-glow-cyan"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">{device.deviceName}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          device.status === "online" ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>🔋 Batería: {device.battery}%</div>
                      <div>📶 Señal: {device.signal}/4</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Panel de Control */}
        <div className="lg:col-span-2">
          <Card className="card-neon-magenta">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Comandos Disponibles
              </h2>

              {selectedDevice ? (
                <Tabs defaultValue="control" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="control">Control</TabsTrigger>
                    <TabsTrigger value="history">Historial</TabsTrigger>
                  </TabsList>

                  <TabsContent value="control" className="space-y-3 mt-4">
                    <div className="grid grid-cols-2 gap-2">
                      {commandTypes.map((cmd) => (
                        <Button
                          key={cmd.value}
                          onClick={() => handleSendCommand(cmd.value)}
                          disabled={isLoading || selectedDevice.status === "offline"}
                          variant={cmd.dangerous ? "destructive" : "default"}
                          className={`h-auto py-2 text-xs ${
                            cmd.dangerous ? "btn-neon-red" : "btn-neon-cyan"
                          }`}
                        >
                          {cmd.label}
                        </Button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-2 mt-4">
                    {commands.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Sin comandos ejecutados
                      </p>
                    ) : (
                      commands.map((cmd) => (
                        <div
                          key={cmd.commandId}
                          className="flex items-center justify-between p-3 bg-accent/10 rounded border border-border"
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(cmd.status)}
                            <div className="text-sm">
                              <p className="font-bold capitalize">{cmd.type.replace(/_/g, " ")}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(cmd.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded ${
                              cmd.status === "success"
                                ? "bg-green-500/20 text-green-400"
                                : cmd.status === "failed"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {cmd.status}
                          </span>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Selecciona un dispositivo para enviar comandos
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmación de Comando Peligroso */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="border-2 border-red-500/50">
          <AlertDialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            Operación Peligrosa
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta operación no se puede deshacer. ¿Estás seguro de que deseas continuar?
          </AlertDialogDescription>
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-sm">
            <p className="font-bold text-red-500 mb-1">Advertencia:</p>
            <p className="text-muted-foreground">
              {selectedCommand === "wipe_data" && "Se borrarán todos los datos del dispositivo"}
              {selectedCommand === "factory_reset" &&
                "El dispositivo se restaurará a su estado de fábrica"}
              {selectedCommand === "reboot" && "El dispositivo se reiniciará"}
            </p>
          </div>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedCommand) {
                  executeCommand(selectedCommand);
                }
                setShowConfirmation(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
