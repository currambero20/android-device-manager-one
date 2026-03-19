import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, Shield, Lock, Eye, Users, Smartphone, Search, Copy, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

export default function PermissionsManagement() {
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [searchDevice, setSearchDevice] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<"admin" | "manager" | "user" | "viewer">("user");

  // Queries
  const { data: allPermissions } = trpc.permissions.getAllPermissions.useQuery() as any;
  const { data: allUsers } = trpc.users.getAll.useQuery() as any;
  const { data: allDevices } = trpc.devices.getMyDevices.useQuery() as any;
  const { data: presets } = trpc.permissions.getPresets.useQuery() as any;
  const { data: categories } = trpc.permissions.getCategories.useQuery() as any;
  const { data: userPermissions } = trpc.permissions.getUserPermissions.useQuery(
    { userId: selectedUser || 0 },
    { enabled: !!selectedUser }
  ) as any;
  const { data: permissionMatrix } = trpc.permissions.getPermissionMatrix.useQuery(
    { userId: selectedUser || 0, deviceIds: allDevices?.map((d: any) => d.id) || [] },
    { enabled: !!selectedUser && !!allDevices }
  ) as any;

  // Mutations
  const assignPermissionMutation = trpc.permissions.assignUserPermission.useMutation({
    onSuccess: () => {
      toast.success("Permiso asignado correctamente");
    },
    onError: () => {
      toast.error("Error al asignar permiso");
    },
  });

  const revokePermissionMutation = trpc.permissions.revokeUserPermission.useMutation({
    onSuccess: () => {
      toast.success("Permiso revocado correctamente");
    },
    onError: () => {
      toast.error("Error al revocar permiso");
    },
  });

  const assignPresetMutation = trpc.permissions.assignPreset.useMutation({
    onSuccess: () => {
      toast.success("Preset asignado correctamente");
    },
    onError: () => {
      toast.error("Error al asignar preset");
    },
  });

  const clearPermissionsMutation = trpc.permissions.clearUserPermissions.useMutation({
    onSuccess: () => {
      toast.success("Permisos limpiados correctamente");
    },
    onError: () => {
      toast.error("Error al limpiar permisos");
    },
  });

  // Mutation para actualizar matriz de permisos usuario-dispositivo
  const updatePermissionMatrixMutation = trpc.permissions.updatePermissionMatrix.useMutation({
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
      (u.name || "").toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchUser.toLowerCase())
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
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "manager":
        return "bg-amber-500/10 text-amber-700 border-amber-200";
      case "user":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-secondary text-muted-foreground border-accent/20";
    }
  };

  const getPermissionColor = (hasPermission: boolean) => {
    return hasPermission ? "bg-green-500/10 text-green-700 border-green-200" : "bg-secondary text-muted-foreground border-accent/20";
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
        permissions: Array.from(newPerms) as any,
      });
    },
    [selectedUser, permissionMatrix, updatePermissionMatrixMutation]
  );

  return (
    <DashboardLayout title="Gestión de Permisos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700">
              Gestión de Permisos
            </h1>
            <p className="text-muted-foreground mt-2">Administra permisos granulares de usuarios y dispositivos</p>
          </div>
          <Shield className="w-12 h-12 text-primary opacity-80" />
        </div>

        <Tabs defaultValue="matrix" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/30 border border-accent/20 p-1 h-11 rounded-xl">
            <TabsTrigger value="matrix" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary text-xs font-semibold">
              Matriz de Permisos
            </TabsTrigger>
            <TabsTrigger value="permissions" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary text-xs font-semibold">
              Permisos por Categoría
            </TabsTrigger>
            <TabsTrigger value="presets" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary text-xs font-semibold">
              Presets Rápidos
            </TabsTrigger>
          </TabsList>

          {/* Matriz de Permisos */}
          <TabsContent value="matrix" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Selección de Usuario */}
              <Card className="lg:col-span-1 border-accent/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Usuarios
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuario..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="pl-9 bg-secondary/50 border-accent/20"
                    />
                  </div>
                  <ScrollArea className="h-[500px] border border-accent/10 rounded-xl p-2 bg-secondary/10">
                    <div className="space-y-2">
                      {filteredUsers?.map((user: any) => (
                        <button
                          key={user.id}
                          onClick={() => setSelectedUser(user.id)}
                          className={`w-full text-left p-3 rounded-xl transition-all border ${
                            selectedUser === user.id
                              ? "bg-primary/10 border-primary/30 shadow-sm"
                              : "bg-background border-transparent hover:border-accent/20 hover:bg-secondary/50"
                          }`}
                        >
                          <div className="font-bold text-sm text-foreground">{user.name || "Sin nombre"}</div>
                          <div className="text-[10px] text-muted-foreground font-medium truncate">{user.email || "Sin email"}</div>
                          <Badge variant="outline" className={`mt-2 text-[10px] uppercase tracking-wider font-bold ${getRoleColor(user.role || "")}`}>
                            {user.role}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Contenido de Permisos */}
              {selectedUser ? (
                <div className="lg:col-span-3 space-y-4">
                  {/* Acciones Rápidas */}
                  <Card className="border-accent/20 shadow-sm">
                    <CardHeader className="py-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Acciones Rápidas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2 pt-0">
                      <Button
                        onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: "admin" as any })}
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 hover:bg-destructive/10 text-destructive text-xs font-bold"
                        disabled={assignPresetMutation.isPending}
                      >
                        Administrador (Full)
                      </Button>
                      <Button
                        onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: "manager" as any })}
                        variant="outline"
                        size="sm"
                        className="border-amber-500/30 hover:bg-amber-500/10 text-amber-600 text-xs font-bold"
                        disabled={assignPresetMutation.isPending}
                      >
                        Gestor (Manager)
                      </Button>
                      <Button
                        onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: "user" as any })}
                        variant="outline"
                        size="sm"
                        className="border-primary/30 hover:bg-primary/10 text-primary text-xs font-bold"
                        disabled={assignPresetMutation.isPending}
                      >
                        Usuario Estándar
                      </Button>
                      <Button
                        onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: "viewer" as any })}
                        variant="outline"
                        size="sm"
                        className="border-muted-foreground/30 hover:bg-secondary text-muted-foreground text-xs font-bold"
                        disabled={assignPresetMutation.isPending}
                      >
                        Observador (Viewer)
                      </Button>
                      <div className="ml-auto">
                        <Button
                          onClick={() => clearPermissionsMutation.mutate({ userId: selectedUser })}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/5 text-xs font-bold"
                          disabled={clearPermissionsMutation.isPending}
                        >
                          Limpiar Todos los Permisos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Permisos Granulares */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-accent/20 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Lock className="w-5 h-5 text-primary" />
                          Permisos Globales
                        </CardTitle>
                        <CardDescription>
                          {userPermissions?.length || 0} permisos asignados actualmente
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-2">
                            {allPermissions?.map((perm: any) => {
                              const hasPermission = userPermissions?.some((p: any) => p.code === perm.code);
                              return (
                                <div
                                  key={perm.code}
                                  className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                                    hasPermission
                                      ? "bg-primary/5 border-primary/20"
                                      : "bg-background border-accent/10 hover:border-accent/30"
                                  }`}
                                >
                                  <Checkbox
                                    id={`perm-${perm.code}`}
                                    checked={hasPermission}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        assignPermissionMutation.mutate({
                                          userId: selectedUser,
                                          permission: perm.code as any,
                                        });
                                      } else {
                                        revokePermissionMutation.mutate({
                                          userId: selectedUser,
                                          permission: perm.code as any,
                                        });
                                      }
                                    }}
                                    disabled={assignPermissionMutation.isPending || revokePermissionMutation.isPending}
                                  />
                                  <label 
                                    htmlFor={`perm-${perm.code}`}
                                    className="flex-1 cursor-pointer"
                                  >
                                    <div className="font-bold text-sm text-foreground">{perm.code}</div>
                                    <div className="text-[10px] text-muted-foreground line-clamp-1">{perm.description}</div>
                                  </label>
                                  <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter bg-secondary/50 font-bold">
                                    {perm.category}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Matriz Usuario-Dispositivo */}
                    <Card className="border-accent/20 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-primary" />
                          Permisos por Dispositivo
                        </CardTitle>
                        <CardDescription>
                          Ajusta privilegios específicos en cada equipo
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="relative mb-4">
                          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar dispositivo..."
                            value={searchDevice}
                            onChange={(e) => setSearchDevice(e.target.value)}
                            className="pl-9 bg-secondary/50 border-accent/20"
                          />
                        </div>
                        <ScrollArea className="h-[344px] pr-4">
                          <div className="space-y-4">
                            {filteredDevices?.map((device: any) => (
                              <div key={device.id} className="p-4 bg-secondary/10 rounded-xl border border-accent/10">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <div className="font-bold text-sm text-foreground">{device.deviceName}</div>
                                    <div className="text-[10px] text-muted-foreground font-medium">{device.model}</div>
                                  </div>
                                  <Badge variant="outline" className="text-[9px] font-bold bg-white/50">
                                    v{device.androidVersion}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {allPermissions?.map((perm: any) => {
                                    const devicePerms = permissionMatrix?.[device.id] || [];
                                    const hasPermission = devicePerms.includes(perm.code);
                                    const isLoading = updatePermissionMatrixMutation.isPending;

                                    return (
                                      <div
                                        key={`${device.id}-${perm.code}`}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-bold uppercase transition-all whitespace-nowrap ${
                                          hasPermission
                                            ? "bg-primary/10 border-primary/20 text-primary"
                                            : "bg-white border-accent/10 text-muted-foreground hover:border-accent/30"
                                        }`}
                                      >
                                        <Checkbox
                                          checked={hasPermission}
                                          onCheckedChange={(checked) => {
                                            handleMatrixPermissionChange(device.id, perm.code, Boolean(checked));
                                          }}
                                          disabled={isLoading}
                                          className="w-3 h-3 h-3 mt-0"
                                        />
                                        <span>{perm.code}</span>
                                        {isLoading && (
                                          <Loader2 className="w-2 h-2 animate-spin text-primary" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card className="lg:col-span-3 border-accent/20 shadow-sm border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center h-[600px] text-center">
                      <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6 border border-primary/10 shadow-inner">
                        <Users className="w-10 h-10 text-primary/40" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">Selecciona un Usuario</h3>
                      <p className="text-muted-foreground max-w-xs mt-2">Escoge un miembro de la lista izquierda para gestionar sus privilegios granulares.</p>
                      <Button variant="outline" className="mt-8 border-accent/20 hover:bg-secondary shadow-sm">
                        Ver Todos los Usuarios
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Permisos por Categoría */}
          <TabsContent value="permissions" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories?.map((category) => (
                <Card key={category.name} className="border-accent/20 shadow-sm overflow-hidden group hover:border-primary/30 transition-all">
                  <div className="h-1 bg-gradient-to-r from-primary to-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="bg-secondary/20">
                    <CardTitle className="text-lg capitalize flex items-center justify-between">
                      {category.name}
                      <Badge variant="secondary" className="font-bold text-[10px] bg-white shadow-sm border-accent/10">{category.count}</Badge>
                    </CardTitle>
                    <CardDescription>Permisos de sistema asociados</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-4">
                    {category.permissions.map((perm: any) => (
                      <div key={perm} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-accent/10 group/item hover:bg-secondary/50">
                        <span className="text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors">{perm}</span>
                        <div className="p-1.5 bg-background rounded-lg shadow-sm border border-accent/10">
                            <Lock className="w-3.5 h-3.5 text-primary/60" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Presets Rápidos */}
          <TabsContent value="presets" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {presets?.map((preset: any) => (
                <Card key={preset.name} className="border-accent/20 shadow-sm hover:border-primary/30 transition-all bg-gradient-to-br from-white to-secondary/20">
                  <CardHeader>
                    <CardTitle className="capitalize text-xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      {preset.name}
                    </CardTitle>
                    <CardDescription className="text-sm font-medium">{preset.count} privilegios incluidos en esta plantilla</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                      {preset.permissions.map((perm: any) => (
                        <div key={perm.code} className="p-2.5 bg-background rounded-xl border border-accent/10 shadow-sm">
                          <div className="font-bold text-xs text-primary">{perm.code}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{perm.description}</div>
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
                        className="w-full h-11 text-sm font-bold shadow-lg shadow-primary/20"
                        disabled={assignPresetMutation.isPending}
                      >
                        Asignar Plantilla a {filteredUsers?.find((u: any) => u.id === selectedUser)?.name || "Usuario"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Información de Seguridad */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-primary/20 shadow-sm mt-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Shield className="w-24 h-24 text-primary" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary font-bold">
              <AlertCircle className="w-5 h-5" />
              Directivas de Control de Acceso
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-3 relative z-10 max-w-2xl">
            <div className="flex gap-4">
               <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
               <p><span className="font-bold text-foreground">Jerarquía de Permisos:</span> Los permisos de usuario actúan como una capa global, mientras que la matriz por dispositivo permite excepciones específicas.</p>
            </div>
            <div className="flex gap-4">
               <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
               <p><span className="font-bold text-foreground">Registros de Auditoría:</span> Cada cambio realizado en esta sección se asocia a su cuenta y se registra permanentemente en el sistema de logs.</p>
            </div>
            <div className="flex gap-4">
               <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
               <p><span className="font-bold text-foreground">Consistencia de Roles:</span> Los presets están diseñados basándose en las mejores prácticas de seguridad (Principio de Menor Privilegio).</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
