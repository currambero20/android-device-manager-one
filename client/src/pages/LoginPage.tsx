import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Smartphone, Lock, User, Eye, EyeOff, Shield, Mail, KeyRound, ArrowLeft } from "lucide-react";

interface LoginPageProps {
  onSuccess?: () => void;
}

type LoginStep = "login" | "twofa" | "forgot" | "reset-sent";

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [step, setStep] = useState<LoginStep>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pending2FAUserId, setPending2FAUserId] = useState<number | null>(null);
  const [resetEmail, setResetEmail] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data: any) => {
      if (data.requires2FA) {
        setPending2FAUserId(data.userId);
        setStep("twofa");
        toast.info("Código de verificación enviado a tu correo.");
        setLoading(false);
      } else {
        toast.success("¡Bienvenido al sistema!");
        window.location.reload();
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al iniciar sesión");
      setLoading(false);
    },
  });

  const verify2FAMutation = trpc.auth.verifyEmail2FA.useMutation({
    onSuccess: () => {
      toast.success("¡Verificación exitosa!");
      window.location.reload();
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
    <div className="min-h-screen flex items-center justify-center bg-transparent relative overflow-hidden font-sans">
      <div className="cyber-scanline" />
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />

      <div className="relative w-full max-w-lg px-6 z-10">
        {/* Logo & Header */}
        <div className="text-center mb-12 group">
          <div className="inline-flex items-center justify-center w-24 h-24 glass-panel border-cyan-500/20 mb-6 shadow-[0_0_30px_rgba(34,211,238,0.2)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
            <Smartphone className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase gradient-text italic mb-3">
            ADM_OS v4.0
          </h1>
          <p className="text-cyan-500/50 text-[10px] font-black uppercase tracking-[0.4em] italic mb-2">
            Protocolo de Acceso Seguro de Nivel 7
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto opacity-30" />
        </div>

        {/* Login Card */}
        <div className="glass-panel border-cyan-500/20 shadow-2xl p-10 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
          
          {/* ─── STEP: LOGIN ─── */}
          {step === "login" && (
            <>
              <div className="flex items-center gap-3 mb-10">
                <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-100 italic">Auth_Sequence</h2>
              </div>
              <form onSubmit={handleLogin} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest ml-1">Terminal_ID</label>
                  <div className="relative group/input">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-900 group-focus-within/input:text-cyan-400 transition-colors" />
                    <input 
                      type="text" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="USER@NETWORK.NET" 
                      className="w-full pl-12 pr-4 py-4 bg-black/40 border border-cyan-500/10 rounded-2xl text-cyan-100 placeholder-cyan-900 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all font-mono text-sm tracking-tight" 
                      disabled={loading} 
                      autoComplete="username" 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest ml-1">Pass_Key</label>
                  <div className="relative group/input">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-900 group-focus-within/input:text-cyan-400 transition-colors" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      className="w-full pl-12 pr-14 py-4 bg-black/40 border border-cyan-500/10 rounded-2xl text-cyan-100 placeholder-cyan-900 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all font-mono text-sm" 
                      disabled={loading} 
                      autoComplete="current-password" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-900 hover:text-cyan-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn-neon-cyan w-full py-4 font-black uppercase tracking-[0.3em] text-xs h-14 flex items-center justify-center gap-3 group/btn hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />ANALYZING...</>
                  ) : (
                    <>INICIAR_SESIÓN<ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
              </form>
              <button 
                onClick={() => setStep("forgot")} 
                className="w-full mt-8 text-[9px] font-black text-cyan-900 hover:text-cyan-400 uppercase tracking-widest transition-colors text-center italic"
              >
                ¿Credenciales perdidas? Recuperar enlace_
              </button>
            </>
          )}

          {/* ─── STEP: 2FA ─── */}
          {step === "twofa" && (
            <>
              <div className="flex items-center gap-3 mb-10">
                <KeyRound className="w-5 h-5 text-fuchsia-400 animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-fuchsia-400 italic">Verify_Identity</h2>
              </div>
              <p className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest mb-8 leading-relaxed italic">
                Carga de token de seguridad... Inyecta el código de 6 dígitos enviado a tu nodo de comunicación.
              </p>
              <form onSubmit={handle2FA} className="space-y-8">
                <div className="space-y-3">
                  <input 
                    type="text" 
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} 
                    placeholder="000000" 
                    className="w-full text-center text-4xl tracking-[0.6em] py-6 bg-black/40 border border-fuchsia-500/20 rounded-3xl text-fuchsia-400 placeholder-fuchsia-900 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 transition-all font-mono italic" 
                    disabled={loading} 
                    maxLength={6} 
                    inputMode="numeric" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading || otpCode.length !== 6} 
                  className="btn-neon-fuchsia w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-fuchsia-900/50 text-white font-black h-14 uppercase tracking-[0.3em] text-xs shadow-[0_0_20px_rgba(217,70,239,0.2)] transition-all"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />DECRYPTING...</>
                  ) : "AUTENTICAR_TOKEN"}
                </button>
              </form>
              <button 
                onClick={() => { setStep("login"); setOtpCode(""); }} 
                className="flex items-center gap-2 mt-8 text-[9px] font-black text-cyan-900 hover:text-cyan-400 uppercase tracking-widest transition-colors mx-auto italic"
              >
                <ArrowLeft className="w-4 h-4" /> ABORTAR_SECUENCIA
              </button>
            </>
          )}

          {/* ─── STEP: FORGOT PASSWORD ─── */}
          {step === "forgot" && (
            <>
              <div className="flex items-center gap-3 mb-10">
                <Mail className="w-5 h-5 text-cyan-400 animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-100 italic">Recovery_Link</h2>
              </div>
              <p className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest mb-8 leading-relaxed italic">
                Enviando sonda de recuperación... Ingresa tu dirección de red para recibir el enlace de acceso.
              </p>
              <form onSubmit={handleForgot} className="space-y-8">
                <div className="space-y-3">
                  <div className="relative group/input">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-900 group-focus-within/input:text-cyan-400 transition-colors" />
                    <input 
                      type="email" 
                      value={resetEmail} 
                      onChange={(e) => setResetEmail(e.target.value)} 
                      placeholder="USER@NETWORK.NET" 
                      className="w-full pl-12 pr-4 py-4 bg-black/40 border border-cyan-500/10 rounded-2xl text-cyan-100 placeholder-cyan-900 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono text-sm" 
                      disabled={loading} 
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn-neon-cyan w-full py-4 text-xs h-14 font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />SENDING...</>
                  ) : "ENVIAR_SONDA"}
                </button>
              </form>
              <button 
                onClick={() => setStep("login")} 
                className="flex items-center gap-2 mt-8 text-[9px] font-black text-cyan-900 hover:text-cyan-400 uppercase tracking-widest transition-colors mx-auto italic"
              >
                <ArrowLeft className="w-4 h-4" /> VOLVER_AL_NODO
              </button>
            </>
          )}

          {/* ─── STEP: EMAIL SENT ─── */}
          {step === "reset-sent" && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-8 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                <Mail className="w-10 h-10 text-cyan-400 animate-bounce" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic mb-4">¡SONDA ENVIADA!</h2>
              <p className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest mb-10 leading-relaxed italic">
                Sincronización en proceso. Revisa tu inbox para completar la secuencia de restablecimiento.
              </p>
              <button 
                onClick={() => setStep("login")} 
                className="text-[9px] font-black text-cyan-400 hover:text-cyan-100 uppercase tracking-[0.3em] flex items-center gap-2 mx-auto transition-all bg-cyan-500/5 px-6 py-3 rounded-full border border-cyan-500/20"
              >
                <ArrowLeft className="w-4 h-4" /> RETORNAR_LOGIN
              </button>
            </div>
          )}
        </div>

        {/* System Footer */}
        <div className="mt-12 text-center overflow-hidden">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-cyan-500/30" />
            <span className="text-[10px] font-black text-cyan-900 uppercase tracking-[0.4em] italic">SECURE_ENVIRONMENT</span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-cyan-500/30" />
          </div>
          <p className="text-[8px] font-black text-cyan-900/40 uppercase tracking-[0.2em] animate-pulse">
            ENCRYPTED WITH AES-256-GCM • STATUS: NOMINAL
          </p>
        </div>
      </div>
    </div>
  );
}
