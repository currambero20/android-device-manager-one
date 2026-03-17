// @ts-nocheck
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Folder, File, ChevronRight, Download, Trash2, 
  ArrowLeft, HardDrive, Search, RefreshCw, 
  FileText, Image as ImageIcon, Video, Music, 
  MoreVertical, Share, ShieldAlert,
  FolderOpen
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface FileItem {
  id?: number;
  name: string;
  type: "file" | "folder";
  size: number;
  modified: Date;
}

export default function FileExplorer() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: devices = [] } = trpc.devices.getAll.useQuery() as any;
  const { data: directoryData, isLoading, refetch } = trpc.fileExplorer.getDirectoryContents.useQuery(
    { deviceId: selectedDeviceId!, path: currentPath },
    { enabled: !!selectedDeviceId }
  );
  const { data: storageInfo } = trpc.fileExplorer.getStorageInfo.useQuery(
    { deviceId: selectedDeviceId! },
    { enabled: !!selectedDeviceId }
  );

  const downloadMutation = trpc.fileExplorer.downloadFile.useMutation({
    onSuccess: (data) => toast.success(`Descarga iniciada: ${data.fileName}`),
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.fileExplorer.deleteFile.useMutation({
    onSuccess: () => { toast.success("Archivo eliminado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const goBack = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath("/" + parts.join("/"));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "—";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif"].includes(ext!)) return <ImageIcon className="w-4 h-4 text-pink-500" />;
    if (["mp4", "mkv", "avi"].includes(ext!)) return <Video className="w-4 h-4 text-purple-500" />;
    if (["mp3", "wav"].includes(ext!)) return <Music className="w-4 h-4 text-amber-500" />;
    if (["pdf", "doc", "docx", "txt"].includes(ext!)) return <FileText className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const filteredContents = (directoryData?.contents || []).filter((item: any) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Explorador de Archivos">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700">
              Explorador de Archivos
            </h1>
            <p className="text-muted-foreground mt-1 text-sm tracking-tight">Acceso y gestión remota del almacenamiento corporativo</p>
          </div>
          <FolderOpen className="w-12 h-12 text-blue-500 opacity-20" />
        </div>

        {/* Device Selector & Storage Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-accent/20 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-600" />
                Dispositivo MDM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedDeviceId?.toString() ?? ""}
                onValueChange={(v) => { setSelectedDeviceId(Number(v)); setCurrentPath("/"); }}
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

              {storageInfo && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase text-muted-foreground">
                    <span>Almacenamiento</span>
                    <span>{storageInfo.usagePercentage}% usado</span>
                  </div>
                  <Progress value={storageInfo.usagePercentage} className="h-1.5 bg-secondary" indicatorClassName="bg-blue-600" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatSize(storageInfo.used)}</span>
                    <span>Total {formatSize(storageInfo.total)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-accent/20 shadow-sm overflow-hidden">
            <div className="p-4 bg-secondary/10 border-b border-accent/10 flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                disabled={currentPath === "/" || !selectedDeviceId}
                className="hover:bg-accent/20 px-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 font-mono text-xs bg-black/5 p-2 rounded-md border border-accent/5 truncate">
                {currentPath}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-40 pl-7 text-xs bg-white/50 border-accent/10"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={!selectedDeviceId} className="h-8 w-8 p-0">
                  <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {!selectedDeviceId ? (
                  <div className="py-24 text-center text-muted-foreground">
                    <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-medium">No se ha seleccionado ningún dispositivo</p>
                    <p className="text-xs mt-1">Selecciona un dispositivo para explorar sus archivos</p>
                  </div>
                ) : isLoading ? (
                  <div className="py-24 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-sm text-muted-foreground">Cargando archivos...</p>
                  </div>
                ) : filteredContents.length === 0 ? (
                  <div className="py-24 text-center text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-medium">No se encontraron archivos</p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] uppercase font-bold text-muted-foreground bg-secondary/5 border-b border-accent/5">
                      <tr>
                        <th className="px-6 py-3">Nombre</th>
                        <th className="px-6 py-3">Tamaño</th>
                        <th className="px-6 py-3">Modificación</th>
                        <th className="px-6 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-accent/5">
                      {filteredContents.map((item: any, idx: number) => (
                        <tr
                          key={idx}
                          className="hover:bg-accent/5 transition-colors group cursor-pointer"
                          onClick={() => {
                            if (item.type === "folder") {
                              handleNavigate(currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`);
                            }
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {item.type === "folder" ? (
                                <Folder className="w-4 h-4 text-blue-600 fill-blue-600/10" />
                              ) : (
                                getFileIcon(item.name)
                              )}
                              <span className="font-medium text-slate-700">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground">
                            {item.type === "file" ? formatSize(item.size) : "—"}
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.modified), { addSuffix: true, locale: es })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.type === "file" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadMutation.mutate({ deviceId: selectedDeviceId, filePath: `${currentPath}/${item.name}` });
                                  }}
                                  className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate({ deviceId: selectedDeviceId, filePath: `${currentPath}/${item.name}` });
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-bold">Aviso de Seguridad MDM</p>
            <p>La navegación de archivos requiere que el dispositivo esté en línea. Las eliminaciones son permanentes y afectan el almacenamiento real del dispositivo corporativo.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
