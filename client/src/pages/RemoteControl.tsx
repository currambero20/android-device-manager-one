import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Smartphone,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function RemoteControl() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  
  const { data: devices = [], isLoading: isLoadingDevices, refetch: refetchDevices } = trpc.devices.getMyDevices.useQuery();
  const { data: commands = [], isLoading: isLoadingLogs, refetch: refetchLogs } = trpc.auditLogs.getByDevice.useQuery(
    { deviceId: selectedDeviceId || 0 },
    { enabled: !!selectedDeviceId }
  );

  const sendCommandMutation = trpc.devices.sendCommand.useMutation({
    onSuccess: () => {
      toast.success("Comando enviado satisfactoriamente");
      refetchLogs();
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
    },
  });

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  const commandTypes = [
    { value: "screenshot", label: "📸 Captura de Pantalla", dangerous: false },
    { value: "lock_device", label: "🔒 Bloquear Pantalla", dangerous: false },
    { value: "vibrate", label: "📳 Hacer Vibrar", dangerous: false },
    { value: "reboot", label: "🔄 Reiniciar Dispositivo", dangerous: true },
    { value: "wipe_data", label: "🗑️ Borrado de Fábrica", dangerous: true },
    { value: "enable_stealth", label: "👻 Activar Modo Oculto", dangerous: false },
    { value: "disable_stealth", label: "👁️ Desactivar Modo Oculto", dangerous: false },
  ];

  const handleSendCommand = (commandType: string) => {
    if (!selectedDeviceId) return;
    const isDangerous = commandTypes.find(c => c.value === commandType)?.dangerous;
    
    if (isDangerous) {
      setSelectedCommand(commandType);
      setShowConfirmation(true);
      return;
    }
    
    execute(commandType);
  };

  const execute = (commandType: string) => {
    if (!selectedDeviceId) return;
    sendCommandMutation.mutate({
      deviceId: selectedDeviceId,
      command: commandType,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "success": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failure": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout title="Control Remoto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dispositivos Reales */}
        <Card className="card-neon overflow-hidden lg:col-span-1">
          <div className="p-4 border-b border-glow-cyan/20 flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              Dispositivos
            </h2>
            <Button variant="ghost" size="icon" onClick={() => refetchDevices()} disabled={isLoadingDevices}>
              <RefreshCw className={`w-4 h-4 ${isLoadingDevices ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="p-2 max-h-[600px] overflow-y-auto space-y-2">
            {isLoadingDevices && <p className="text-center text-xs py-4">Cargando unidades...</p>}
            {!isLoadingDevices && devices.length === 0 && <p className="text-center text-xs py-4 text-muted-foreground">No hay dispositivos vinculados</p>}
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => setSelectedDeviceId(device.id)}
                className={`w-full p-3 rounded-lg border transition-all text-left ${
                  selectedDeviceId === device.id
                    ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : "border-border hover:border-cyan-500/50 hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm truncate">{device.deviceName}</span>
                  <div className={`w-2 h-2 rounded-full ${device.status === "online" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                </div>
                <div className="text-[10px] text-muted-foreground grid grid-cols-2 gap-1 uppercase tracking-tighter">
                  <span>🔋 {device.batteryLevel ?? "N/A"}%</span>
                  <span className="text-right">OS {device.androidVersion}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Panel de Comandos */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="card-neon-magenta overflow-hidden">
            <div className="p-4 border-b border-glow-magenta/20">
              <h2 className="font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-magenta-400" />
                Acciones de Control
              </h2>
            </div>
            <div className="p-6">
              {!selectedDeviceId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Selecciona un dispositivo para interactuar</p>
                </div>
              ) : (
                <Tabs defaultValue="control">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-accent/20">
                    <TabsTrigger value="control">Comandos</TabsTrigger>
                    <TabsTrigger value="history">Historial Real</TabsTrigger>
                  </TabsList>

                  <TabsContent value="control" className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {commandTypes.map((cmd) => (
                      <Button
                        key={cmd.value}
                        onClick={() => handleSendCommand(cmd.value)}
                        disabled={sendCommandMutation.isPending || selectedDevice?.status === "offline"}
                        variant={cmd.dangerous ? "destructive" : "outline"}
                        className={`h-20 flex-col gap-2 text-[10px] font-bold uppercase transition-all ${
                          cmd.dangerous ? "hover:bg-red-600 hover:border-red-400" : "hover:border-cyan-500 hover:text-cyan-400"
                        }`}
                      >
                        {cmd.label}
                        {selectedDevice?.status === "offline" && <span className="opacity-50 text-[8px]">(Offline)</span>}
                      </Button>
                    ))}
                  </TabsContent>

                  <TabsContent value="history" className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Últimos Registros</span>
                      <Button variant="ghost" size="sm" onClick={() => refetchLogs()} disabled={isLoadingLogs}>
                        <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                    {commands.length === 0 ? (
                      <p className="text-center py-8 text-xs text-muted-foreground">Sin actividad registrada para este dispositivo</p>
                    ) : (
                      commands.map((cmd) => (
                        <div key={cmd.id} className="p-2 bg-accent/5 rounded border border-border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(cmd.status)}
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest">{cmd.action.replace("_", " ")}</p>
                              <p className="text-[9px] text-muted-foreground">{new Date(cmd.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            cmd.status === "success" ? "bg-green-500/20 text-green-400" : 
                            cmd.status === "failure" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {cmd.status === "pending" ? "Pendiente" : cmd.status === "success" ? "Ejecutado" : "Fallido"}
                          </span>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Alerta de Peligro */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="border border-red-500 bg-black/95">
          <AlertDialogTitle className="text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Acción Crítica
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Estás a punto de enviar un comando de alto riesgo: <span className="text-white font-bold underline">{selectedCommand}</span>. 
            Esta acción se ejecutará en cuanto el dispositivo se conecte y podría ser irreversible.
          </AlertDialogDescription>
          <div className="mt-4 flex gap-3">
            <AlertDialogCancel className="flex-1">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { execute(selectedCommand!); setShowConfirmation(false); }}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Confirmar Envío
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
