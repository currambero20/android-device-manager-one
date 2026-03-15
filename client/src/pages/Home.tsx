import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Lock, Smartphone, Zap, Shield, Activity, Code } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const loginUrl = getLoginUrl();

  // Siempre redirigir al dashboard ya que hemos eliminado la autenticación obligatoria
  useEffect(() => {
    window.location.href = "/dashboard";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 bg-card/50 backdrop-blur rounded-2xl border border-glow-cyan">
        <Smartphone className="w-16 h-12 glow-cyan mx-auto mb-6" />
        <h1 className="text-4xl font-bold gradient-text mb-4 tracking-tight">Android Device Manager</h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
          Plataforma avanzada para la gestión y monitoreo centralizado de dispositivos Android.
        </p>
        <div className="animate-pulse text-cyan-400 font-medium">
          Accediendo con cuenta de invitado...
        </div>
      </div>
    </div>
  );
}
