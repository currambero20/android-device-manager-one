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
    role: "user" as const,
  });

  // TODO: Implement getAllUsers query in db.ts
  const users: any[] = [];
  const isLoading = false;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Name and Email are required");
      return;
    }
    // TODO: Implement user creation mutation
    toast.success("User created successfully");
    setIsDialogOpen(false);
    setFormData({ name: "", email: "", role: "user" });
  };

  const handleDeleteUser = (userId: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      // TODO: Implement user deletion mutation
      toast.success("User deleted successfully");
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
        return "border-glow text-purple-400";
      case "manager":
        return "border-glow-cyan text-cyan-400";
      case "user":
        return "border-glow text-purple-300";
      default:
        return "border-glow-cyan text-cyan-300";
    }
  };

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-neon max-w-md"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-neon-cyan ml-4">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="card-neon border-glow">
              <DialogHeader>
                <DialogTitle className="gradient-text">
                  {editingUserId ? "Edit User" : "Create New User"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {editingUserId
                    ? "Update user information and permissions"
                    : "Add a new user to the system"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-sm font-medium glow-cyan mb-2 block">
                    Full Name
                  </label>
                  <Input
                    placeholder="e.g., John Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input-neon"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium glow-cyan mb-2 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g., john@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="input-neon"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium glow-cyan mb-2 block">
                    Role
                  </label>
                  <Select value={formData.role} onValueChange={(value: any) =>
                    setFormData({ ...formData, role: value })
                  }>
                    <SelectTrigger className="input-neon">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-glow">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="btn-neon-cyan w-full"
                >
                  {editingUserId ? "Update User" : "Create User"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <div className="card-neon overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <UsersIcon className="w-12 h-12 glow-cyan mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No users found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Add User" to create a new user account
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-glow-cyan hover:bg-transparent">
                  <TableHead className="glow-cyan">Name</TableHead>
                  <TableHead className="glow-cyan">Email</TableHead>
                  <TableHead className="glow-cyan">Role</TableHead>
                  <TableHead className="glow-cyan">Status</TableHead>
                  <TableHead className="glow-cyan">Last Login</TableHead>
                  <TableHead className="glow-cyan text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow
                    key={user.id}
                    className="border-glow-cyan/30 hover:bg-accent/10 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-xs font-bold">
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
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold border-2 ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        <Shield className="w-3 h-3 inline mr-1" />
                        {user.role.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`${
                            user.isActive ? "status-online" : "status-offline"
                          }`}
                        ></div>
                        <span className="text-sm">
                          {user.isActive ? "Active" : "Inactive"}
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
                          className="hover:bg-accent/20"
                          onClick={() => {
                            setEditingUserId(user.id);
                            setFormData({
                              name: user.name,
                              email: user.email,
                              role: user.role,
                            });
                            setIsDialogOpen(true);
                          }}
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4 glow-cyan" />
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
          <div className="card-neon-cyan">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold glow-cyan">{users.length}</p>
              </div>
              <UsersIcon className="w-8 h-8 glow-cyan opacity-50" />
            </div>
          </div>
          <div className="card-neon">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-3xl font-bold glow-purple">
                  {users.filter((u: any) => u.role === "admin").length}
                </p>
              </div>
              <Shield className="w-8 h-8 glow-purple opacity-50" />
            </div>
          </div>
          <div className="card-neon-cyan">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-3xl font-bold">
                  {users.filter((u: any) => u.isActive).length}
                </p>
              </div>
              <div className="status-online w-6 h-6"></div>
            </div>
          </div>
          <div className="card-neon">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-3xl font-bold">
                  {users.filter((u: any) => !u.isActive).length}
                </p>
              </div>
              <div className="status-offline w-6 h-6"></div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
