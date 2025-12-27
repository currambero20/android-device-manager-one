import { useState, useEffect } from "react";
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
  MapPin,
  MessageSquare,
  Smartphone,
  Activity,
  Signal,
  Battery,
  Search,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { useWebSocket, type DeviceLocation, type SMSMessage } from "@/hooks/useWebSocket";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Device {
  id: number;
  deviceName: string;
  phoneNumber: string;
  status: "online" | "offline" | "inactive";
  batteryLevel: number;
  signalStrength: number;
}

export default function DeviceMonitoring() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMap, setShowMap] = useState(true);

  // Mock devices data
  const devices: Device[] = [
    {
      id: 1,
      deviceName: "Samsung Galaxy S21",
      phoneNumber: "+1234567890",
      status: "online",
      batteryLevel: 85,
      signalStrength: 4,
    },
    {
      id: 2,
      deviceName: "Google Pixel 6",
      phoneNumber: "+0987654321",
      status: "online",
      batteryLevel: 62,
      signalStrength: 3,
    },
    {
      id: 3,
      deviceName: "OnePlus 9",
      phoneNumber: "+1122334455",
      status: "offline",
      batteryLevel: 15,
      signalStrength: 1,
    },
  ];

  const { isConnected, getLocation, getSmsMessages, joinDevice, leaveDevice } =
    useWebSocket();

  // Auto-select first device
  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [selectedDeviceId]);

  // Join/leave device on selection
  useEffect(() => {
    if (selectedDeviceId) {
      joinDevice(selectedDeviceId);
      return () => {
        leaveDevice(selectedDeviceId);
      };
    }
  }, [selectedDeviceId, joinDevice, leaveDevice]);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const currentLocation = selectedDeviceId ? getLocation(selectedDeviceId) : undefined;
  const smsMessages = selectedDeviceId ? getSmsMessages(selectedDeviceId) : [];

  const filteredDevices = devices.filter(
    (device) =>
      device.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.phoneNumber.includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-400 bg-green-500/10";
      case "offline":
        return "text-red-400 bg-red-500/10";
      default:
        return "text-yellow-400 bg-yellow-500/10";
    }
  };

  const getSignalBars = (strength: number) => {
    return "▁".repeat(strength) + "▔".repeat(5 - strength);
  };

  return (
    <DashboardLayout title="Device Monitoring">
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center gap-3 p-4 card-neon">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
            }`}
          ></div>
          <span className="text-sm">
            WebSocket: <span className="font-bold">{isConnected ? "Connected" : "Disconnected"}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device List */}
          <div className="card-neon">
            <h3 className="text-lg font-bold mb-4 glow-cyan">Devices</h3>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-neon pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredDevices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => setSelectedDeviceId(device.id)}
                  className={`w-full p-3 rounded border-2 transition-all text-left ${
                    selectedDeviceId === device.id
                      ? "border-glow-cyan bg-cyan-500/10"
                      : "border-glow-cyan/30 bg-accent/5 hover:bg-accent/10"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-sm">{device.deviceName}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded font-bold ${getStatusColor(
                        device.status
                      )}`}
                    >
                      {device.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{device.phoneNumber}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Battery className="w-3 h-3" />
                      <span>{device.batteryLevel}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Signal className="w-3 h-3" />
                      <span>{getSignalBars(device.signalStrength)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {selectedDevice ? (
              <>
                {/* Device Info */}
                <div className="card-neon-cyan">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold glow-cyan">{selectedDevice.deviceName}</h3>
                      <p className="text-sm text-muted-foreground">{selectedDevice.phoneNumber}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button className="btn-neon" size="sm">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button className="btn-neon-cyan" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-accent/10 rounded">
                      <p className="text-xs text-muted-foreground mb-1">Battery</p>
                      <p className="text-lg font-bold">{selectedDevice.batteryLevel}%</p>
                    </div>
                    <div className="p-3 bg-accent/10 rounded">
                      <p className="text-xs text-muted-foreground mb-1">Signal</p>
                      <p className="text-lg font-bold">{getSignalBars(selectedDevice.signalStrength)}</p>
                    </div>
                    <div className="p-3 bg-accent/10 rounded">
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className={`font-bold ${getStatusColor(selectedDevice.status)}`}>
                        {selectedDevice.status.toUpperCase()}
                      </p>
                    </div>
                    <div className="p-3 bg-accent/10 rounded">
                      <p className="text-xs text-muted-foreground mb-1">Last Update</p>
                      <p className="text-sm font-bold">
                        {currentLocation
                          ? formatDistanceToNow(new Date(currentLocation.timestamp), {
                              addSuffix: true,
                            })
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabs for GPS and SMS */}
                <Tabs defaultValue="gps" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-card border-glow-cyan">
                    <TabsTrigger value="gps" className="data-[state=active]:bg-accent/20">
                      <MapPin className="w-4 h-4 mr-2" />
                      GPS Location
                    </TabsTrigger>
                    <TabsTrigger value="sms" className="data-[state=active]:bg-accent/20">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      SMS ({smsMessages.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* GPS Tab */}
                  <TabsContent value="gps" className="card-neon mt-4">
                    {currentLocation ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Latitude</p>
                            <p className="text-sm font-mono font-bold">{currentLocation.latitude.toFixed(6)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Longitude</p>
                            <p className="text-sm font-mono font-bold">{currentLocation.longitude.toFixed(6)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                            <p className="text-sm font-bold">{currentLocation.accuracy.toFixed(2)}m</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Timestamp</p>
                            <p className="text-sm font-bold">
                              {formatDistanceToNow(new Date(currentLocation.timestamp), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          {currentLocation.speed !== undefined && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Speed</p>
                              <p className="text-sm font-bold">{currentLocation.speed.toFixed(2)} m/s</p>
                            </div>
                          )}
                          {currentLocation.bearing !== undefined && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Bearing</p>
                              <p className="text-sm font-bold">{currentLocation.bearing.toFixed(2)}°</p>
                            </div>
                          )}
                        </div>

                        {/* Map Placeholder */}
                        <div className="mt-4">
                          <button
                            onClick={() => setShowMap(!showMap)}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-accent/10 rounded hover:bg-accent/20 transition-colors"
                          >
                            {showMap ? (
                              <>
                                <EyeOff className="w-4 h-4" />
                                Hide Map
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                Show Map
                              </>
                            )}
                          </button>
                        </div>

                        {showMap && (
                          <div className="w-full h-64 bg-accent/10 rounded border-2 border-glow-cyan/30 flex items-center justify-center">
                            <div className="text-center">
                              <MapPin className="w-12 h-12 glow-cyan mx-auto mb-2 opacity-50" />
                              <p className="text-sm text-muted-foreground">
                                Map view coming soon
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <MapPin className="w-12 h-12 glow-cyan mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No location data available</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* SMS Tab */}
                  <TabsContent value="sms" className="card-neon mt-4">
                    {smsMessages.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {smsMessages.map((sms, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded border-l-4 ${
                              sms.direction === "incoming"
                                ? "border-green-400 bg-green-500/10"
                                : "border-blue-400 bg-blue-500/10"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-bold text-sm">{sms.phoneNumber}</p>
                                <p className="text-xs text-muted-foreground">
                                  {sms.direction === "incoming" ? "Received" : "Sent"}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(sms.timestamp), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            <p className="text-sm break-words">{sms.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 glow-cyan mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No SMS messages</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="card-neon text-center py-12">
                <Smartphone className="w-12 h-12 glow-cyan mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Select a device to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
