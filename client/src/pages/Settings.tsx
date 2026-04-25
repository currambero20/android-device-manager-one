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
import { useTheme } from "@/contexts/ThemeContext";

export default function Settings() {
  const { user, refresh } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
          <TabsList className="grid w-full grid-cols-5 bg-slate-100 dark:bg-card border border-slate-200 dark:border-glow-cyan/20">
            <TabsTrigger value="general" className="data-[state=active]:bg-white dark:data-[state=active]:bg-accent/20 text-xs text-slate-500 dark:text-muted-foreground data-[state=active]:text-primary dark:data-[state=active]:text-cyan-400">
              <SettingsIcon className="w-4 h-4 mr-1" />
              General
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-white dark:data-[state=active]:bg-accent/20 text-xs text-slate-500 dark:text-muted-foreground data-[state=active]:text-primary dark:data-[state=active]:text-cyan-400">
              <Lock className="w-4 h-4 mr-1" />
              Seguridad
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-white dark:data-[state=active]:bg-accent/20 text-xs text-slate-500 dark:text-muted-foreground data-[state=active]:text-primary dark:data-[state=active]:text-cyan-400">
              <Bell className="w-4 h-4 mr-1" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="database" className="data-[state=active]:bg-white dark:data-[state=active]:bg-accent/20 text-xs text-slate-500 dark:text-muted-foreground data-[state=active]:text-primary dark:data-[state=active]:text-cyan-400">
              <Database className="w-4 h-4 mr-1" />
              Base de Datos
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-white dark:data-[state=active]:bg-accent/20 text-xs text-slate-500 dark:text-muted-foreground data-[state=active]:text-primary dark:data-[state=active]:text-cyan-400">
              <Palette className="w-4 h-4 mr-1" />
              Apariencia
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <div className="glass-panel p-6 bg-white dark:bg-black/60 border-slate-200 dark:border-cyan-500/20 shadow-sm dark:shadow-[0_0_40px_rgba(0,0,0,0.5)]">
              <h3 className="text-lg font-bold mb-4 text-primary dark:glow-cyan">Ajustes de Aplicación</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:glow-cyan mb-2 block">
                    Nombre de la Aplicación
                  </label>
                  <Input
                    value={settings.appName}
                    onChange={(e) =>
                      setSettings({ ...settings, appName: e.target.value })
                    }
                    className="input-neon bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:glow-cyan mb-2 block">
                    URL de la Aplicación
                  </label>
                  <Input
                    value={settings.appUrl}
                    onChange={(e) =>
                      setSettings({ ...settings, appUrl: e.target.value })
                    }
                    className="input-neon bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-black/40 p-6 border border-slate-200 dark:border-cyan-500/20 rounded-xl">
              <h3 className="text-lg font-bold mb-4 text-primary dark:glow-cyan">Información del Sistema</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-accent/10 border border-slate-200 dark:border-transparent rounded shadow-sm dark:shadow-none">
                  <span className="text-slate-500 dark:text-muted-foreground">Versión:</span>
                  <span className="font-bold text-primary dark:text-cyan-400">Enterprise Edition</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-accent/10 border border-slate-200 dark:border-transparent rounded shadow-sm dark:shadow-none">
                  <span className="text-slate-500 dark:text-muted-foreground">Estado:</span>
                  <span className="text-green-600 dark:text-green-400 font-bold">Estable</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-accent/10 border border-slate-200 dark:border-transparent rounded shadow-sm dark:shadow-none">
                  <span className="text-slate-500 dark:text-muted-foreground">Entorno:</span>
                  <span className="font-bold text-slate-900 dark:text-white">Producción</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-accent/10 border border-slate-200 dark:border-transparent rounded shadow-sm dark:shadow-none">
                  <span className="text-slate-500 dark:text-muted-foreground">Última Actualización:</span>
                  <span className="font-mono text-xs text-slate-900 dark:text-white">2024-03-18 (Security Update)</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <div className="glass-panel p-6 bg-white dark:bg-black/60 border-slate-200 dark:border-cyan-500/20">
              <h3 className="text-lg font-bold mb-4 text-primary dark:glow-cyan flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Opciones de Seguridad
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-accent/10 border border-slate-200 dark:border-transparent rounded">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Autenticación de Dos Factores (2FA)</p>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">Requerir código OTP vía Email (Gmail Service)</p>
                  </div>
                  <Switch
                    checked={settings.enableTwoFactor}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enableTwoFactor: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-accent/10 border border-slate-200 dark:border-transparent rounded">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Force HTTPS</p>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">Redirect all traffic to HTTPS</p>
                  </div>
                  <Switch
                    checked={settings.forceHttps}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, forceHttps: checked })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:glow-cyan mb-2 block">
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
                    className="input-neon bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:glow-cyan mb-2 block">
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
                    className="input-neon bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* API Key */}
            <div className="bg-slate-50 dark:bg-black/40 p-6 border border-slate-200 dark:border-cyan-500/20 rounded-xl">
              <h3 className="text-lg font-bold mb-4 text-primary dark:glow-cyan">API Key Management</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-accent/10 border border-slate-200 dark:border-transparent rounded shadow-sm dark:shadow-none">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Enable API Access</p>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">Allow external API access</p>
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
                    <label className="text-sm font-medium text-slate-700 dark:glow-cyan mb-2 block">
                      API Key
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={settings.apiKey}
                        readOnly
                        className="input-neon bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                      />
                      <Button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="bg-slate-200 dark:bg-transparent border border-slate-300 dark:border-cyan-500 text-slate-700 dark:text-cyan-400 hover:bg-slate-300 dark:hover:bg-cyan-500/10"
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
                        className="bg-primary dark:bg-transparent border border-primary dark:border-cyan-500 text-white dark:text-cyan-400 hover:bg-primary/90 dark:hover:bg-cyan-500/10"
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
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => {
                      setSettings(prev => ({ ...prev, darkMode: checked }));
                      if((checked && theme === "light") || (!checked && theme === "dark")) {
                        toggleTheme?.();
                      }
                    }}
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
            className="border-slate-200 dark:border-cyan-500 text-slate-500 dark:text-cyan-400 hover:bg-slate-100 dark:hover:bg-cyan-500/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSaveSettings}
            className="bg-primary dark:bg-transparent border border-primary dark:border-cyan-500 text-white dark:text-cyan-400 hover:bg-primary/90 dark:hover:bg-cyan-500/10"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
