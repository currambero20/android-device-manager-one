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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Plus,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

const PERMISSIONS: Permission[] = [
  {
    id: "GPS_LOGGING",
    name: "GPS Logging",
    description: "Track device location in real-time with GPS coordinates",
    icon: <MapPin className="w-5 h-5" />,
    category: "Location",
    riskLevel: "critical",
  },
  {
    id: "MICROPHONE_RECORDING",
    name: "Microphone Recording",
    description: "Record audio from device microphone",
    icon: <Mic className="w-5 h-5" />,
    category: "Audio",
    riskLevel: "critical",
  },
  {
    id: "VIEW_CONTACTS",
    name: "View Contacts",
    description: "Access and list all device contacts",
    icon: <FileText className="w-5 h-5" />,
    category: "Contacts",
    riskLevel: "high",
  },
  {
    id: "SMS_LOGS",
    name: "SMS Logs",
    description: "Access SMS message history and logs",
    icon: <MessageSquare className="w-5 h-5" />,
    category: "Communications",
    riskLevel: "critical",
  },
  {
    id: "SEND_SMS",
    name: "Send SMS",
    description: "Send SMS messages from the device",
    icon: <MessageSquare className="w-5 h-5" />,
    category: "Communications",
    riskLevel: "high",
  },
  {
    id: "CALL_LOGS",
    name: "Call Logs",
    description: "Access call history and logs",
    icon: <Phone className="w-5 h-5" />,
    category: "Communications",
    riskLevel: "high",
  },
  {
    id: "VIEW_INSTALLED_APPS",
    name: "View Installed Apps",
    description: "List all installed applications",
    icon: <FileText className="w-5 h-5" />,
    category: "System",
    riskLevel: "medium",
  },
  {
    id: "CLIPBOARD_LOGGING",
    name: "Clipboard Logging",
    description: "Monitor clipboard content",
    icon: <Copy className="w-5 h-5" />,
    category: "Data",
    riskLevel: "high",
  },
  {
    id: "NOTIFICATION_LOGGING",
    name: "Notification Logging",
    description: "Capture system notifications",
    icon: <Bell className="w-5 h-5" />,
    category: "System",
    riskLevel: "medium",
  },
  {
    id: "FILE_EXPLORER",
    name: "File Explorer",
    description: "Browse device file system",
    icon: <FileText className="w-5 h-5" />,
    category: "Files",
    riskLevel: "high",
  },
  {
    id: "SCREEN_RECORDING",
    name: "Screen Recording",
    description: "Record device screen activity",
    icon: <Video className="w-5 h-5" />,
    category: "Media",
    riskLevel: "critical",
  },
  {
    id: "CAMERA_ACCESS",
    name: "Camera Access",
    description: "Access device camera",
    icon: <Camera className="w-5 h-5" />,
    category: "Media",
    riskLevel: "critical",
  },
  {
    id: "LOCATION_TRACKING",
    name: "Location Tracking",
    description: "Continuous location tracking",
    icon: <MapPin className="w-5 h-5" />,
    category: "Location",
    riskLevel: "critical",
  },
  {
    id: "EMAIL_HARVESTING",
    name: "Email Harvesting",
    description: "Extract email addresses from device",
    icon: <FileText className="w-5 h-5" />,
    category: "Data",
    riskLevel: "high",
  },
  {
    id: "PASSWORD_EXTRACTION",
    name: "Password Extraction",
    description: "Extract stored passwords",
    icon: <Lock className="w-5 h-5" />,
    category: "Security",
    riskLevel: "critical",
  },
  {
    id: "STEALTH_MODE",
    name: "Stealth Mode",
    description: "Hide app from system",
    icon: <Eye className="w-5 h-5" />,
    category: "System",
    riskLevel: "high",
  },
];

interface UserPermission {
  userId: number;
  userName: string;
  permissions: string[];
}

export default function Permissions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([
    { userId: 1, userName: "Admin User", permissions: PERMISSIONS.map((p) => p.id) },
    { userId: 2, userName: "Manager User", permissions: ["GPS_LOGGING", "SMS_LOGS", "CALL_LOGS"] },
    { userId: 3, userName: "Standard User", permissions: ["GPS_LOGGING", "VIEW_CONTACTS"] },
  ]);

  const categories = ["all", ...Array.from(new Set(PERMISSIONS.map((p) => p.category)))];

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

  const filteredPermissions: Permission[] = PERMISSIONS.filter((perm) => {
    const matchesSearch = perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || perm.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleUserPermission = (userId: number, permissionId: string): void => {
    setUserPermissions((prev) =>
      prev.map((up) => {
        if (up.userId === userId) {
          const newPerms = up.permissions.includes(permissionId)
            ? up.permissions.filter((p) => p !== permissionId)
            : [...up.permissions, permissionId];
          return { ...up, permissions: newPerms };
        }
        return up;
      })
    );
  };

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

          {/* All Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            {/* Search and Filter */}
            <div className="card-neon p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Search permissions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-neon pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap ${
                        selectedCategory === cat ? "btn-neon-cyan" : "btn-neon"
                      }`}
                      size="sm"
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Permissions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPermissions.map((perm) => (
                <div key={perm.id} className="card-neon p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="text-purple-400 mt-1">{perm.icon}</div>
                      <div>
                        <h4 className="font-bold text-sm">{perm.name}</h4>
                        <p className="text-xs text-muted-foreground">{perm.category}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded border-2 ${getRiskColor(
                        perm.riskLevel
                      )}`}
                    >
                      {perm.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{perm.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <code className="bg-accent/20 px-2 py-1 rounded font-mono">
                      {perm.id}
                    </code>
                  </div>
                </div>
              ))}
            </div>

            {filteredPermissions.length === 0 && (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 glow-cyan mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No permissions found</p>
              </div>
            )}
          </TabsContent>

          {/* User Assignments Tab */}
          <TabsContent value="users" className="space-y-6">
            {userPermissions.map((userPerm) => (
              <div key={userPerm.userId} className="card-neon">
                <div className="border-b border-glow-cyan pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{userPerm.userName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {userPerm.permissions.length} permissions assigned
                      </p>
                    </div>
                    <Button className="btn-neon-cyan" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PERMISSIONS.map((perm) => {
                    const isAssigned = userPerm.permissions.includes(perm.id);
                    return (
                      <button
                        key={perm.id}
                        onClick={() => toggleUserPermission(userPerm.userId, perm.id)}
                        className={`p-3 rounded border-2 transition-all text-left ${
                          isAssigned
                            ? "border-glow-cyan bg-cyan-500/10"
                            : "border-glow-cyan/30 bg-accent/5 hover:bg-accent/10"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={isAssigned ? "text-cyan-400" : "text-muted-foreground"}>
                            {perm.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold">{perm.name}</p>
                            <p className={`text-xs mt-1 ${
                              isAssigned ? "text-cyan-300" : "text-muted-foreground"
                            }`}>
                              {isAssigned ? "✓ Assigned" : "Not assigned"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Legal Notice */}
        <div className="border-2 border-yellow-500 bg-yellow-500/10 p-4 rounded-lg">
          <p className="text-sm font-medium text-yellow-400 mb-2">
            ⚠️ Permission Assignment Warning
          </p>
          <p className="text-xs text-muted-foreground">
            Granting permissions to users is a critical security decision. Only assign
            permissions that are absolutely necessary for the user's role. Regularly audit
            and revoke unused permissions. Critical-level permissions should only be granted
            to trusted administrators.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
