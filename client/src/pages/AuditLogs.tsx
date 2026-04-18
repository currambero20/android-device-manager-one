// @ts-nocheck
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Filter,
  X,
  Clock,
  User,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Search,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [limit, setLimit] = useState(50);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: logs, isLoading, refetch } = trpc.auditLogs.getAll.useQuery({ limit });
  const auditLogs: any[] = logs || [];

  const deleteLogsMutation = trpc.auditLogs.deleteAll.useMutation({
    onSuccess: () => {
      toast.success("Historial de auditoría eliminado correctamente.");
      setIsDeleting(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar el historial.");
      setIsDeleting(false);
    }
  });

  const handleDeleteAllLogs = () => {
    if (window.confirm("¿Estás súper seguro de que quieres eliminar TODO el historial de auditoría? Esta acción no se puede deshacer.")) {
      setIsDeleting(true);
      deleteLogsMutation.mutate();
    }
  };

  const actionTypes = [
    { value: "user_login", label: "Inicio de Sesión" },
    { value: "user_logout", label: "Cierre de Sesión" },
    { value: "user_created", label: "Usuario Creado" },
    { value: "user_updated", label: "Usuario Actualizado" },
    { value: "user_deleted", label: "Usuario Eliminado" },
    { value: "permission_granted", label: "Permiso Concedido" },
    { value: "permission_revoked", label: "Permiso Revocado" },
    { value: "device_added", label: "Dispositivo Agregado" },
    { value: "device_removed", label: "Dispositivo Eliminado" },
    { value: "device_monitored", label: "Dispositivo Monitoreado" },
    { value: "data_accessed", label: "Datos Accedidos" },
    { value: "data_exported", label: "Datos Exportados" },
    { value: "settings_changed", label: "Configuración Cambiada" },
    { value: "security_event", label: "Evento de Seguridad" },
  ];

  const filteredLogs = auditLogs.filter((log: any) => {
    if (!log || !log.action) return false;
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesActionType = !actionTypeFilter || log.actionType === actionTypeFilter;
    const matchesStatus = !statusFilter || log.status === statusFilter;
    return matchesSearch && matchesActionType && matchesStatus;
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "user_login":
      case "user_logout":
        return <User className="w-4 h-4 text-cyan-500" />;
      case "device_added":
      case "device_removed":
      case "device_monitored":
        return <Smartphone className="w-4 h-4 text-violet-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleExportLogs = () => {
    const csv = [
      ["Fecha", "ID Usuario", "ID Dispositivo", "Acción", "Tipo de Acción", "Estado", "Detalles"],
      ...filteredLogs.map((log: any) => [
        log.timestamp ? format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss") : "N/A",
        log.userId || "",
        log.deviceId || "",
        log.action,
        log.actionType,
        log.status,
        JSON.stringify(log.details || {}),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registros-auditoria-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <DashboardLayout title="Registros de Auditoría">
      <div className="cyber-scanline" />
      <div className="space-y-8 relative z-10">
        {/* Encabezado con estadísticas rápidas */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-cyan-500/10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase gradient-text flex items-center gap-3">
              <FileText className="w-10 h-10 text-cyan-400" />
              Caja Negra de Seguridad
            </h1>
            <p className="text-cyan-500/60 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic italic">Registro de Eventos Críticos del Sistema</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={handleDeleteAllLogs} disabled={isDeleting} className="btn-neon-rose h-12 px-6 rounded-xl border border-rose-500/20 text-rose-500 font-bold uppercase tracking-widest text-[10px]">
              <Trash2 className={`w-5 h-5 mr-3 ${isDeleting ? 'animate-bounce' : ''}`} />
              Purgar Historial
            </Button>
            <Button variant="ghost" onClick={() => refetch()} className="btn-neon-cyan h-12 px-6 rounded-xl border border-cyan-500/20 text-cyan-400 font-bold uppercase tracking-widest text-[10px]">
              <RefreshCw className={`w-5 h-5 mr-3 ${isLoading ? 'animate-spin' : ''}`} />
              Sincronización
            </Button>
            <Button onClick={handleExportLogs} className="btn-neon-cyan h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]">
              <Download className="w-5 h-5 mr-3" />
              Download_Log
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="glass-panel border-cyan-500/10 shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <Filter className="w-6 h-6 text-cyan-500/50" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100 italic">Parámetros de Búsqueda</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5">
              <label className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest mb-3 block ml-1">
                Firma_Identidad
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-700" />
                <Input
                  placeholder="ACCIÓN, DETALLES, USUARIO_ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-neon h-12 pl-12"
                />
              </div>
            </div>
            
            <div className="md:col-span-3">
              <label className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest mb-3 block ml-1">
                Categoría_Evento
              </label>
              <Select value={actionTypeFilter || "all"} onValueChange={(val) => setActionTypeFilter(val === "all" ? "" : val)}>
                <SelectTrigger className="input-neon h-12 font-bold uppercase tracking-widest text-[10px]">
                  <SelectValue placeholder="Protocolo" />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-cyan-500/30 text-cyan-100">
                  <SelectItem value="all" className="focus:bg-cyan-500/20">TOTAL_HISTORY</SelectItem>
                  {actionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="focus:bg-cyan-500/20">
                      {type.label.toUpperCase().replace(/ /g, "_")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest mb-3 block ml-1">
                Response_Status
              </label>
              <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
                <SelectTrigger className="input-neon h-12 font-bold uppercase tracking-widest text-[10px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-cyan-500/30 text-cyan-100">
                  <SelectItem value="all" className="focus:bg-cyan-500/20">BOTH</SelectItem>
                  <SelectItem value="success" className="focus:bg-cyan-500/20 text-cyan-400">SUCCESS</SelectItem>
                  <SelectItem value="failure" className="focus:bg-cyan-500/20 text-rose-400">FAILURE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setActionTypeFilter("");
                  setStatusFilter("");
                }}
                variant="ghost"
                className="w-full text-cyan-900 hover:text-rose-500 hover:bg-rose-500/10 font-black h-12 uppercase tracking-widest text-[10px] rounded-xl border border-transparent hover:border-rose-500/30 transition-all"
              >
                <X className="w-4 h-4 mr-2" />
                LIMPIAR
              </Button>
            </div>
          </div>
        </div>

        {/* Tabla de Registros */}
        <div className="glass-panel border-cyan-500/10 shadow-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-32 text-center flex flex-col items-center">
              <RefreshCw className="w-12 h-12 animate-spin text-cyan-500/20 mb-6" />
              <p className="text-cyan-900 font-black uppercase tracking-[0.3em]">Cifrando entrada de datos...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-32 text-center">
              <Search className="w-16 h-16 text-cyan-900/20 mx-auto mb-6" />
              <h4 className="font-black text-cyan-100 uppercase tracking-widest italic mb-2">Logs Vacíos</h4>
              <p className="text-[10px] text-cyan-900 font-bold uppercase tracking-widest max-w-xs mx-auto">No se encontraron huellas digitales bajo los parámetros especificados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-cyan-500/5">
                  <TableRow className="border-b border-cyan-500/10 h-16">
                    <TableHead className="w-[180px] text-[10px] font-black uppercase text-cyan-500/70 tracking-widest pl-8">Timestamp_UTC</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-cyan-500/70 tracking-widest">Acción_Identificada</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-cyan-500/70 tracking-widest">Protocolo</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-cyan-500/70 tracking-widest">Firmado_Por</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-cyan-500/70 tracking-widest">Target_Device</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-cyan-500/70 tracking-widest">Integridad</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-cyan-500/70 tracking-widest text-right pr-8">Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="group border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-all duration-300 h-16"
                    >
                      <TableCell className="text-[10px] font-bold text-cyan-100/40 pl-8">
                        <div className="flex items-center gap-3">
                          <Clock className="w-3.5 h-3.5 text-cyan-700" />
                          {log.timestamp ? format(new Date(log.timestamp), "MMM dd, HH:mm:ss", { locale: es }).toUpperCase() : "NULL"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 font-black text-cyan-100 group-hover:text-cyan-400 transition-colors uppercase tracking-tight text-xs">
                          <div className="p-2 bg-cyan-500/5 rounded-lg border border-cyan-500/10">
                            {getActionIcon(log.actionType)}
                          </div>
                          {log.action}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-3 py-1 rounded-lg bg-black/40 border border-cyan-500/10 text-[9px] font-black text-cyan-700 uppercase tracking-widest group-hover:border-cyan-500/30 transition-all">
                          {log.actionType.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.userId ? (
                          <div className="flex items-center gap-3 text-[10px] text-cyan-100 font-bold uppercase italic">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]">
                              <User className="w-4 h-4" />
                            </div>
                            OP#{log.userId}
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-cyan-900 uppercase italic tracking-widest pl-2">SYSTEM_CORE</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.deviceId ? (
                          <div className="flex items-center gap-3 text-[10px] text-cyan-500 font-bold uppercase tracking-widest italic group-hover:text-cyan-300 transition-colors">
                            <Smartphone className="w-4 h-4 text-fuchsia-500/50" />
                            DEV#{log.deviceId}
                          </div>
                        ) : (
                          <span className="text-cyan-900/30 font-black tracking-widest ml-2">---</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {log.status === "success" ? (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Validado
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Anomolía
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        {log.details ? (
                          <div className="inline-block p-2 bg-black/60 rounded-xl border border-cyan-500/5 text-[9px] font-mono text-cyan-900 max-w-[200px] truncate group-hover:text-cyan-500 transition-all group-hover:border-cyan-500/20">
                            {JSON.stringify(log.details)}
                          </div>
                        ) : (
                          <span className="text-cyan-900/20">---</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Load More */}
        {(logs?.length || 0) >= limit && (
          <div className="flex justify-center py-8">
            <Button
              onClick={() => setLimit(limit + 50)}
              variant="outline"
              className="btn-neon-cyan h-14 px-12 rounded-2xl border border-cyan-500/20 text-cyan-400 font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl"
            >
              Cargar Siguiente Bloque
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>

  );
}
