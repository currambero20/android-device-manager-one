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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users as UsersIcon,
  Plus,
  Trash2,
  Edit,
  Shield,
  Mail,
  Calendar,
  Eye,
  EyeOff,
  RefreshCw,
  Layout,
  Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPermsDialogOpen, setIsPermsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [managingUserId, setManagingUserId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [showPassword, setShowPassword] = useState(false);

  const { data: users = [], isLoading, refetch } = trpc.users.getAll.useQuery();
  const { data: allPermissions = [] } = trpc.permissions.getAllPermissions.useQuery();
  const { data: userPerms = [], refetch: refetchUserPerms } = trpc.permissions.getUserPermissions.useQuery(
    { userId: managingUserId || 0 },
    { enabled: !!managingUserId }
  );

  const syncPermsMutation = trpc.permissions.syncUserPermissions.useMutation({
    onSuccess: () => {
      toast.success("Permisos actualizados correctamente");
      refetchUserPerms();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => { toast.success("Rol actualizado"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => { toast.success("Usuario eliminado"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuario creado");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const togglePermission = (permCode: string) => {
    if (!managingUserId) return;
    const currentCodes = userPerms.map(p => p.code) as string[];
    const newCodes = currentCodes.includes(permCode)
      ? currentCodes.filter(c => c !== permCode)
      : [...currentCodes, permCode];
    
    syncPermsMutation.mutate({ userId: managingUserId, permissions: newCodes });
  };

  const filteredUsers = users.filter(u => 
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId) {
      updateRoleMutation.mutate({ id: editingUserId, role: formData.role as any });
      setIsDialogOpen(false);
    } else {
      createUserMutation.mutate(formData as any);
    }
  };

  return (
    <DashboardLayout title="Usuarios">
      <div className="cyber-scanline" />
      <div className="space-y-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-cyan-500/10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase gradient-text flex items-center gap-3">
              <UsersIcon className="w-10 h-10 text-cyan-400" />
              Directorio de Personal
            </h1>
            <p className="text-cyan-500/60 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Control de Accesos y Privilegios MDM</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-700" />
              <Input 
                placeholder="Buscar por identidad..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-neon h-12 pl-10"
              />
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="btn-neon-cyan h-12 px-6">
              <Plus className="w-5 h-5 mr-3" /> Registrar
            </Button>
          </div>
        </div>

        <div className="glass-panel overflow-hidden border-cyan-500/20 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <Table>
            <TableHeader className="bg-cyan-500/5">
              <TableRow className="border-b border-cyan-500/10 h-14">
                <TableHead className="text-cyan-500 font-black uppercase text-[10px] tracking-widest pl-6">Operador</TableHead>
                <TableHead className="text-cyan-500 font-black uppercase text-[10px] tracking-widest">Credencial</TableHead>
                <TableHead className="text-cyan-500 font-black uppercase text-[10px] tracking-widest">Nivel de Acceso</TableHead>
                <TableHead className="text-cyan-500 font-black uppercase text-[10px] tracking-widest">Estado</TableHead>
                <TableHead className="text-right text-cyan-500 font-black uppercase text-[10px] tracking-widest pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <UsersIcon className="w-12 h-12 mx-auto mb-4 text-cyan-900/20" />
                    <p className="text-[10px] font-black text-cyan-900/40 uppercase tracking-[0.2em]">No se encontraron registros de usuario</p>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-all duration-300 group">
                  <TableCell className="font-bold text-cyan-100 pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30 text-cyan-400 font-black">
                        {user.name?.[0].toUpperCase()}
                      </div>
                      {user.name || "UNIDENTIFIED"}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-cyan-900 group-hover:text-cyan-400/80 transition-colors uppercase">{user.email || "NO_EMAIL"}</TableCell>
                  <TableCell>
                    <Badge className={`${
                      user.role === 'admin' ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/40" : 
                      user.role === 'manager' ? "bg-blue-500/10 text-blue-400 border-blue-500/40" : 
                      "bg-cyan-500/10 text-cyan-400 border-cyan-500/40"
                    } border text-[9px] font-black px-3 py-1 uppercase tracking-tighter`}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                       <div className={`w-2.5 h-2.5 rounded-full ${user.isActive ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" : "bg-cyan-900"}`} />
                       <span className={`text-[9px] font-black uppercase tracking-widest ${user.isActive ? "text-cyan-400" : "text-cyan-900"}`}>
                         {user.isActive ? "En Línea" : "Sin Conexión"}
                       </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6 space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-xl h-10 w-10 hover:bg-fuchsia-500/20 text-fuchsia-500" 
                      onClick={() => { setManagingUserId(user.id); setIsPermsDialogOpen(true); }}
                      title="Administrar Privilegios"
                    >
                      <Shield className="w-4.5 h-4.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-xl h-10 w-10 hover:bg-cyan-500/20 text-cyan-500" 
                      onClick={() => { setEditingUserId(user.id); setFormData({ name: user.name || "", email: user.email || "", password: "", role: user.role || "user" }); setIsDialogOpen(true); }}
                      title="Editar Perfil"
                    >
                      <Edit className="w-4.5 h-4.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-xl h-10 w-10 hover:bg-rose-500/20 text-rose-500" 
                      onClick={() => deleteUserMutation.mutate({ id: user.id })}
                      title="Eliminar Operador"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Dialogo de Usuario */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="glass-panel border-cyan-500/30 bg-black/90 text-cyan-100 max-w-md">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic gradient-text">
                {editingUserId ? "Actualizar Perfil" : "Registrar Operador"}
              </DialogTitle>
              <DialogDescription className="text-cyan-900 font-bold uppercase text-[10px] tracking-widest">
                Protocolo de autenticación nivel {editingUserId ? "2" : "1"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateOrUpdate} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-cyan-500 tracking-widest ml-1">Nombre Completo</label>
                <Input placeholder="DESIGNACIÓN" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-neon h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-cyan-500 tracking-widest ml-1">Dirección Mail</label>
                <Input placeholder="EMAIL_IDENTITY" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" className="input-neon h-12" />
              </div>
              {!editingUserId && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-cyan-500 tracking-widest ml-1">Clave de Acceso</label>
                  <Input placeholder="ENCRYPTED_KEY" type="password" onChange={e => setFormData({...formData, password: e.target.value})} className="input-neon h-12" />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-cyan-500 tracking-widest ml-1">Rango / Rol</label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="input-neon h-12 font-bold uppercase tracking-widest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/95 border-cyan-500/30 text-cyan-100">
                    <SelectItem value="admin" className="focus:bg-cyan-500/20">ADMIN_PRIME</SelectItem>
                    <SelectItem value="manager" className="focus:bg-cyan-500/20">SECTOR_MANAGER</SelectItem>
                    <SelectItem value="user" className="focus:bg-cyan-500/20">FIELD_AGENT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full btn-neon-cyan h-12 font-black tracking-widest mt-6">
                CONFIRMAR REGISTRO
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialogo de Permisos (HERRAMIENTAS) */}
        <Dialog open={isPermsDialogOpen} onOpenChange={setIsPermsDialogOpen}>
          <DialogContent className="glass-panel border-fuchsia-500/30 bg-black/90 text-cyan-100 max-w-2xl">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tighter uppercase italic text-fuchsia-400">
                <Shield className="w-7 h-7 text-fuchsia-500" />
                Matriz de Privilegios
              </DialogTitle>
              <DialogDescription className="text-fuchsia-900 font-bold uppercase text-[10px] tracking-widest">
                Configuración de módulos para: {users.find(u => u.id === managingUserId)?.name || "ENTRY_POINT"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto p-2 cyber-scrollbar">
              {allPermissions.filter(p => p.code.startsWith("MENU_") || p.category === "security").map((perm) => {
                const isGranted = userPerms.some(up => up.code === perm.code);
                return (
                  <button
                    key={perm.code}
                    onClick={() => togglePermission(perm.code)}
                    disabled={syncPermsMutation.isPending}
                    className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all group ${
                      isGranted 
                        ? "border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_20px_rgba(217,70,239,0.2)]" 
                        : "border-cyan-500/10 bg-black/40 hover:border-cyan-500/30"
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className={`text-[11px] font-black truncate uppercase tracking-tight mb-1 ${isGranted ? "text-fuchsia-300" : "text-cyan-500"}`}>
                        {perm.code.replace("MENU_", "").replace("_", " ")}
                      </p>
                      <p className="text-[9px] text-cyan-900 font-bold uppercase italic group-hover:text-cyan-700 transition-colors">{perm.description}</p>
                    </div>
                    {isGranted ? (
                      <div className="w-6 h-6 rounded-lg bg-fuchsia-500/20 flex items-center justify-center border border-fuchsia-500/50">
                        <Check className="w-4 h-4 text-fuchsia-400" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/5 border border-cyan-500/10" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="pt-6 flex justify-end">
              <Button onClick={() => setIsPermsDialogOpen(false)} variant="outline" className="border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-xl h-11 px-8 font-black tracking-widest">
                COMPLETAR
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>

  );
}
