// @ts-nocheck
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  MessageSquare, Phone, Users, Camera, Vibrate, Lock,
  Mic, RefreshCw, Send, Download, PhoneIncoming, PhoneMissed,
  PhoneOutgoing, User, ShieldAlert, Search, ChevronRight
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts: number | string) {
  return new Date(ts).toLocaleString("es-ES");
}
function CallIcon({ type }: { type: string }) {
  if (type === "incoming") return <PhoneIncoming className="w-4 h-4 text-green-500" />;
  if (type === "missed") return <PhoneMissed className="w-4 h-4 text-red-500" />;
  return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Communications() {
  const [deviceId, setDeviceId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [smsTo, setSmsTo] = useState("");
  const [smsText, setSmsText] = useState("");
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [liveCalls, setLiveCalls] = useState<any[]>([]);
  const [liveContacts, setLiveContacts] = useState<any[]>([]);
  const [cameraImages, setCameraImages] = useState<any[]>([]);

  const { data: allDevices } = trpc.devices.getMyDevices.useQuery();
  const { joinDevice, leaveDevice, syncDevices, getSms } = useWebSocket();

  // Sync WebSocket data with current device list
  useEffect(() => {
    if (allDevices && allDevices.length > 0) {
      const deviceIds = allDevices.map((d: any) => d.id);
      syncDevices(deviceIds);
    }
  }, [allDevices, syncDevices]);

  // Queries — only run when device is selected
  const { data: smsData, refetch: refSMS, isFetching: fetchingSMS } =
    trpc.communications.getSMS.useQuery({ deviceId: deviceId! }, { enabled: !!deviceId });
  const { data: callsData, refetch: refCalls, isFetching: fetchingCalls } =
    trpc.communications.getCalls.useQuery({ deviceId: deviceId! }, { enabled: !!deviceId });
  const { data: contactsData, refetch: refContacts, isFetching: fetchingContacts } =
    trpc.communications.getContacts.useQuery({ deviceId: deviceId! }, { enabled: !!deviceId });

  const sendSMS = trpc.communications.sendSMS.useMutation({
    onSuccess: () => { toast.success("SMS enviado"); setSmsTo(""); setSmsText(""); },
    onError: (e) => toast.error(e.message),
  });
  const trigCamera = trpc.communications.triggerCamera.useMutation({
    onSuccess: (d) => toast.success(d.message),
    onError: (e) => toast.error(e.message),
  });
  const vibrate = trpc.communications.vibrate.useMutation({
    onSuccess: () => toast.success("Señal de vibración enviada"),
    onError: (e) => toast.error(e.message),
  });
  const lock = trpc.communications.lockDevice.useMutation({
    onSuccess: () => toast.success("Dispositivo bloqueado"),
    onError: (e) => toast.error(e.message),
  });
  const recordMic = trpc.communications.recordMicrophone.useMutation({
    onSuccess: (d) => toast.success(d.message),
    onError: (e) => toast.error(e.message),
  });

  // Use only tRPC data (not duplicated local state)
  const messages = smsData?.messages || [];
  const calls = callsData?.calls || [];
  const contacts = contactsData?.contacts || [];

  // Join/leave device with central WebSocket
  useEffect(() => {
    if (deviceId) {
      joinDevice(deviceId);
    }
    return () => {
      if (deviceId) {
        leaveDevice(deviceId);
      }
    };
  }, [deviceId, joinDevice, leaveDevice]);

  const filtered = (arr: any[], fields: string[]) =>
    arr.filter(item => fields.some(f => String(item[f] || "").toLowerCase().includes(search.toLowerCase())));

  // Export contacts to CSV
  function exportCSV() {
    const rows = [["Nombre", "Teléfono"], ...contacts.map((c: any) => [c.name, c.phone || c.phoneNumber])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `contacts_${deviceId}_${Date.now()}.csv`;
    a.click();
  }

  return (
    <DashboardLayout title="Comunicaciones MDM">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-700">
              Centro de Comunicaciones
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">SMS, Llamadas, Contactos y Control Táctil Corporativo</p>
          </div>
          <MessageSquare className="w-12 h-12 text-violet-500 opacity-20" />
        </div>

        {/* Device + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-accent/20 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-violet-600" /> Dispositivo MDM</CardTitle></CardHeader>
            <CardContent>
              <Select value={deviceId?.toString() ?? ""} onValueChange={v => { setDeviceId(Number(v)); }}>
                <SelectTrigger className="bg-secondary/50 border-accent/20"><SelectValue placeholder="Seleccionar dispositivo..." /></SelectTrigger>
                <SelectContent>{(allDevices || []).map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.deviceName}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>

          {deviceId && (
            <Card className="lg:col-span-2 border-accent/20 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock className="w-4 h-4 text-rose-600" /> Acciones Rápidas MDM</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => vibrate.mutate({ deviceId })}>
                    <Vibrate className="w-4 h-4 mr-1" /> Vibrar
                  </Button>
                  <Button size="sm" variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50" onClick={() => lock.mutate({ deviceId })}>
                    <Lock className="w-4 h-4 mr-1" /> Bloquear
                  </Button>
                  <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => recordMic.mutate({ deviceId, seconds: 60 })}>
                    <Mic className="w-4 h-4 mr-1" /> Grabar Mic (1m)
                  </Button>
                  <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => trigCamera.mutate({ deviceId, camera: "back" })}>
                    <Camera className="w-4 h-4 mr-1" /> Cámara Trasera
                  </Button>
                  <Button size="sm" variant="outline" className="border-pink-300 text-pink-700 hover:bg-pink-50" onClick={() => trigCamera.mutate({ deviceId, camera: "front" })}>
                    <Camera className="w-4 h-4 mr-1" /> Cámara Delantera
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {!deviceId ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-2xl">
            <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
            <p className="font-medium">Selecciona un dispositivo para comenzar</p>
          </div>
        ) : (
          <Tabs defaultValue="sms">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="sms" className="gap-2"><MessageSquare className="w-4 h-4" /> SMS</TabsTrigger>
                <TabsTrigger value="calls" className="gap-2"><Phone className="w-4 h-4" /> Llamadas</TabsTrigger>
                <TabsTrigger value="contacts" className="gap-2"><Users className="w-4 h-4" /> Contactos</TabsTrigger>
                <TabsTrigger value="camera" className="gap-2"><Camera className="w-4 h-4" /> Cámara</TabsTrigger>
              </TabsList>
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 w-40 pl-8 text-xs bg-white/50 border-accent/10" />
              </div>
            </div>

            {/* ─ SMS ─ */}
            <TabsContent value="sms">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-accent/20 h-[480px] flex flex-col">
                  <CardHeader className="pb-2 flex-row items-center justify-between">
                    <CardTitle className="text-sm">Bandeja SMS</CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => refSMS()} disabled={fetchingSMS} className="h-7 w-7 p-0">
                      <RefreshCw className={`w-3 h-3 ${fetchingSMS ? "animate-spin" : ""}`} />
                    </Button>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-0">
                    {filtered(messages, ["phoneNumber", "message"]).length === 0
                      ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sin mensajes</div>
                      : filtered(messages, ["phoneNumber", "message"]).map((m, i) => (
                          <div key={i} className={`px-4 py-3 border-b border-accent/5 flex gap-3 hover:bg-accent/5 ${m.direction === "outgoing" ? "flex-row-reverse" : ""}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.direction === "outgoing" ? "bg-violet-500 text-white" : "bg-secondary"}`}>
                              <User className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-xs text-foreground">{m.phoneNumber || "Desconocido"}</span>
                                <Badge variant="outline" className="text-[9px] h-4">{m.direction === "outgoing" ? "Enviado" : "Recibido"}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground break-words">{m.message}</p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDate(m.timestamp)}</p>
                            </div>
                          </div>
                        ))}
                  </CardContent>
                </Card>

                <Card className="border-accent/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Send className="w-4 h-4" /> Enviar SMS</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Input placeholder="Número destino (+1234567890)" value={smsTo} onChange={e => setSmsTo(e.target.value)} className="text-sm" />
                    <textarea
                      className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="Escribe el mensaje..."
                      value={smsText}
                      onChange={e => setSmsText(e.target.value)}
                    />
                    <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled={!smsTo || !smsText || sendSMS.isPending}
                      onClick={() => sendSMS.mutate({ deviceId, to: smsTo, message: smsText })}>
                      <Send className="w-4 h-4 mr-2" /> {sendSMS.isPending ? "Enviando..." : "Enviar SMS"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─ CALLS ─ */}
            <TabsContent value="calls">
              <Card className="border-accent/20">
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Historial de Llamadas</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => refCalls()} disabled={fetchingCalls} className="h-7 w-7 p-0">
                    <RefreshCw className={`w-3 h-3 ${fetchingCalls ? "animate-spin" : ""}`} />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[420px] overflow-y-auto">
                    {filtered(calls, ["number", "name", "type"]).length === 0
                      ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sin registros de llamadas</div>
                      : filtered(calls, ["number", "name", "type"]).map((c, i) => (
                          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-accent/5 hover:bg-accent/5">
                            <CallIcon type={c.type} />
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{c.name || c.number}</p>
                              <p className="text-xs text-muted-foreground">{c.number}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">{formatDate(c.timestamp || c.date)}</p>
                              {c.duration && <p className="text-xs text-muted-foreground">{Math.round(c.duration / 60)}m {c.duration % 60}s</p>}
                            </div>
                            <Badge variant="outline" className={`text-[9px] ${c.type === "missed" ? "border-red-300 text-red-600" : c.type === "incoming" ? "border-green-300 text-green-600" : "border-blue-300 text-blue-600"}`}>
                              {c.type === "missed" ? "Perdida" : c.type === "incoming" ? "Entrante" : "Saliente"}
                            </Badge>
                          </div>
                        ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─ CONTACTS ─ */}
            <TabsContent value="contacts">
              <Card className="border-accent/20">
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Agenda de Contactos</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={exportCSV} className="h-7 text-xs gap-1"><Download className="w-3 h-3" /> CSV</Button>
                    <Button size="sm" variant="ghost" onClick={() => refContacts()} disabled={fetchingContacts} className="h-7 w-7 p-0">
                      <RefreshCw className={`w-3 h-3 ${fetchingContacts ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[420px] overflow-y-auto">
                    {filtered(contacts, ["name", "phone", "phoneNumber", "email"]).length === 0
                      ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sin contactos</div>
                      : filtered(contacts, ["name", "phone", "phoneNumber", "email"]).map((c, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-accent/5 hover:bg-accent/5 group">
                            <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                              {(c.name || "?")[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.phone || c.phoneNumber}</p>
                              {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                          </div>
                        ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─ CAMERA ─ */}
            <TabsContent value="camera">
              <Card className="border-accent/20">
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Capturas de Cámara</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => trigCamera.mutate({ deviceId, camera: "back" })}>
                      <Camera className="w-4 h-4 mr-1" /> Disparar Trasera
                    </Button>
                    <Button size="sm" variant="outline" className="border-pink-300 text-pink-700 hover:bg-pink-50" onClick={() => trigCamera.mutate({ deviceId, camera: "front" })}>
                      <Camera className="w-4 h-4 mr-1" /> Disparar Delantera
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {cameraImages.length === 0
                    ? (
                        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                          <Camera className="w-12 h-12 mb-3 opacity-10" />
                          <p className="text-sm font-medium">Sin capturas aún</p>
                          <p className="text-xs mt-1">Presiona "Disparar" para tomar una foto remota</p>
                        </div>
                      )
                    : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {cameraImages.map((img, i) => (
                            <div key={i} className="relative rounded-xl overflow-hidden border border-accent/10 group">
                              <img src={img.url} alt="Captura" className="w-full aspect-video object-cover" onError={e => (e.currentTarget.src = "/placeholder-camera.jpg")} />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                <p>{img.fileName}</p>
                                <p>{formatDate(img.timestamp)}</p>
                              </div>
                              <a href={img.url} download={img.fileName} className="absolute top-2 right-2 bg-black/60 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                <Download className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
