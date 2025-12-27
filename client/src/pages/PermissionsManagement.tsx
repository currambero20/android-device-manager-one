import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, Shield, Lock, Eye, Users, Smartphone, Search, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PermissionsManagement() {
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [searchDevice, setSearchDevice] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<"admin" | "manager" | "user" | "viewer">("user");

  // Queries
  const { data: allPermissions } = trpc.granularPermissions.getAllPermissions.useQuery();
  const { data: allUsers } = trpc.users.getAll.useQuery() as any;
  const { data: allDevices } = trpc.devices.getAll.useQuery() as any;
  const { data: presets } = trpc.granularPermissions.getPresets.useQuery();
  const { data: categories } = trpc.granularPermissions.getCategories.useQuery();
  const { data: userPermissions } = trpc.granularPermissions.getUserPermissions.useQuery(
    { userId: selectedUser || 0 },
    { enabled: !!selectedUser }
  );
  const { data: permissionMatrix } = trpc.granularPermissions.getPermissionMatrix.useQuery(
    { userId: selectedUser || 0, deviceIds: allDevices?.map((d: any) => d.id) || [] },
    { enabled: !!selectedUser && !!allDevices }
  );

  // Mutations
  const assignPermissionMutation = trpc.granularPermissions.assignUserPermission.useMutation({
    onSuccess: () => {
      toast.success("Permiso asignado correctamente");
    },
    onError: () => {
      toast.error("Error al asignar permiso");
    },
  });

  const revokePermissionMutation = trpc.granularPermissions.revokeUserPermission.useMutation({
    onSuccess: () => {
      toast.success("Permiso revocado correctamente");
    },
    onError: () => {
      toast.error("Error al revocar permiso");
    },
  });

  const assignPresetMutation = trpc.granularPermissions.assignPreset.useMutation({
    onSuccess: () => {
      toast.success("Preset asignado correctamente");
    },
    onError: () => {
      toast.error("Error al asignar preset");
    },
  });

  const clearPermissionsMutation = trpc.granularPermissions.clearUserPermissions.useMutation({
    onSuccess: () => {
      toast.success("Permisos limpiados correctamente");
    },
    onError: () => {
      toast.error("Error al limpiar permisos");
    },
  });

  // Mutation para actualizar matriz de permisos usuario-dispositivo
  const updatePermissionMatrixMutation = trpc.granularPermissions.updatePermissionMatrix.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Permisos actualizados: +${data.added} agregados, -${data.removed} removidos`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar permisos");
    },
  });

  // Filtered data
  const filteredUsers = useMemo(() => {
    return (allUsers || []).filter((u: any) =>
      u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchUser.toLowerCase())
    );
  }, [allUsers, searchUser]);

  const filteredDevices = useMemo(() => {
    return (allDevices || []).filter((d: any) =>
      d.name?.toLowerCase().includes(searchDevice.toLowerCase())
    );
  }, [allDevices, searchDevice]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-300";
      case "manager":
        return "bg-orange-500/20 text-orange-300";
      case "user":
        return "bg-blue-500/20 text-blue-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  const getPermissionColor = (hasPermission: boolean) => {
    return hasPermission ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-300";
  };

  // Manejar cambios en la matriz de permisos
  const handleMatrixPermissionChange = useCallback(
    (deviceId: number, permissionCode: string, checked: boolean) => {
      if (!selectedUser) return;

      const currentPerms = (permissionMatrix?.[deviceId] as string[]) || [];
      const newPerms = new Set(currentPerms);
      if (checked) {
        newPerms.add(permissionCode);
      } else {
        newPerms.delete(permissionCode);
      }

      updatePermissionMatrixMutation.mutate({
        userId: selectedUser,
        deviceId,
        permissions: Array.from(newPerms),
      });
    },
    [selectedUser, permissionMatrix, updatePermissionMatrixMutation]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            Gestión de Permisos
          </h1>
          <p className="text-gray-400 mt-2">Administra permisos granulares de usuarios y dispositivos</p>
        </div>
        <Shield className="w-12 h-12 text-purple-500" />
      </div>

      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-900 border border-purple-500/30">
          <TabsTrigger value="matrix">Matriz de Permisos</TabsTrigger>
          <TabsTrigger value="permissions">Permisos por Categoría</TabsTrigger>
          <TabsTrigger value="presets">Presets Rápidos</TabsTrigger>
        </TabsList>

        {/* Matriz de Permisos */}
        <TabsContent value="matrix" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Selección de Usuario */}
            <Card className="lg:col-span-1 bg-gray-900 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Usuarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Buscar usuario..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="pl-8 bg-gray-800 border-gray-700"
                  />
                </div>
                <ScrollArea className="h-96 border border-gray-700 rounded-lg p-2">
                  <div className="space-y-2">
                    {filteredUsers?.map((user: any) => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUser(user.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          selectedUser === user.id
                            ? "bg-purple-500/30 border border-purple-500"
                            : "bg-gray-800 border border-gray-700 hover:border-purple-500/50"
                        }`}
                      >
                        <div className="font-medium text-sm">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                        <Badge className={`mt-2 text-xs ${getRoleColor(user.role)}`}>
                          {user.role}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Matriz de Permisos */}
            {selectedUser ? (
              <div className="lg:col-span-3 space-y-4">
                {/* Acciones Rápidas */}
                <Card className="bg-gray-900 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: "admin" })}
                      variant="outline"
                      size="sm"
                      className="border-red-500/50 hover:bg-red-500/20"
                      disabled={assignPresetMutation.isPending}
                    >
                      Admin
                    </Button>
                    <Button
                      onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: "manager" })}
                      variant="outline"
                      size="sm"
                      className="border-orange-500/50 hover:bg-orange-500/20"
                      disabled={assignPresetMutation.isPending}
                    >
                      Manager
                    </Button>
                    <Button
                      onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: "user" })}
                      variant="outline"
                      size="sm"
                      className="border-blue-500/50 hover:bg-blue-500/20"
                      disabled={assignPresetMutation.isPending}
                    >
                      User
                    </Button>
                    <Button
                      onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: "viewer" })}
                      variant="outline"
                      size="sm"
                      className="border-gray-500/50 hover:bg-gray-500/20"
                      disabled={assignPresetMutation.isPending}
                    >
                      Viewer
                    </Button>
                    <Button
                      onClick={() => clearPermissionsMutation.mutate({ userId: selectedUser })}
                      variant="outline"
                      size="sm"
                      className="border-red-500/50 hover:bg-red-500/20 ml-auto"
                      disabled={clearPermissionsMutation.isPending}
                    >
                      Limpiar Todo
                    </Button>
                  </CardContent>
                </Card>

                {/* Permisos del Usuario */}
                <Card className="bg-gray-900 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg">Permisos Actuales</CardTitle>
                    <CardDescription>
                      {userPermissions?.length || 0} permisos asignados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                      {allPermissions?.map((perm) => {
                        const hasPermission = userPermissions?.some((p) => p.code === perm.code);
                        return (
                          <div
                            key={perm.code}
                            className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-all"
                          >
                            <Checkbox
                              checked={hasPermission}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  assignPermissionMutation.mutate({
                                    userId: selectedUser,
                                    permission: perm.code,
                                  });
                                } else {
                                  revokePermissionMutation.mutate({
                                    userId: selectedUser,
                                    permission: perm.code,
                                  });
                                }
                              }}
                              disabled={assignPermissionMutation.isPending || revokePermissionMutation.isPending}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{perm.code}</div>
                              <div className="text-xs text-gray-400">{perm.description}</div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {perm.category}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Matriz de Dispositivos */}
                {filteredDevices && filteredDevices.length > 0 && (
                  <Card className="bg-gray-900 border-purple-500/30">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-cyan-400" />
                        Matriz Usuario-Dispositivo
                      </CardTitle>
                      <CardDescription>
                        Asigna permisos específicos por dispositivo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500" />
                        <Input
                          placeholder="Buscar dispositivo..."
                          value={searchDevice}
                          onChange={(e) => setSearchDevice(e.target.value)}
                          className="pl-8 bg-gray-800 border-gray-700 mb-4"
                        />
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredDevices.map((device: any) => (
                          <div key={device.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="font-medium text-sm">{device.deviceName}</div>
                                <div className="text-xs text-gray-400">{device.model}</div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {device.androidVersion}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {allPermissions?.map((perm) => {
                                const devicePerms = permissionMatrix?.[device.id] || [];
                                const hasPermission = devicePerms.includes(perm.code);
                                const isLoading = updatePermissionMatrixMutation.isPending;

                                return (
                                  <div
                                    key={`${device.id}-${perm.code}`}
                                    className="flex items-center gap-2 p-2 bg-gray-700 rounded text-xs"
                                  >
                                    <Checkbox
                                      checked={hasPermission}
                                      onCheckedChange={(checked) => {
                                        handleMatrixPermissionChange(device.id, perm.code, Boolean(checked));
                                      }}
                                      disabled={isLoading}
                                    />
                                    <span className="truncate" title={perm.code}>
                                      {perm.code}
                                    </span>
                                    {isLoading && (
                                      <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="lg:col-span-3 bg-gray-900 border-purple-500/30">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center h-96 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-500 mb-4" />
                    <p className="text-gray-400">Selecciona un usuario para ver y gestionar sus permisos</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Permisos por Categoría */}
        <TabsContent value="permissions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories?.map((category) => (
              <Card key={category.name} className="bg-gray-900 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{category.name}</CardTitle>
                  <CardDescription>{category.count} permisos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.permissions.map((perm) => (
                    <div key={perm} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                      <span className="text-sm font-medium">{perm}</span>
                      <Lock className="w-4 h-4 text-purple-400" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Presets Rápidos */}
        <TabsContent value="presets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presets?.map((preset) => (
              <Card key={preset.name} className="bg-gray-900 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="capitalize text-lg">{preset.name}</CardTitle>
                  <CardDescription>{preset.count} permisos incluidos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {preset.permissions.map((perm) => (
                      <div key={perm.code} className="text-sm">
                        <div className="font-medium text-cyan-400">{perm.code}</div>
                        <div className="text-xs text-gray-400">{perm.description}</div>
                      </div>
                    ))}
                  </div>
                  {selectedUser && (
                    <Button
                      onClick={() =>
                        assignPresetMutation.mutate({
                          userId: selectedUser,
                          preset: preset.name as "admin" | "manager" | "user" | "viewer",
                        })
                      }
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      disabled={assignPresetMutation.isPending}
                    >
                      Asignar a Usuario Seleccionado
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Información de Seguridad */}
      <Card className="bg-gradient-to-r from-red-500/10 to-purple-500/10 border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Información de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-300 space-y-2">
          <p>• Los permisos de usuario se intersectan con los permisos del dispositivo</p>
          <p>• La matriz usuario-dispositivo permite permisos granulares por dispositivo</p>
          <p>• Los presets asignan múltiples permisos automáticamente</p>
          <p>• Todos los cambios de permisos se registran en auditoría</p>
          <p>• Solo administradores pueden modificar permisos</p>
        </CardContent>
      </Card>
    </div>
  );
}
