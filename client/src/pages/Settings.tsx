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
import { Switch } from "@/components/ui/switch";
import {
  Settings as SettingsIcon,
  Bell,
  Lock,
  Palette,
  Database,
  Shield,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Settings() {
  const { user, refresh } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [settings, setSettings] = useState({
    // General
    appName: "Android Device Manager",
    appUrl: "https://repodeploy.vercel.app",
    
    // Security
    enableTwoFactor: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    forceHttps: true,
    enableApiKey: true,
    apiKey: "sk_live_v3_15_adm_default_key",
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    notifyOnDeviceOffline: true,
    notifyOnSuspiciousActivity: true,
    
    // Database
    autoBackup: true,
    backupFrequency: "daily",
    retentionDays: 90,
    
    // Appearance
    darkMode: true,
    compactMode: false,
  });

  const { data: remoteSettings, refetch: refetchSettings } = trpc.settings.getAll.useQuery();
  const saveSettingsMutation = trpc.settings.setBatch.useMutation({
    onSuccess: () => {
      toast.success("Configuración guardada en el servidor");
      refetchSettings();
    },
    onError: (err) => {
      toast.error("Error al guardar: " + err.message);
    }
  });

  // Sync with remote settings on load
  useEffect(() => {
    if (remoteSettings && remoteSettings.length > 0) {
      const newSettings = { ...settings };
      remoteSettings.forEach((s: any) => {
        if (s.key in newSettings) {
          try {
            const val = JSON.parse(s.value);
            (newSettings as any)[s.key] = val;
          } catch {
            (newSettings as any)[s.key] = s.value;
          }
        }
      });
      setSettings(newSettings);
    }
  }, [remoteSettings]);

  // Sync with real user 2FA state
  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        enableTwoFactor: !!(user as any).twoFactorEnabled
      }));
    }
  }, [user]);

  const toggle2FAMutation = trpc.auth.toggleTwoFactor.useMutation({
    onSuccess: () => {
      toast.success("Seguridad de cuenta actualizada");
      refresh();
    },
    onError: (error) => {
      toast.error("Error al actualizar seguridad: " + error.message);
    }
  });

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(settings.apiKey);
    setCopied(true);
    toast.success("API Key copiada al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = () => {
    // 1. Save 2FA to backend if changed
    if (user && !!(user as any).twoFactorEnabled !== settings.enableTwoFactor) {
      toggle2FAMutation.mutate({ enabled: settings.enableTwoFactor });
    }
    
    // 2. Save all other settings to globalSettings table
    const settingsToSave: Record<string, string> = {};
    Object.entries(settings).forEach(([key, value]) => {
      settingsToSave[key] = JSON.stringify(value);
    });
    
    saveSettingsMutation.mutate(settingsToSave);
  };

  const handleResetSettings = () => {
    if (confirm("¿Estás seguro de que deseas restablecer todos los ajustes?")) {
      toast.success("Ajustes restablecidos");
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-card border-glow-cyan">
            <TabsTrigger value="general" className="data-[state=active]:bg-accent/20 text-xs">
              <SettingsIcon className="w-4 h-4 mr-1" />
              General
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-accent/20 text-xs">
              <Lock className="w-4 h-4 mr-1" />
              Seguridad
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-accent/20 text-xs">
              <Bell className="w-4 h-4 mr-1" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="database" className="data-[state=active]:bg-accent/20 text-xs">
              <Database className="w-4 h-4 mr-1" />
              Base de Datos
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-accent/20 text-xs">
              <Palette className="w-4 h-4 mr-1" />
              Apariencia
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <div className="card-neon">
              <h3 className="text-lg font-bold mb-4 glow-cyan">Ajustes de Aplicación</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium glow-cyan mb-2 block">
                    Nombre de la Aplicación
                  </label>
                  <Input
                    value={settings.appName}
                    onChange={(e) =>
                      setSettings({ ...settings, appName: e.target.value })
                    }
                    className="input-neon"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium glow-cyan mb-2 block">
                    URL de la Aplicación
                  </label>
                  <Input
                    value={settings.appUrl}
                    onChange={(e) =>
                      setSettings({ ...settings, appUrl: e.target.value })
                    }
                    className="input-neon"
                  />
                </div>
              </div>
            </div>

            <div className="card-neon-cyan">
              <h3 className="text-lg font-bold mb-4 glow-cyan">Información del Sistema</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                  <span className="text-muted-foreground">Versión:</span>
                  <span className="font-bold text-cyan-400">V3.25</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className="text-green-400 font-bold">Estable</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                  <span className="text-muted-foreground">Entorno:</span>
                  <span className="font-bold">Producción</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                  <span className="text-muted-foreground">Última Actualización:</span>
                  <span className="font-mono text-xs">2024-03-18 (Security Update)</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <div className="card-neon">
              <h3 className="text-lg font-bold mb-4 glow-cyan flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Opciones de Seguridad
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                  <div>
                    <p className="font-medium">Autenticación de Dos Factores (2FA)</p>
                    <p className="text-sm text-muted-foreground">Requerir código OTP vía Email (Gmail Service)</p>
                  </div>
                  <Switch
                    checked={settings.enableTwoFactor}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enableTwoFactor: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                  <div>
                    <p className="font-medium">Force HTTPS</p>
                    <p className="text-sm text-muted-foreground">Redirect all traffic to HTTPS</p>
                  </div>
                  <Switch
                    checked={settings.forceHttps}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, forceHttps: checked })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium glow-cyan mb-2 block">
                    Session Timeout (minutes)
                  </label>
                  <Input
                    type="number"
                    min="5"
                    max="480"
                    value={settings.sessionTimeout}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sessionTimeout: parseInt(e.target.value),
                      })
                    }
                    className="input-neon"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium glow-cyan mb-2 block">
                    Max Login Attempts
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxLoginAttempts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxLoginAttempts: parseInt(e.target.value),
                      })
                    }
                    className="input-neon"
                  />
                </div>
              </div>
            </div>

            {/* API Key */}
            <div className="card-neon-cyan">
              <h3 className="text-lg font-bold mb-4 glow-cyan">API Key Management</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                  <div>
                    <p className="font-medium">Enable API Access</p>
                    <p className="text-sm text-muted-foreground">Allow external API access</p>
                  </div>
                  <Switch
                    checked={settings.enableApiKey}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enableApiKey: checked })
                    }
                  />
                </div>

                {settings.enableApiKey && (
                  <div>
                    <label className="text-sm font-medium glow-cyan mb-2 block">
                      API Key
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={settings.apiKey}
                        readOnly
                        className="input-neon font-mono text-xs"
                      />
                      <Button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="btn-neon"
                        size="sm"
                      >
                        {showApiKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        onClick={handleCopyApiKey}
                        className="btn-neon-cyan"
                        size="sm"
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Keep this key secret. Do not share it publicly.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="card-neon">
              <h3 className="text-lg font-bold mb-4 glow-cyan">Notification Channels</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, emailNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive alerts via SMS</p>
                  </div>
                  <Switch
                    checked={settings.smsNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, smsNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive in-app alerts</p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, pushNotifications: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="card-neon-cyan">
              <h3 className="text-lg font-bold mb-4 glow-cyan">Alert Triggers</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                  <div>
                    <p className="font-medium">Device Offline</p>
                    <p className="text-sm text-muted-foreground">Alert when device goes offline</p>
                  </div>
                  <Switch
                    checked={settings.notifyOnDeviceOffline}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, notifyOnDeviceOffline: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                  <div>
                    <p className="font-medium">Suspicious Activity</p>
                    <p className="text-sm text-muted-foreground">
                      Alert on unusual device behavior
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifyOnSuspiciousActivity}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, notifyOnSuspiciousActivity: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Database Settings */}
          <TabsContent value="database" className="space-y-6">
            <div className="card-neon">
              <h3 className="text-lg font-bold mb-4 glow-cyan">Backup Configuration</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                  <div>
                    <p className="font-medium">Auto Backup</p>
                    <p className="text-sm text-muted-foreground">Automatically backup database</p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoBackup: checked })
                    }
                  />
                </div>

                {settings.autoBackup && (
                  <>
                    <div>
                      <label className="text-sm font-medium glow-cyan mb-2 block">
                        Backup Frequency
                      </label>
                      <select
                        value={settings.backupFrequency}
                        onChange={(e) =>
                          setSettings({ ...settings, backupFrequency: e.target.value })
                        }
                        className="input-neon w-full"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium glow-cyan mb-2 block">
                        Retention Period (days)
                      </label>
                      <Input
                        type="number"
                        min="7"
                        max="365"
                        value={settings.retentionDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            retentionDays: parseInt(e.target.value),
                          })
                        }
                        className="input-neon"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="card-neon-cyan">
              <h3 className="text-lg font-bold mb-4 glow-cyan">Database Status</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="text-green-400 font-bold">Connected</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-mono text-xs">2.4 GB</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-accent/10 rounded">
                  <span className="text-muted-foreground">Last Backup:</span>
                  <span className="font-mono text-xs">2025-01-22 18:00:00</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="card-neon">
              <h3 className="text-lg font-bold mb-4 glow-cyan">Theme Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-muted-foreground">Use dark theme</p>
                  </div>
                  <Switch
                    checked={settings.darkMode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, darkMode: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/10 rounded">
                  <div>
                    <p className="font-medium">Compact Mode</p>
                    <p className="text-sm text-muted-foreground">Reduce spacing and padding</p>
                  </div>
                  <Switch
                    checked={settings.compactMode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, compactMode: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            onClick={handleResetSettings}
            variant="outline"
            className="btn-neon"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSaveSettings}
            className="btn-neon-cyan"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
