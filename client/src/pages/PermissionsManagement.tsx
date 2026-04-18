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
  const { data: allUsers, isLoading: usersLoading } = trpc.users.getAll.useQuery() as any;
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
      (d.deviceName || "").toLowerCase().includes(searchDevice.toLowerCase())
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
    <DashboardLayout title="Permisos Granulares">
      <div className="cyber-scanline" />
      <div className="space-y-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-cyan-500/10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase gradient-text flex items-center gap-3">
              <Shield className="w-10 h-10 text-cyan-400" />
              Matriz de Seguridad
            </h1>
            <p className="text-cyan-500/60 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Control de Accesos de Nivel Superior</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="p-3 bg-fuchsia-500/10 rounded-2xl border border-fuchsia-500/30 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
               <Lock className="w-6 h-6 animate-pulse" />
             </div>
          </div>
        </div>

        <Tabs defaultValue="matrix" className="w-full">
          <TabsList className="bg-black/40 border border-cyan-500/20 p-1.5 h-14 rounded-2xl gap-2 mb-8">
            <TabsTrigger value="matrix" className="flex-1 rounded-xl data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:neon-border-cyan font-black text-xs uppercase tracking-widest transition-all">
              Matriz de Dispositivos
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex-1 rounded-xl data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:neon-border-cyan font-black text-xs uppercase tracking-widest transition-all">
              Categorías de Payload
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex-1 rounded-xl data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:neon-border-cyan font-black text-xs uppercase tracking-widest transition-all">
              Presets de Rango
            </TabsTrigger>
          </TabsList>

          {/* Matriz de Permisos */}
          <TabsContent value="matrix" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Selección de Usuario */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="glass-panel overflow-hidden border-cyan-500/20 shadow-2xl">
                  <div className="p-5 border-b border-cyan-500/10 bg-cyan-500/5 items-center flex justify-between">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-cyan-500/70">Asignar Operador</h2>
                    <Users className="w-4 h-4 text-cyan-500/50" />
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-700" />
                      <Input
                        placeholder="ID_BUSQUEDA..."
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        className="input-neon h-12 pl-10"
                      />
                    </div>
                    <ScrollArea className="h-[550px] pr-2 cyber-scrollbar">
                      <div className="space-y-2.5">
                        {usersLoading ? (
                          <div className="flex flex-col items-center justify-center py-20 text-cyan-500/30">
                            <Loader2 className="w-8 h-8 animate-spin mb-3" />
                            <p className="text-[9px] font-black uppercase tracking-[0.2em]">Sincronizando...</p>
                          </div>
                        ) : filteredUsers?.map((user: any) => (
                          <button
                            key={user.id}
                            onClick={() => setSelectedUser(user.id)}
                            className={`w-full text-left p-4 rounded-2xl transition-all border group relative overflow-hidden ${
                              selectedUser === user.id
                                ? "bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                                : "bg-black/20 border-cyan-500/5 hover:border-cyan-500/30"
                            }`}
                          >
                            <div className="relative z-10">
                              <div className={`font-black text-xs uppercase mb-1 transition-colors ${selectedUser === user.id ? "text-cyan-300" : "text-cyan-100/70"}`}>
                                {user.name || "UNIDENTIFIED"}
                              </div>
                              <div className="text-[9px] text-cyan-900 font-bold uppercase tracking-tighter truncate mb-3">{user.email || "NO_IDENTITY"}</div>
                              <Badge className={`${
                                user.role === 'admin' ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                              } border text-[8px] font-black px-2 py-0.5 tracking-widest`}>
                                {user.role}
                              </Badge>
                            </div>
                            {selectedUser === user.id && (
                              <div className="absolute right-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Contenido de Permisos */}
              {selectedUser ? (
                <div className="lg:col-span-3 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  {/* Acciones Rápidas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="glass-panel border-fuchsia-500/20 shadow-xl overflow-hidden group">
                      <div className="p-4 border-b border-fuchsia-500/10 bg-fuchsia-500/5 flex items-center justify-between">
                         <CardTitle className="text-xs font-black uppercase tracking-widest text-fuchsia-400 flex items-center gap-2">
                           <Zap className="w-4 h-4" /> Protocolos de Rango
                         </CardTitle>
                      </div>
                      <CardContent className="p-5 flex flex-wrap gap-2.5">
                        <Button
                          onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: "admin" as any })}
                          className="flex-1 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-xl h-10 font-black text-[9px] uppercase tracking-widest transition-all"
                          disabled={assignPresetMutation.isPending}
                        >
                          FULL_ADMIN
                        </Button>
                        <Button
                          onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: "manager" as any })}
                          className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl h-10 font-black text-[9px] uppercase tracking-widest transition-all"
                          disabled={assignPresetMutation.isPending}
                        >
                          SECTOR_LEAD
                        </Button>
                        <Button
                          onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: "user" as any })}
                          className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl h-10 font-black text-[9px] uppercase tracking-widest transition-all"
                          disabled={assignPresetMutation.isPending}
                        >
                          FIELD_ENTRY
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="glass-panel border-rose-500/20 shadow-xl flex flex-col justify-center p-6 text-center overflow-hidden group relative">
                       <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 opacity-20 group-hover:opacity-60 transition-opacity" />
                       <p className="text-[10px] font-black uppercase text-rose-500/60 mb-2 tracking-[0.3em]">Directiva de Purga</p>
                       <Button
                          onClick={() => clearPermissionsMutation.mutate({ userId: selectedUser })}
                          variant="ghost"
                          className="text-rose-400 hover:text-rose-100 hover:bg-rose-500/20 font-black text-[10px] uppercase tracking-[0.2em] border border-rose-500/20 rounded-xl py-6"
                          disabled={clearPermissionsMutation.isPending}
                        >
                          REVOCAR TODA AUTORIZACIÓN
                        </Button>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Permisos Globales */}
                    <Card className="glass-panel border-cyan-500/20 shadow-2xl h-[600px] flex flex-col">
                      <div className="p-5 border-b border-cyan-500/10 bg-cyan-500/5 flex items-center justify-between">
                         <CardTitle className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-3">
                           <Lock className="w-5 h-5" /> Privilegios Globales
                         </CardTitle>
                         <Badge className="bg-cyan-500/10 text-cyan-400 border-none font-black text-[9px] px-3">{userPermissions?.length || 0}_ACT</Badge>
                      </div>
                      <CardContent className="p-4 flex-1 overflow-hidden">
                        <ScrollArea className="h-full pr-4 cyber-scrollbar">
                          <div className="space-y-2.5">
                            {allPermissions?.map((perm: any) => {
                              const hasPermission = userPermissions?.some((p: any) => p.code === perm.code);
                              return (
                                <div
                                  key={perm.code}
                                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group ${
                                    hasPermission
                                      ? "bg-cyan-500/10 border-cyan-500/40 shadow-[inset_0_0_15px_rgba(34,211,238,0.1)]"
                                      : "bg-black/20 border-cyan-500/5 hover:border-cyan-500/20"
                                  }`}
                                >
                                  <Checkbox
                                    id={`perm-${perm.code}`}
                                    checked={hasPermission}
                                    onCheckedChange={(checked) => {
                                      if (checked) assignPermissionMutation.mutate({ userId: selectedUser, permission: perm.code as any });
                                      else revokePermissionMutation.mutate({ userId: selectedUser, permission: perm.code as any });
                                    }}
                                    disabled={assignPermissionMutation.isPending || revokePermissionMutation.isPending}
                                    className="border-cyan-500/50 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-black"
                                  />
                                  <label htmlFor={`perm-${perm.code}`} className="flex-1 cursor-pointer">
                                    <div className={`font-black text-[11px] uppercase tracking-tight mb-1 ${hasPermission ? "text-cyan-300" : "text-cyan-100/60"}`}>{perm.code}</div>
                                    <div className="text-[9px] text-cyan-900 font-bold uppercase italic line-clamp-1">{perm.description}</div>
                                  </label>
                                  <Badge className="bg-black/40 text-[8px] font-black uppercase border-cyan-500/10 text-cyan-900 px-2">{perm.category}</Badge>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Matriz Usuario-Dispositivo */}
                    <Card className="glass-panel border-cyan-500/20 shadow-2xl h-[600px] flex flex-col">
                      <div className="p-5 border-b border-cyan-500/10 bg-cyan-500/5 flex items-center justify-between">
                         <CardTitle className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-3">
                           <Smartphone className="w-5 h-5" /> Excepciones por Hardware
                         </CardTitle>
                      </div>
                      <CardContent className="p-4 flex-1 overflow-hidden flex flex-col">
                        <div className="relative mb-6">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-700" />
                          <Input
                            placeholder="HARDWARE_ID..."
                            value={searchDevice}
                            onChange={(e) => setSearchDevice(e.target.value)}
                            className="input-neon h-12 pl-10"
                          />
                        </div>
                        <ScrollArea className="flex-1 pr-4 cyber-scrollbar">
                          <div className="space-y-6">
                            {filteredDevices?.map((device: any) => (
                              <div key={device.id} className="p-5 bg-black/30 rounded-2xl border border-cyan-500/10 group hover:border-cyan-500/30 transition-all">
                                <div className="flex items-center justify-between mb-5">
                                  <div>
                                    <div className="font-black text-xs uppercase text-cyan-100 group-hover:text-cyan-400 transition-colors tracking-tight">{device.deviceName}</div>
                                    <div className="text-[9px] text-cyan-900 font-bold uppercase tracking-[0.2em]">{device.model}</div>
                                  </div>
                                  <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-black text-[9px] px-2.5">
                                    V_SYS_{device.androidVersion}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {allPermissions?.map((perm: any) => {
                                    const devicePerms = permissionMatrix?.[device.id] || [];
                                    const hasPermission = devicePerms.includes(perm.code);
                                    const isLoading = updatePermissionMatrixMutation.isPending;

                                    return (
                                      <div
                                        key={`${device.id}-${perm.code}`}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-tighter transition-all ${
                                          hasPermission
                                            ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                                            : "bg-black/40 border-cyan-500/5 text-cyan-900 hover:border-cyan-500/20"
                                        }`}
                                      >
                                        <Checkbox
                                          checked={hasPermission}
                                          onCheckedChange={(checked) => handleMatrixPermissionChange(device.id, perm.code, Boolean(checked))}
                                          disabled={isLoading}
                                          className="w-3.5 h-3.5 border-cyan-500/40"
                                        />
                                        <span>{perm.code}</span>
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
                <div className="lg:col-span-3">
                  <Card className="glass-panel border-cyan-500/10 shadow-2xl border-dashed h-[700px] flex flex-col items-center justify-center p-12 text-center group">
                    <div className="w-32 h-32 bg-cyan-500/5 rounded-full flex items-center justify-center mb-10 border border-cyan-500/10 shadow-[inset_0_0_40px_rgba(34,211,238,0.1)] group-hover:shadow-[inset_0_0_60px_rgba(34,211,238,0.2)] transition-all duration-700">
                      <Users className="w-16 h-16 text-cyan-500/20 group-hover:text-cyan-500/40 group-hover:scale-110 transition-all duration-700 animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-black text-cyan-100 uppercase tracking-[0.2em] italic gradient-text">Identificar Operador</h3>
                    <p className="text-cyan-900 font-bold uppercase text-[10px] tracking-[0.4em] max-w-xs mt-6 leading-relaxed">Escoge un miembro de la red para reconfigurar sus protocolos de acceso granulares.</p>
                    <div className="mt-12 flex gap-4">
                       <div className="h-0.5 w-12 bg-cyan-500/20" />
                       <div className="h-0.5 w-4 bg-cyan-500/60 animate-bounce" />
                       <div className="h-0.5 w-12 bg-cyan-500/20" />
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Permisos por Categoría */}
          <TabsContent value="permissions" className="mt-0 space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {categories?.map((category: any) => (
                <Card key={category.name} className="glass-panel border-cyan-500/10 shadow-xl overflow-hidden group hover:border-cyan-500/40 transition-all duration-500">
                  <div className="h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-500 opacity-20 group-hover:opacity-100 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all duration-700" />
                  <div className="p-6 border-b border-cyan-500/10 bg-black/20 flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100 italic group-hover:text-cyan-400 transition-colors">
                        {category.name}
                      </CardTitle>
                      <p className="text-[9px] font-bold text-cyan-900 uppercase mt-1">Directivas_Payload</p>
                    </div>
                    <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-black text-[10px] px-3 py-1">#{category.count}</Badge>
                  </div>
                  <CardContent className="p-5 space-y-2.5">
                    {category.permissions.map((perm: any) => (
                      <div key={perm} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-cyan-500/5 group/item hover:border-cyan-500/30 transition-all">
                        <span className="text-[11px] font-black text-cyan-100/70 group-hover/item:text-cyan-300 transition-colors tracking-tight uppercase">{perm}</span>
                        <div className="p-2 bg-cyan-500/5 rounded-xl border border-cyan-500/10 group-hover/item:bg-cyan-500/20 transition-all">
                            <Lock className="w-4 h-4 text-cyan-500/40 group-hover/item:text-cyan-400 transition-all" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Presets Rápidos */}
          <TabsContent value="presets" className="mt-0 space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {presets?.map((preset: any) => (
                <Card key={preset.name} className="glass-panel border-cyan-500/10 shadow-2xl hover:border-fuchsia-500/40 transition-all duration-700 group bg-gradient-to-br from-black/60 to-black/20">
                  <div className="p-8 pb-4">
                    <CardTitle className="text-3xl font-black flex items-center gap-5 italic gradient-text uppercase tracking-tighter">
                      <div className="p-4 bg-fuchsia-500/10 rounded-2xl border border-fuchsia-500/30 shadow-[0_0_20px_rgba(217,70,239,0.1)] group-hover:shadow-[0_0_30px_rgba(217,70,239,0.3)] transition-all">
                        <Zap className="w-8 h-8 text-fuchsia-400 animate-pulse" />
                      </div>
                      {preset.name}
                    </CardTitle>
                    <div className="mt-8 flex items-center justify-between border-b border-cyan-500/10 pb-4">
                       <p className="text-[10px] font-black text-cyan-500/60 uppercase tracking-[0.3em]">Protocolo_Batch</p>
                       <p className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest">{preset.count}_PRIVS_ENABLED</p>
                    </div>
                  </div>
                  <CardContent className="p-8 pt-4 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-4 cyber-scrollbar">
                      {preset.permissions.map((perm: any) => (
                        <div key={perm.code} className="p-4 bg-black/40 rounded-2xl border border-cyan-500/5 hover:border-fuchsia-500/20 transition-all">
                          <div className="font-black text-[10px] text-fuchsia-400 uppercase tracking-tight mb-1">{perm.code}</div>
                          <div className="text-[9px] text-cyan-900 font-bold uppercase italic line-clamp-2 leading-relaxed">{perm.description}</div>
                        </div>
                      ))}
                    </div>
                    {selectedUser && (
                      <Button
                        onClick={() => assignPresetMutation.mutate({ userId: selectedUser, preset: preset.name as any })}
                        className="w-full btn-neon-cyan h-16 font-black text-xs tracking-[0.2em] shadow-2xl shadow-cyan-500/20 uppercase"
                        disabled={assignPresetMutation.isPending}
                      >
                        INYECTAR PROTOCOLO EN {filteredUsers?.find((u: any) => u.id === selectedUser)?.name || "ENTRY"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Información de Seguridad */}
        <div className="glass-panel border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-black to-blue-950/20 p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
            <Shield className="w-32 h-32 text-cyan-400 rotate-12" />
          </div>
          <div className="flex items-center gap-4 mb-6 relative z-10">
             <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
               <AlertCircle className="w-6 h-6 text-cyan-400" />
             </div>
             <h3 className="text-xl font-black uppercase tracking-[0.2em] gradient-text italic">Directivas de Integridad MDM</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
             {[
               { t: "Jerarquía Dinámica", d: "Los permisos de usuario actúan como una capa global, mientras que la matriz por hardware permite excepciones críticas de seguridad." },
               { t: "Rastro Digital", d: "Cada reconfiguración de privilegios activa una entrada inmutable en el registro de auditoría asociada a su firma de administrador." },
               { t: "Consistencia SQL", d: "Los presets siguen el Principio de Menor Privilegio (PoLP) para asegurar la integridad de la red y evitar fugas de datos de telemetría." }
             ].map((item, i) => (
               <div key={i} className="space-y-3">
                 <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full shadow-[0_0_8px_rgba(217,70,239,1)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-100">{item.t}</span>
                 </div>
                 <p className="text-[10px] text-cyan-900 leading-relaxed font-bold font-mono tracking-tight">{item.d}</p>
               </div>
             ))}
          </div>
        </div>
      </div>
    </DashboardLayout>

  );
}
