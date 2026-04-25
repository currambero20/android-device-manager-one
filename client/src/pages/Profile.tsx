import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { User, Lock, Save, Key, Shield, Mail, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Profile() {
  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.me.useQuery();
  
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(!!(user as any)?.twoFactorEnabled);

  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil actualizado correctamente");
      setPassword("");
      setConfirmPassword("");
      utils.auth.me.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const toggle2FAMutation = trpc.auth.toggleTwoFactor.useMutation({
    onSuccess: (_, variables) => {
      setTwoFactorEnabled(variables.enabled);
      toast.success(variables.enabled ? "2FA activado. Se enviarán códigos a tu correo al iniciar sesión." : "2FA desactivado.");
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password && password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    updateProfileMutation.mutate({
      name: name || undefined,
      password: password || undefined,
    });
  };

  return (
    <DashboardLayout title="Perfil de Usuario">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="glass-panel bg-white dark:bg-black/60 border-slate-200 dark:border-cyan-500/20 shadow-sm dark:shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary dark:glow-cyan">
              <User className="w-5 h-5" />
              Configuración de Cuenta
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-gray-400">
              Actualiza tu información personal y credenciales de seguridad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-gray-200">Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-muted-foreground" />
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="input-neon bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-gray-200">Correo electrónico</label>
                <Input value={user?.email || ""} disabled className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white opacity-50 cursor-not-allowed" />
                <p className="text-xs text-slate-500 dark:text-muted-foreground">El correo no se puede cambiar por razones de seguridad.</p>
              </div>

              <div className="border-t border-slate-100 dark:border-glow-cyan/20 pt-4 mt-6">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-primary dark:text-cyan-400">
                  <Lock className="w-4 h-4" /> Cambiar Contraseña
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-gray-200">Nueva Contraseña</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-muted-foreground" />
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-neon bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-gray-200">Confirmar Contraseña</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-muted-foreground" />
                      <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input-neon bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white pl-10" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-2">Deja en blanco si no deseas cambiar tu contraseña.</p>
              </div>

              <Button type="submit" className="btn-neon-cyan w-full mt-6 bg-primary dark:bg-transparent text-white dark:text-cyan-400 border-primary dark:border-cyan-500 hover:bg-primary/90 dark:hover:bg-cyan-500/10" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Guardando..." : (<><Save className="w-4 h-4 mr-2" />Guardar Cambios</>)}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 2FA Toggle Card */}
        <Card className="glass-panel bg-white dark:bg-black/60 border-slate-200 dark:border-violet-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
              <Mail className="w-5 h-5" />
              Verificación en 2 Pasos (2FA)
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-gray-400">
              Al activarla, recibirás un código de 6 dígitos por correo cada vez que inicies sesión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-violet-500/30 bg-slate-50 dark:bg-violet-500/5">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-gray-200">{twoFactorEnabled ? "✅ 2FA Activado" : "❌ 2FA Desactivado"}</p>
                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">
                  {twoFactorEnabled
                    ? `Códigos enviados a ${user?.email}`
                    : "Activa esta opción para mayor seguridad"}
                </p>
              </div>
              <button
                onClick={() => toggle2FAMutation.mutate({ enabled: !twoFactorEnabled })}
                disabled={toggle2FAMutation.isPending}
                className="transition-all"
              >
                {twoFactorEnabled
                  ? <ToggleRight className="w-12 h-12 text-violet-500" />
                  : <ToggleLeft className="w-12 h-12 text-gray-400" />}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <div className="bg-slate-100 dark:bg-black/40 p-4 border border-slate-200 dark:border-cyan-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary dark:text-cyan-400 mt-1" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-gray-200">Consejo de Seguridad</p>
              <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">
                Usa una contraseña fuerte y activa la verificación en 2 pasos para proteger tu cuenta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
