import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            Explorador de Archivos
          </h1>
          <p className="text-gray-400 mt-2">Navega y gestiona archivos del dispositivo</p>
        </div>
        <HardDriveIcon className="w-12 h-12 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Selección de Dispositivo */}
        <Card className="lg:col-span-1 bg-gray-900 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-lg">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedDevice?.toString() || ""} onValueChange={(val) => setSelectedDevice(Number(val))}>
              <SelectTrigger className="bg-gray-800 border-gray-700">
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
              <div className="space-y-2 p-3 bg-gray-800 rounded-lg">
                <div className="text-sm font-medium">Almacenamiento</div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-purple-500 h-2 rounded-full"
                    style={{ width: `${storageInfo.usagePercentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Usado: {formatFileSize(storageInfo.used)}</div>
                  <div>Libre: {formatFileSize(storageInfo.free)}</div>
                  <div>Total: {formatFileSize(storageInfo.total)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Explorador de Archivos */}
        {selectedDevice ? (
          <div className="lg:col-span-3 space-y-4">
            {/* Barra de Navegación */}
            <Card className="bg-gray-900 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-lg">Ubicación: {currentPath}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={handleGoBack}
                    disabled={currentPath === "/"}
                    variant="outline"
                    size="sm"
                    className="border-purple-500/50"
                  >
                    ← Atrás
                  </Button>
                  <Button
                    onClick={() => setCurrentPath("/")}
                    variant="outline"
                    size="sm"
                    className="border-purple-500/50"
                  >
                    Inicio
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Buscar archivos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-gray-800 border-gray-700"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lista de Archivos */}
            <Card className="bg-gray-900 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-lg">Contenido</CardTitle>
                <CardDescription>
                  {filteredContents.length} elementos
                  {isLoadingDirectory && <Loader2 className="w-4 h-4 animate-spin ml-2 inline" />}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 border border-gray-700 rounded-lg p-3">
                  <div className="space-y-2">
                    {filteredContents.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getFileIcon(item.type)}
                          <div className="flex-1 min-w-0">
                            {item.type === "folder" ? (
                              <button
                                onClick={() => handleNavigate(item.name)}
                                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 truncate text-left"
                              >
                                {item.name}
                              </button>
                            ) : (
                              <div className="text-sm font-medium truncate">{item.name}</div>
                            )}
                            <div className="text-xs text-gray-400">
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
                              className="text-cyan-400 hover:bg-cyan-400/20"
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
                              className="text-red-400 hover:bg-red-400/20"
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
          <Card className="lg:col-span-3 bg-gray-900 border-purple-500/30">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <HardDriveIcon className="w-12 h-12 text-gray-500 mb-4" />
                <p className="text-gray-400">Selecciona un dispositivo para explorar archivos</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
