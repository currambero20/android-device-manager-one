// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertCircle, CheckCircle2,
  RefreshCw, Lock, Smartphone, AlertTriangle, XCircle, TrendingUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-500" : "text-red-600";
  const ring =
    score >= 80 ? "border-emerald-500" : score >= 50 ? "border-amber-500" : "border-red-500";
  return (
    <div className={`w-14 h-14 rounded-full border-4 ${ring} flex items-center justify-center`}>
      <span className={`text-lg font-black ${color}`}>{score}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "compliant")
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">✓ Cumple</Badge>;
  if (status === "partial")
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200">⚠ Parcial</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200">✗ No Cumple</Badge>;
}

export default function ComplianceDashboard() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [lostModeMsg, setLostModeMsg] = useState("Este dispositivo fue reportado como pérdido. Llame al número de contacto corporativo.");
  const [lostModePhone, setLostModePhone] = useState("");

  const { data: devices = [] } = trpc.devices.getAll.useQuery() as any;
  const { data: fleet, refetch: refetchFleet } = trpc.compliance.getFleetCompliance.useQuery();
  const { data: deviceCompliance } = trpc.compliance.getDeviceCompliance.useQuery(
    { deviceId: selectedDeviceId! },
    { enabled: !!selectedDeviceId }
  );
  const { data: auditSummary = [] } = trpc.compliance.getAuditSummary.useQuery({ days: 7 });
  const { data: dlpViolations = [] } = trpc.compliance.getDlpViolations.useQuery({ days: 30 });

  const setLostMode = trpc.compliance.setLostMode.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (e) => toast.error(e.message),
  });

  const severityIcon = (severity: string) => {
    if (severity === "critical") return <XCircle className="w-4 h-4 text-red-600" />;
    if (severity === "high") return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    if (severity === "medium") return <AlertCircle className="w-4 h-4 text-amber-500" />;
    return <AlertCircle className="w-4 h-4 text-blue-400" />;
  };

  return (
    <DashboardLayout title="Compliance & DLP">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-700">
              Compliance & DLP
            </h1>
            <p className="text-muted-foreground mt-1">Cumplimiento corporativo, pérdida de datos y modo perdido</p>
          </div>
          <ShieldCheck className="w-12 h-12 text-violet-400 opacity-70" />
        </div>

        {/* Fleet Summary */}
        {fleet && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total dispositivos", value: fleet.total, icon: Smartphone, color: "text-slate-700", bg: "bg-slate-50" },
              { label: "Cumplen políticas", value: fleet.compliant, icon: ShieldCheck, color: "text-emerald-700", bg: "bg-emerald-50" },
              { label: "Cumplimiento parcial", value: fleet.partial, icon: ShieldAlert, color: "text-amber-700", bg: "bg-amber-50" },
              { label: "No cumplen", value: fleet.nonCompliant, icon: ShieldX, color: "text-red-700", bg: "bg-red-50" },
            ].map((stat) => (
              <Card key={stat.label} className="border-accent/20 shadow-sm">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-black text-foreground mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 ${stat.bg} rounded-full flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Fleet device list */}
        {fleet && (
          <Card className="border-accent/20 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-violet-500" />
                  Diagnóstico por Dispositivo
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => refetchFleet()} className="border-violet-200 text-violet-700">
                  <RefreshCw className="w-3 h-3 mr-1" /> Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fleet.devices.map((d: any) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-accent/10 hover:border-violet-200 transition-all cursor-pointer"
                    onClick={() => setSelectedDeviceId(d.id)}
                  >
                    <div className="flex items-center gap-3">
                      <ScoreCircle score={d.complianceScore} />
                      <div>
                        <p className="font-bold text-sm">{d.name}</p>
                        <p className="text-[10px] text-muted-foreground">{d.model ?? "—"} · Android {d.androidVersion ?? "?"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={d.status === "online" ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-gray-500 border-gray-200 bg-gray-50"}
                      >
                        {d.status}
                      </Badge>
                      <StatusBadge status={d.complianceStatus} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Compliance Detail */}
          <Card className="border-accent/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-violet-500" />
                Verificación de Políticas
              </CardTitle>
              <CardDescription>
                {selectedDeviceId
                  ? "Resultado de checks para el dispositivo seleccionado"
                  : "Selecciona un dispositivo de la lista superior"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deviceCompliance ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 mb-4">
                    <ScoreCircle score={deviceCompliance.score} />
                    <div>
                      <p className="font-bold">{deviceCompliance.deviceName}</p>
                      <StatusBadge status={deviceCompliance.status} />
                    </div>
                  </div>
                  {deviceCompliance.checks.map((check: any) => (
                    <div key={check.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-accent/10">
                      <div className="flex items-center gap-2">
                        {check.pass
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          : severityIcon(check.severity)}
                        <span className="text-sm font-medium">{check.label}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={check.pass
                          ? "text-emerald-700 border-emerald-200 bg-emerald-50 text-[9px]"
                          : "text-red-700 border-red-200 bg-red-50 text-[9px]"}
                      >
                        {check.pass ? "OK" : check.severity.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Selecciona un dispositivo</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lost Mode */}
          <Card className="border-red-200/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <Lock className="w-5 h-5" />
                Modo Perdido (Lost Mode)
              </CardTitle>
              <CardDescription>
                Bloquea el dispositivo y muestra mensaje de contacto corporativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedDeviceId?.toString() ?? ""}
                onValueChange={(v) => setSelectedDeviceId(Number(v))}
              >
                <SelectTrigger className="bg-secondary/50 border-accent/20">
                  <SelectValue placeholder="Seleccionar dispositivo..." />
                </SelectTrigger>
                <SelectContent>
                  {(devices as any[]).map((d: any) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.deviceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Mensaje para la pantalla de bloqueo"
                value={lostModeMsg}
                onChange={(e) => setLostModeMsg(e.target.value)}
              />
              <Input
                placeholder="Teléfono de contacto corporativo"
                value={lostModePhone}
                onChange={(e) => setLostModePhone(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  disabled={!selectedDeviceId || setLostMode.isPending}
                  onClick={() =>
                    setLostMode.mutate({
                      deviceId: selectedDeviceId!,
                      enabled: true,
                      message: lostModeMsg,
                      contactPhone: lostModePhone,
                    })
                  }
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Activar Modo Perdido
                </Button>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  disabled={!selectedDeviceId || setLostMode.isPending}
                  onClick={() =>
                    setLostMode.mutate({
                      deviceId: selectedDeviceId!,
                      enabled: false,
                    })
                  }
                >
                  Desactivar
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                ⚠️ La activación enviará el comando MDM al dispositivo via WebSocket. El dispositivo debe estar online.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* DLP Violations */}
        <Card className="border-accent/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Violaciones DLP (últimos 30 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(dlpViolations as any[]).length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">No hay violaciones registradas</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(dlpViolations as any[]).map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-red-800">{v.action}</p>
                      <p className="text-[10px] text-red-600">{v.actionType}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(v.timestamp), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
