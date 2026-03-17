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
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [limit, setLimit] = useState(50);

  const { data: logs, isLoading, refetch } = trpc.auditLogs.getAll.useQuery({ limit });
  const auditLogs: any[] = logs || [];

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
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Encabezado con estadísticas rápidas */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-accent/20 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Seguridad y Auditoría</h1>
            <p className="text-muted-foreground italic">Seguimiento de todas las acciones del sistema</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} className="rounded-full border-slate-200 text-slate-600">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
            <Button onClick={handleExportLogs} className="rounded-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white border border-accent/20 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-700 font-bold">
            <Filter className="w-5 h-5 text-cyan-600" />
            <h3>Filtros de Búsqueda</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                Búsqueda General
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Acción, detalles, usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200 focus:border-cyan-400 focus:ring-cyan-400/20"
                />
              </div>
            </div>
            
            <div className="md:col-span-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                Tipo de Acción
              </label>
              <Select value={actionTypeFilter || "all"} onValueChange={(val) => setActionTypeFilter(val === "all" ? "" : val)}>
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Acciones</SelectItem>
                  {actionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                Estado
              </label>
              <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Cualquiera</SelectItem>
                  <SelectItem value="success">Éxito</SelectItem>
                  <SelectItem value="failure">Error</SelectItem>
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
                className="w-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold"
              >
                <X className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabla de Registros */}
        <div className="bg-white border border-accent/20 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center flex flex-col items-center">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-600/20 mb-4" />
              <p className="text-muted-foreground font-medium">Cargando registros...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center bg-slate-50/30">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h4 className="font-bold text-slate-400">Sin resultados</h4>
              <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">No se encontraron registros que coincidan con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-accent/10">
                    <TableHead className="w-[180px] text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha / Hora</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Acción</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Categoría</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Usuario</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Dispositivo</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Resultado</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="group border-b border-accent/5 hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell className="text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {log.timestamp ? format(new Date(log.timestamp), "MMM dd, HH:mm:ss", { locale: es }) : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                          {getActionIcon(log.actionType)}
                          {log.action}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                          {log.actionType.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.userId ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <div className="w-6 h-6 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                              <User className="w-3 h-3" />
                            </div>
                            ID #{log.userId}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase italic">Sistema</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.deviceId ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Smartphone className="w-3.5 h-3.5 text-violet-400" />
                            ID #{log.deviceId}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {log.status === "success" ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase border border-emerald-100">
                              <CheckCircle className="w-3 h-3" />
                              Éxito
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase border border-rose-100">
                              <AlertCircle className="w-3 h-3" />
                              Fallo
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.details ? (
                          <div className="inline-block p-1 bg-slate-50 rounded border border-slate-100 text-[10px] font-mono text-slate-400 max-w-[150px] truncate">
                            {JSON.stringify(log.details)}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
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
          <div className="flex justify-center py-4">
            <Button
              onClick={() => setLimit(limit + 50)}
              variant="outline"
              className="rounded-full border-cyan-100 text-cyan-600 hover:bg-cyan-50 font-bold px-8 shadow-sm"
            >
              Cargar más registros
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
