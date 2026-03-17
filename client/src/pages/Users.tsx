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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users as UsersIcon,
  Plus,
  Trash2,
  Edit,
  Shield,
  Mail,
  Calendar,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "manager" | "user" | "viewer",
  });
  const [showPassword, setShowPassword] = useState(false);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pwd }));
    setShowPassword(true);
    toast.info(`Contraseña generada: ${pwd}`, { duration: 5000 });
  };

  const { data: users = [], isLoading, refetch } = trpc.users.getAll.useQuery();

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });

  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuario creado exitosamente");
      setIsDialogOpen(false);
      setFormData({ name: "", email: "", password: "", role: "user" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Error al crear usuario: ${error.message}`);
    },
  });

  const resetPasswordMutation = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      setIsDialogOpen(false);
      setEditingUserId(null);
      setFormData({ name: "", email: "", password: "", role: "user" });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Nombre y Email son requeridos");
      return;
    }

    if (editingUserId) {
      // Editar: actualiza rol y contraseña si se ingresó
      await updateRoleMutation.mutateAsync({ id: editingUserId, role: formData.role });
      if (formData.password) {
        await resetPasswordMutation.mutateAsync({ id: editingUserId, newPassword: formData.password });
      }
      setIsDialogOpen(false);
      setEditingUserId(null);
      setFormData({ name: "", email: "", password: "", role: "user" });
    } else {
      if (!formData.password || formData.password.length < 6) {
        toast.error("La contraseña debe tener al menos 6 caracteres");
        return;
      }
      // Construir el objeto explícitamente para evitar que campos undefined causen errores en Zod
      await createUserMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
    }
  };

  const handleUpdateRole = async (userId: number, role: any) => {
    await updateRoleMutation.mutateAsync({ id: userId, role });
  };

  const handleDeleteUser = async (userId: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      await deleteUserMutation.mutateAsync({ id: userId });
    }
  };

  const filteredUsers: any[] = users.filter(
    (user: any) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "border-purple-200 text-purple-700 bg-purple-50";
      case "manager":
        return "border-cyan-200 text-cyan-700 bg-cyan-50";
      case "user":
        return "border-blue-200 text-blue-700 bg-blue-50";
      default:
        return "border-gray-200 text-gray-700 bg-gray-50";
    }
  };

  return (
    <DashboardLayout title="User Management v1.0.1-final">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Input
              placeholder="Buscar usuarios por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md bg-white border-accent/20 focus:border-cyan-500 shadow-sm"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingUserId(null);
              setFormData({ name: "", email: "", password: "", role: "user" });
            }
          }}>
            <Button 
              className="ml-4 bg-cyan-600 hover:bg-cyan-700 text-white shadow-md transition-all hover:scale-105"
              onClick={() => {
                setEditingUserId(null);
                setFormData({ name: "", email: "", password: "", role: "user" });
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Usuario
            </Button>
            <DialogContent className="bg-white border-accent/20">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {editingUserId ? "Editar Usuario" : "Crear Nuevo Usuario"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {editingUserId
                    ? "Actualiza la información y permisos del usuario"
                    : "Añade un nuevo usuario al sistema"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Nombre Completo
                  </label>
                  <Input
                    placeholder="ej. Juan Pérez"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-gray-50 border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="ej. juan@ejemplo.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="bg-gray-50 border-gray-200"
                  />
                </div>
                {!editingUserId && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700">
                        Contraseña *
                      </label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-cyan-600 hover:bg-cyan-50"
                        onClick={generatePassword}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Generar
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="bg-gray-50 border-gray-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                {editingUserId && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700">
                        Nueva Contraseña <span className="text-xs font-normal text-gray-400">(dejar en blanco para no cambiar)</span>
                      </label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-cyan-600 hover:bg-cyan-50"
                        onClick={generatePassword}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Generar
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Nueva contraseña (opcional)"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="bg-gray-50 border-gray-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Rol de Usuario
                  </label>
                  <Select value={formData.role} onValueChange={(value: any) =>
                    setFormData({ ...formData, role: value })
                  }>
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {editingUserId ? "Actualizar Usuario" : "Crear Usuario"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-accent/20 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando usuarios...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <UsersIcon className="w-12 h-12 text-cyan-200 mx-auto mb-4" />
              <p className="text-muted-foreground">No se encontraron usuarios</p>
              <p className="text-sm text-muted-foreground mt-2">
                Haz clic en "Agregar Usuario" para crear una nueva cuenta
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-accent/10 hover:bg-transparent">
                  <TableHead className="font-semibold text-gray-900">Nombre</TableHead>
                  <TableHead className="font-semibold text-gray-900">Email</TableHead>
                  <TableHead className="font-semibold text-gray-900">Rol</TableHead>
                  <TableHead className="font-semibold text-gray-900">Estado</TableHead>
                  <TableHead className="font-semibold text-gray-900">Último Acceso</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow
                    key={user.id}
                    className="border-accent/10 hover:bg-accent/5 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={user.role}
                        onValueChange={(val) => handleUpdateRole(user.id, val)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className={`w-[120px] h-8 text-[10px] font-bold border rounded-full px-3 uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-accent/20">
                          <SelectItem value="admin">ADMIN</SelectItem>
                          <SelectItem value="manager">MANAGER</SelectItem>
                          <SelectItem value="user">USER</SelectItem>
                          <SelectItem value="viewer">VIEWER</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            user.isActive ? "bg-green-500 animate-pulse" : "bg-gray-300"
                          }`}
                        ></div>
                        <span className="text-xs font-medium text-gray-600">
                          {user.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {user.lastSignedIn
                          ? formatDistanceToNow(new Date(user.lastSignedIn), {
                              addSuffix: true,
                            })
                          : "Never"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hover:bg-cyan-50 text-cyan-600"
                          onClick={() => {
                            setEditingUserId(user.id);
                            setFormData({
                              name: user.name,
                              email: user.email,
                              password: "",
                              role: user.role,
                            });
                            setIsDialogOpen(true);
                          }}
                          title="Editar Usuario"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hover:text-destructive"
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-accent/20 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Usuarios</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{users.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-accent/20 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Admins</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">
                  {users.filter((u: any) => u.role === "admin").length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-accent/20 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Activos</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">
                  {users.filter((u: any) => u.isActive).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-accent/20 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inactivos</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">
                  {users.filter((u: any) => !u.isActive).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
