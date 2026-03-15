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
      <div className="text-center">
        <Smartphone className="w-12 h-12 glow-cyan mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-semibold gradient-text">Loading Dashboard...</h2>
        <p className="text-muted-foreground mt-2">Bypassing authentication...</p>
      </div>
    </div>
  );
}
