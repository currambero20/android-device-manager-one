import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Lock, Smartphone, Zap, Shield, Activity, Code } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const loginUrl = getLoginUrl();

  // Si está autenticado, redirigir al dashboard
  if (isAuthenticated && user) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-glow-cyan bg-card/50 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-8 h-8 glow-cyan" />
            <h1 className="text-2xl font-bold gradient-text">Android Device Manager</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <span className="text-sm text-muted-foreground">Welcome, {user.name}</span>
                <Button onClick={logout} variant="outline" size="sm">
                  Logout
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => window.location.href = loginUrl}
                className="btn-neon"
              >
                Login with Google
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container py-12">
        {!isAuthenticated ? (
          <section className="card-neon text-center py-16">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-4xl font-bold mb-4">Welcome to Android Device Manager</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Advanced remote monitoring and control platform for Android devices with real-time tracking,
                security monitoring, and APK generation capabilities.
              </p>
              <Button 
                onClick={() => window.location.href = loginUrl}
                className="btn-neon text-lg px-8 py-6"
              >
                Sign in with Google
              </Button>
            </div>
          </section>
        ) : (
          // Contenido autenticado aquí
          <div>Redirecting to dashboard...</div>
        )}
      </main>
    </div>
  );
}
