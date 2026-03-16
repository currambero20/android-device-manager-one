import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileIcon,
  FolderIcon,
  ChevronRightIcon,
  DownloadIcon,
  TrashIcon,
  HardDriveIcon,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function FileExplorer() {
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const { data: allDevices } = trpc.devices.getAll.useQuery() as any;
  const { data: directoryContents, isLoading: isLoadingDirectory } =
    trpc.fileExplorer.getDirectoryContents.useQuery(
      { deviceId: selectedDevice || 0, path: currentPath },
      { enabled: !!selectedDevice }
    );
  const { data: storageInfo } = trpc.fileExplorer.getStorageInfo.useQuery(
    { deviceId: selectedDevice || 0 },
    { enabled: !!selectedDevice }
  );

  // Mutations
  const downloadFileMutation = trpc.fileExplorer.downloadFile.useMutation({
    onSuccess: () => {
      toast.success("Descarga iniciada");
    },
    onError: () => {
      toast.error("Error al descargar archivo");
    },
  });

  const deleteFileMutation = trpc.fileExplorer.deleteFile.useMutation({
    onSuccess: () => {
      toast.success("Archivo eliminado correctamente");
    },
    onError: () => {
      toast.error("Error al eliminar archivo");
    },
  });

  // Filtered contents
  const filteredContents = useMemo(() => {
    if (!directoryContents?.contents) return [];
    if (!searchQuery) return directoryContents.contents;

    return directoryContents.contents.filter((item: any) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [directoryContents?.contents, searchQuery]);

  const handleNavigate = (folderName: string) => {
    const newPath = currentPath === "/" ? `/${folderName}` : `${currentPath}/${folderName}`;
    setCurrentPath(newPath);
  };

  const handleGoBack = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? "/" : `/${parts.join("/")}`);
  };

  const getFileIcon = (type: string) => {
    return type === "folder" ? (
      <FolderIcon className="w-5 h-5 text-yellow-400" />
    ) : (
      <FileIcon className="w-5 h-5 text-gray-400" />
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <DashboardLayout title="Explorador de Archivos">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700">
            Explorador de Archivos
          </h1>
          <p className="text-muted-foreground mt-2">Navega y gestiona archivos del dispositivo</p>
        </div>
        <HardDriveIcon className="w-12 h-12 text-primary opacity-80" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Selección de Dispositivo */}
        <Card className="lg:col-span-1 border-accent/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedDevice?.toString() || ""} onValueChange={(val) => setSelectedDevice(Number(val))}>
              <SelectTrigger className="bg-secondary/50 border-accent/20">
                <SelectValue placeholder="Selecciona dispositivo" />
              </SelectTrigger>
              <SelectContent>
                {allDevices?.map((device: any) => (
                  <SelectItem key={device.id} value={device.id.toString()}>
                    {device.deviceName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedDevice && storageInfo && (
              <div className="space-y-2 p-3 bg-secondary/30 rounded-lg border border-accent/10">
                <div className="text-sm font-medium">Almacenamiento</div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                    style={{ width: `${storageInfo.usagePercentage}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Usado: <span className="font-medium text-foreground">{formatFileSize(storageInfo.used)}</span></div>
                  <div>Libre: <span className="font-medium text-foreground">{formatFileSize(storageInfo.free)}</span></div>
                  <div>Total: <span className="font-medium text-foreground">{formatFileSize(storageInfo.total)}</span></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Explorador de Archivos */}
        {selectedDevice ? (
          <div className="lg:col-span-3 space-y-4">
            {/* Barra de Navegación */}
            <Card className="border-accent/20 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                   Ubicación: <span className="text-primary font-mono text-sm">{currentPath}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={handleGoBack}
                    disabled={currentPath === "/"}
                    variant="outline"
                    size="sm"
                    className="border-accent/40 bg-secondary/30 hover:bg-secondary/50"
                  >
                    ← Atrás
                  </Button>
                  <Button
                    onClick={() => setCurrentPath("/")}
                    variant="outline"
                    size="sm"
                    className="border-accent/40 bg-secondary/30 hover:bg-secondary/50"
                  >
                    Inicio
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar archivos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-secondary/50 border-accent/20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lista de Archivos */}
            <Card className="border-accent/20 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">Contenido</CardTitle>
                  <CardDescription>
                    {filteredContents.length} elementos
                    {isLoadingDirectory && <Loader2 className="w-4 h-4 animate-spin ml-2 inline" />}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 border border-accent/20 rounded-lg p-3">
                  <div className="space-y-2">
                    {filteredContents.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-accent/10 hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getFileIcon(item.type)}
                          <div className="flex-1 min-w-0">
                            {item.type === "folder" ? (
                              <button
                                onClick={() => handleNavigate(item.name)}
                                className="text-sm font-medium text-cyan-600 hover:text-cyan-700 truncate text-left"
                              >
                                {item.name}
                              </button>
                            ) : (
                              <div className="text-sm font-medium truncate text-foreground">{item.name}</div>
                            )}
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                              {item.type === "folder" ? "Carpeta" : formatFileSize(item.size)}
                            </div>
                          </div>
                        </div>

                        {item.type === "file" && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              onClick={() =>
                                downloadFileMutation.mutate({
                                  deviceId: selectedDevice,
                                  filePath: `${currentPath}/${item.name}`,
                                })
                              }
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:bg-primary/5"
                              disabled={downloadFileMutation.isPending}
                            >
                              <DownloadIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() =>
                                deleteFileMutation.mutate({
                                  deviceId: selectedDevice,
                                  filePath: `${currentPath}/${item.name}`,
                                })
                              }
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/5"
                              disabled={deleteFileMutation.isPending}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="lg:col-span-3 border-accent/20 bg-secondary/10 dashed">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <HardDriveIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Selecciona un dispositivo para explorar archivos</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
