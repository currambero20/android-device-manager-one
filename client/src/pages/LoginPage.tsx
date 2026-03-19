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
    <div className="min-h-screen flex items-center justify-center bg-white">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #1a1a2e 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md px-6">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-5 shadow-lg shadow-blue-200">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Android Device Manager
          </h1>
          <p className="text-gray-500 text-sm">
            Gestión central de dispositivos Android
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">

          {/* ─── STEP: LOGIN ─── */}
          {step === "login" && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Iniciar Sesión</h2>
              </div>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Usuario</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="correo@ejemplo.com" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" disabled={loading} autoComplete="username" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" disabled={loading} autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-blue-200 mt-2">
                  {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Iniciando...</>) : "Iniciar Sesión"}
                </button>
              </form>
              <button onClick={() => setStep("forgot")} className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800 transition-colors text-center">
                ¿Olvidaste tu contraseña?
              </button>
            </>
          )}

          {/* ─── STEP: 2FA ─── */}
          {step === "twofa" && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <KeyRound className="w-5 h-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-gray-800">Verificación en 2 Pasos</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">Ingresa el código de 6 dígitos enviado a tu correo electrónico.</p>
              <form onSubmit={handle2FA} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Código de verificación</label>
                  <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="w-full text-center text-3xl tracking-[0.5em] py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" disabled={loading} maxLength={6} inputMode="numeric" />
                </div>
                <button type="submit" disabled={loading || otpCode.length !== 6} className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-violet-200">
                  {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verificando...</>) : "Verificar Código"}
                </button>
              </form>
              <button onClick={() => { setStep("login"); setOtpCode(""); }} className="flex items-center gap-1 mt-5 text-sm text-gray-500 hover:text-gray-700 transition-colors mx-auto">
                <ArrowLeft className="w-4 h-4" /> Volver al login
              </button>
            </>
          )}

          {/* ─── STEP: FORGOT PASSWORD ─── */}
          {step === "forgot" && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <Mail className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Recuperar Contraseña</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">Te enviaremos un enlace para restablecer tu contraseña.</p>
              <form onSubmit={handleForgot} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="tu@correo.com" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" disabled={loading} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-blue-200">
                  {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enviando...</>) : "Enviar Enlace"}
                </button>
              </form>
              <button onClick={() => setStep("login")} className="flex items-center gap-1 mt-5 text-sm text-gray-500 hover:text-gray-700 transition-colors mx-auto">
                <ArrowLeft className="w-4 h-4" /> Volver al login
              </button>
            </>
          )}

          {/* ─── STEP: EMAIL SENT ─── */}
          {step === "reset-sent" && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">¡Correo Enviado!</h2>
              <p className="text-sm text-gray-500 mb-6">Revisa tu bandeja de entrada y haz clic en el enlace para cambiar tu contraseña.</p>
              <button onClick={() => setStep("login")} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto">
                <ArrowLeft className="w-4 h-4" /> Volver al login
              </button>
            </div>
          )}

        </div>


      </div>
    </div>
  );
}
