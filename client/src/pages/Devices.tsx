import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Smartphone,
  Plus,
  Trash2,
  Eye,
  MapPin,
  Zap,
  Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Devices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    deviceId: "",
    deviceName: "",
    manufacturer: "",
    model: "",
    androidVersion: "",
  });

  const { data: devices, isLoading } = trpc.devices.getMyDevices.useQuery();
  const registerDevice = trpc.devices.register.useMutation({
    onSuccess: () => {
      toast.success("Device registered successfully");
      setIsDialogOpen(false);
      setFormData({
        deviceId: "",
        deviceName: "",
        manufacturer: "",
        model: "",
        androidVersion: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to register device");
    },
  });

  const removeDevice = trpc.devices.remove.useMutation({
    onSuccess: () => {
      toast.success("Device removed successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove device");
    },
  });

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deviceId || !formData.deviceName) {
      toast.error("Device ID and Name are required");
      return;
    }
    await registerDevice.mutateAsync(formData);
  };

  const filteredDevices = devices?.filter(
    (device) =>
      device.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.deviceId.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout title="Device Management">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Input
              placeholder="Search devices by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-neon max-w-md"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-neon-cyan ml-4">
                <Plus className="w-4 h-4 mr-2" />
                Register Device
              </Button>
            </DialogTrigger>
            <DialogContent className="card-neon border-glow">
              <DialogHeader>
                <DialogTitle className="gradient-text">Register New Device</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Add a new Android device to your account
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRegisterDevice} className="space-y-4">
                <div>
                  <label className="text-sm font-medium glow-cyan mb-2 block">
                    Device ID
                  </label>
                  <Input
                    placeholder="e.g., device_123456"
                    value={formData.deviceId}
                    onChange={(e) =>
                      setFormData({ ...formData, deviceId: e.target.value })
                    }
                    className="input-neon"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium glow-cyan mb-2 block">
                    Device Name
                  </label>
                  <Input
                    placeholder="e.g., My Android Phone"
                    value={formData.deviceName}
                    onChange={(e) =>
                      setFormData({ ...formData, deviceName: e.target.value })
                    }
                    className="input-neon"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium glow-cyan mb-2 block">
                      Manufacturer
                    </label>
                    <Input
                      placeholder="e.g., Samsung"
                      value={formData.manufacturer}
                      onChange={(e) =>
                        setFormData({ ...formData, manufacturer: e.target.value })
                      }
                      className="input-neon"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium glow-cyan mb-2 block">
                      Model
                    </label>
                    <Input
                      placeholder="e.g., Galaxy S21"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      className="input-neon"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium glow-cyan mb-2 block">
                    Android Version
                  </label>
                  <Input
                    placeholder="e.g., 13.0"
                    value={formData.androidVersion}
                    onChange={(e) =>
                      setFormData({ ...formData, androidVersion: e.target.value })
                    }
                    className="input-neon"
                  />
                </div>
                <Button
                  type="submit"
                  className="btn-neon-cyan w-full"
                  disabled={registerDevice.isPending}
                >
                  {registerDevice.isPending ? "Registering..." : "Register Device"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Devices Table */}
        <div className="card-neon overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading devices...
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-8 text-center">
              <Smartphone className="w-12 h-12 glow-cyan mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No devices registered yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Register Device" to add your first device
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-glow-cyan hover:bg-transparent">
                  <TableHead className="glow-cyan">Device Name</TableHead>
                  <TableHead className="glow-cyan">Device ID</TableHead>
                  <TableHead className="glow-cyan">Model</TableHead>
                  <TableHead className="glow-cyan">Status</TableHead>
                  <TableHead className="glow-cyan">Battery</TableHead>
                  <TableHead className="glow-cyan text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => (
                  <TableRow
                    key={device.id}
                    className="border-glow-cyan/30 hover:bg-accent/10 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 glow-purple" />
                        {device.deviceName}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {device.deviceId}
                    </TableCell>
                    <TableCell className="text-sm">
                      {device.manufacturer} {device.model}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`${
                            device.status === "online"
                              ? "status-online"
                              : device.status === "offline"
                              ? "status-offline"
                              : "status-inactive"
                          }`}
                        ></div>
                        <span className="text-sm capitalize">{device.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {device.batteryLevel ? `${device.batteryLevel}%` : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hover:bg-accent/20"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 glow-cyan" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hover:bg-accent/20"
                          title="Location"
                        >
                          <MapPin className="w-4 h-4 glow-purple" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hover:bg-accent/20"
                          title="Monitor"
                        >
                          <Zap className="w-4 h-4 glow-cyan" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hover:bg-accent/20"
                          title="Settings"
                        >
                          <Settings className="w-4 h-4 glow-purple" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hover:text-destructive"
                          onClick={() =>
                            removeDevice.mutate({ deviceId: device.id })
                          }
                          disabled={removeDevice.isPending}
                          title="Remove Device"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-neon-cyan">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Devices</p>
                <p className="text-3xl font-bold glow-cyan">{devices?.length || 0}</p>
              </div>
              <Smartphone className="w-8 h-8 glow-cyan opacity-50" />
            </div>
          </div>
          <div className="card-neon">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-3xl font-bold glow-purple">
                  {devices?.filter((d) => d.status === "online").length || 0}
                </p>
              </div>
              <div className="status-online w-6 h-6"></div>
            </div>
          </div>
          <div className="card-neon-cyan">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-3xl font-bold">
                  {devices?.filter((d) => d.status === "offline").length || 0}
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
