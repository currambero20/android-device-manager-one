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
    const currentCodes = userPerms.map(p => p.code);
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
    <DashboardLayout title="Gestión de Usuarios V3.14">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Input 
            placeholder="Buscar por nombre o email..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md bg-white/50 border-cyan-500/20"
          />
          <Button onClick={() => setIsDialogOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-accent/20 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || "Sin nombre"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email || "Sin email"}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold border uppercase bg-accent/10">
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${user.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                       <span className="text-xs">{user.isActive ? "Online" : "Offline"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => { setManagingUserId(user.id); setIsPermsDialogOpen(true); }}>
                      <Layout className="w-4 h-4 text-purple-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingUserId(user.id); setFormData({ ...user }); setIsDialogOpen(true); }}>
                      <Edit className="w-4 h-4 text-cyan-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteUserMutation.mutate({ id: user.id })} className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Dialogo de Usuario */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUserId ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <Input placeholder="Nombre" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <Input placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" />
              {!editingUserId && <Input placeholder="Contraseña" type="password" onChange={e => setFormData({...formData, password: e.target.value})} />}
              <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="w-full bg-cyan-600">Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialogo de Permisos (HERRAMIENTAS) */}
        <Dialog open={isPermsDialogOpen} onOpenChange={setIsPermsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                Herramientas Permitidas para {users.find(u => u.id === managingUserId)?.name || "Usuario"}
              </DialogTitle>
              <DialogDescription>
                Selecciona qué módulos y herramientas podrá visualizar este usuario en su menú lateral.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto p-2">
              {allPermissions.filter(p => p.code.startsWith("MENU_") || p.category === "security").map((perm) => {
                const isGranted = userPerms.some(up => up.code === perm.code);
                return (
                  <button
                    key={perm.code}
                    onClick={() => togglePermission(perm.code)}
                    disabled={syncPermsMutation.isPending}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                      isGranted 
                        ? "border-purple-500 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.2)]" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold truncate">{perm.code.replace("MENU_", "").replace("_", " ")}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{perm.description}</p>
                    </div>
                    {isGranted && <Check className="w-4 h-4 text-purple-500" />}
                  </button>
                );
              })}
            </div>
            <div className="pt-4 flex justify-end">
              <Button onClick={() => setIsPermsDialogOpen(false)} variant="outline">Cerrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
