import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Copy,
  Check,
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

export default function TwoFactorSetup() {
  const { user } = useAuth();
  const [step, setStep] = useState<"intro" | "setup" | "verify" | "backup">("intro");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSetupClick = async () => {
    try {
      setIsLoading(true);
      // TODO: Call setupTwoFactor API
      // For now, show mock data
      setQrCode("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
      setSecret("JBSWY3DPEBLW64TMMQ======");
      setBackupCodes([
        "ABC12345",
        "DEF67890",
        "GHI11111",
        "JKL22222",
        "MNO33333",
        "PQR44444",
        "STU55555",
        "VWX66666",
        "YZA77777",
        "BCD88888",
      ]);
      setStep("setup");
      toast.success("2FA setup started");
    } catch (error) {
      toast.error("Failed to setup 2FA");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Call verifyTwoFactorSetup API
      setStep("backup");
      toast.success("Code verified successfully");
    } catch (error) {
      toast.error("Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success("Copied to clipboard");
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join("\n");
    const element = document.createElement("a");
    element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute("download", "2fa-backup-codes.txt");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Backup codes downloaded");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md card-neon-cyan">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 glow-cyan mr-3" />
            <h1 className="text-2xl font-bold glow-cyan">Two-Factor Auth</h1>
          </div>

          {step === "intro" && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center">
                Protect your account with two-factor authentication. You'll need an authenticator app
                like Google Authenticator, Authy, or Microsoft Authenticator.
              </p>

              <div className="bg-accent/10 border border-accent/30 rounded p-4 space-y-2">
                <h3 className="font-bold text-sm">What you'll need:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Authenticator app installed on your phone</li>
                  <li>✓ A safe place to store backup codes</li>
                  <li>✓ Your password for verification</li>
                </ul>
              </div>

              <Button
                onClick={handleSetupClick}
                disabled={isLoading}
                className="w-full btn-neon-cyan"
              >
                {isLoading ? "Setting up..." : "Start Setup"}
              </Button>
            </div>
          )}

          {step === "setup" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code with your authenticator app:
              </p>

              {qrCode && (
                <div className="flex justify-center">
                  <div className="border-2 border-glow-cyan p-4 rounded bg-white">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Can't scan? Enter this code manually:
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-accent/10 rounded font-mono text-sm break-all">
                    {secret}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(secret);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => setStep("verify")}
                className="w-full btn-neon-cyan"
              >
                I've Scanned the Code
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Enter the 6-digit code from your authenticator app:
              </p>

              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                className="input-neon text-center text-2xl tracking-widest"
              />

              <Button
                onClick={handleVerify}
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full btn-neon-cyan"
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>

              <Button
                variant="outline"
                onClick={() => setStep("setup")}
                className="w-full"
              >
                Back
              </Button>
            </div>
          )}

          {step === "backup" && (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-yellow-500 mb-1">Save your backup codes</p>
                  <p className="text-muted-foreground">
                    Keep these codes in a safe place. You can use them to access your account if you
                    lose access to your authenticator app.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm">Backup Codes:</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowBackupCodes(!showBackupCodes)}
                  >
                    {showBackupCodes ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-1" />
                        Show
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-accent/10 rounded p-4 space-y-1 max-h-48 overflow-y-auto">
                  {backupCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 hover:bg-accent/20 rounded cursor-pointer"
                      onClick={() => copyToClipboard(code)}
                    >
                      <code className={`font-mono text-sm ${showBackupCodes ? "" : "blur"}`}>
                        {code}
                      </code>
                      {copiedCode === code ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={downloadBackupCodes}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Codes
              </Button>

              <Button className="w-full btn-neon-cyan">
                2FA Setup Complete
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
