import React from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Smartphone, Lock, User, Eye, EyeOff, Shield, Mail, KeyRound, ArrowLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface LoginPageProps {
  onSuccess?: () => void;
}

type LoginStep = "login" | "twofa" | "forgot" | "reset-sent";

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = React.useState<LoginStep>("login");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [pending2FAUserId, setPending2FAUserId] = React.useState<number | null>(null);
  const [resetEmail, setResetEmail] = React.useState("");

  const { isAuthenticated } = trpc.auth.me.useQuery(undefined, { 
    enabled: false, // We check manually or let App handle it
  });

  const utils = trpc.useUtils();

const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data: any) => {
      if (data.requires2FA) {
        setPending2FAUserId(data.userId);
        setStep("twofa");
        toast.info("Código de verificación enviado.");
        setLoading(false);
      } else {
        toast.success("¡Bienvenido!");
        utils.auth.me.invalidate();
        
        // FORMO DIRECTO - Sin delay
        // window.location.origin incluye el protocolo y dominio
        window.location.href = window.location.origin + "/dashboard";
      }
    },
    onError: (error: any) => {
      setLoading(false);
      console.error("[LOGIN ERROR]:", error);
      const message = error?.message || "Error de conexión";
      if (message.includes("fetch") || message.includes("network") || message.includes("ERR_") || message.includes("Failed to fetch")) {
        toast.error("Error de conexión. Verifica tu internet.");
      } else {
        toast.error(message);
      }
    },
  });

  const verify2FAMutation = trpc.auth.verifyEmail2FA.useMutation({
    onSuccess: () => {
      toast.success("¡Verificación exitosa!");
      utils.auth.me.invalidate();
      const dashboardUrl = window.location.origin + "/dashboard";
      console.log("[2FA] Redirecting to:", dashboardUrl);
      window.location.replace(dashboardUrl);
    },
    onError: (error: any) => {
      toast.error(error.message || "Código incorrecto o expirado");
      setLoading(false);
    },
  });

  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setStep("reset-sent");
      setLoading(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al enviar el correo");
      setLoading(false);
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Por favor ingresa usuario y contraseña");
      return;
    }
    setLoading(true);
    
    console.log("[LOGIN] Attempting login for:", username);
    
    loginMutation.mutate({ username: username.trim(), password });
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error("El código debe tener 6 dígitos");
      return;
    }
    setLoading(true);
    verify2FAMutation.mutate({ userId: pending2FAUserId!, otp: otpCode });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error("Ingresa tu correo electrónico");
      return;
    }
    setLoading(true);
    resetMutation.mutate({ email: resetEmail.trim() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden transition-colors duration-500">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 technical-grid opacity-30" />
      
      {theme === "dark" && (
        <>
          <div className="cyber-scanline" />
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 blur-[150px] rounded-full" />
        </>
      )}
      
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-2xl bg-card border border-border text-muted-foreground hover:text-primary transition-all z-20 shadow-sm"
      >
        {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <div className="relative w-full max-w-lg px-6 z-10">
        {/* Logo & Header */}
        <div className="text-center mb-12 group">
          <div className="inline-flex items-center justify-center w-24 h-24 glass-panel mb-6 shadow-sm dark:shadow-[0_0_50px_var(--glow-color)] group-hover:scale-105 transition-all duration-700 bg-white dark:bg-[#050810]/60">
            <Smartphone className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight uppercase text-slate-900 dark:gradient-text mb-3">
            ADM_OS
          </h1>
          <p className="text-slate-400 dark:text-primary/70 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">
            Protocolo de Acceso Seguro
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto opacity-30" />
        </div>

        {/* Auth Card */}
        <div className="glass-panel p-10 relative overflow-hidden group bg-white/90 dark:bg-[#050810]/80 backdrop-blur-xl transition-all duration-500 shadow-2xl border-slate-200/50 dark:border-primary/20">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary via-secondary to-transparent opacity-50" />
          
          {/* ─── STEP: LOGIN ─── */}
          {step === "login" && (
            <>
              <div className="flex items-center gap-3 mb-10">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-foreground/80">Auth_Sequence</h2>
              </div>
              <form onSubmit={handleLogin} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Terminal_ID</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                    <input 
                      type="text" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="USER@NETWORK.NET" 
                      className="input-sapsan w-full pl-12 pr-4 py-4 text-sm" 
                      disabled={loading} 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Pass_Key</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      className="input-sapsan w-full pl-12 pr-14 py-4 text-sm" 
                      disabled={loading} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full btn-sapsan py-4 font-black uppercase tracking-[0.3em] text-xs h-14 flex items-center justify-center gap-3 transition-all"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />ANALYZING...</>
                  ) : (
                    <>INICIAR_SESIÓN<ArrowLeft className="w-4 h-4 rotate-180 transition-transform" /></>
                  )}
                </button>
              </form>
              <button 
                onClick={() => setStep("forgot")} 
                className="w-full mt-8 text-[9px] font-black text-muted-foreground hover:text-primary uppercase tracking-widest transition-colors text-center italic"
              >
                ¿Credenciales perdidas? Recuperar enlace_
              </button>
            </>
          )}

          {/* ─── STEP: 2FA ─── */}
          {step === "twofa" && (
            <>
               <div className="flex items-center gap-3 mb-10">
                <KeyRound className="w-5 h-5 text-primary animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary italic">Verify_Identity</h2>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-8 leading-relaxed italic">
                Carga de token de seguridad... Inyecta el código de 6 dígitos enviado a tu nodo de comunicación.
              </p>
              <form onSubmit={handle2FA} className="space-y-8">
                <div className="space-y-3">
                  <input 
                    type="text" 
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} 
                    placeholder="000000" 
                    className="input-neon w-full text-center text-4xl tracking-[0.6em] py-6" 
                    disabled={loading} 
                    maxLength={6} 
                    inputMode="numeric" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading || otpCode.length !== 6} 
                  className="w-full btn-neon py-4 font-black h-14 uppercase tracking-[0.3em] text-xs transition-all"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />DECRYPTING...</>
                  ) : "AUTENTICAR_TOKEN"}
                </button>
              </form>
              <button 
                onClick={() => { setStep("login"); setOtpCode(""); }} 
                className="flex items-center gap-2 mt-8 text-[9px] font-black text-muted-foreground hover:text-primary uppercase tracking-widest transition-colors mx-auto italic"
              >
                <ArrowLeft className="w-4 h-4" /> ABORTAR_SECUENCIA
              </button>
            </>
          )}

          {/* ─── STEP: FORGOT PASSWORD ─── */}
          {step === "forgot" && (
            <>
               <div className="flex items-center gap-3 mb-10">
                <Mail className="w-5 h-5 text-primary animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-foreground italic">Recovery_Link</h2>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-8 leading-relaxed italic">
                Enviando sonda de recuperación... Ingresa tu dirección de red para recibir el enlace de acceso.
              </p>
              <form onSubmit={handleForgot} className="space-y-8">
                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                    <input 
                      type="email" 
                      value={resetEmail} 
                      onChange={(e) => setResetEmail(e.target.value)} 
                      placeholder="USER@NETWORK.NET" 
                      className="input-neon w-full pl-12 pr-4 py-4 text-sm" 
                      disabled={loading} 
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full btn-neon py-4 text-xs h-14 font-black uppercase tracking-[0.3em] transition-all"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />SENDING...</>
                  ) : "ENVIAR_SONDA"}
                </button>
              </form>
              <button 
                onClick={() => setStep("login")} 
                className="flex items-center gap-2 mt-8 text-[9px] font-black text-muted-foreground hover:text-primary uppercase tracking-widest transition-colors mx-auto italic"
              >
                <ArrowLeft className="w-4 h-4" /> VOLVER_AL_NODO
              </button>
            </>
          )}

          {/* ─── STEP: EMAIL SENT ─── */}
          {step === "reset-sent" && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 border border-primary/20 rounded-full mb-8 shadow-lg">
                <Mail className="w-10 h-10 text-primary animate-bounce" />
              </div>
              <h2 className="text-xl font-black text-foreground uppercase tracking-tighter italic mb-4">¡SONDA ENVIADA!</h2>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-10 leading-relaxed italic">
                Sincronización en proceso. Revisa tu inbox para completar la secuencia de restablecimiento.
              </p>
              <button 
                onClick={() => setStep("login")} 
                className="text-[9px] font-black text-primary hover:text-foreground uppercase tracking-[0.3em] flex items-center gap-2 mx-auto transition-all bg-muted px-6 py-3 rounded-full border border-border"
              >
                <ArrowLeft className="w-4 h-4" /> RETORNAR_LOGIN
              </button>
            </div>
          )}
        </div>

         {/* System Footer */}
        <div className="mt-12 text-center overflow-hidden">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] italic">SECURE_ENVIRONMENT</span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent via-primary/30 to-transparent" />
          </div>
          <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] animate-pulse">
            ENCRYPTED WITH AES-256-GCM • STATUS: NOMINAL
          </p>
        </div>
      </div>
    </div>
  );
}
