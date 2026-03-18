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
import { User, Lock, Save, Key } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Profile() {
  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.getMe.useQuery();
  
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setPassword("");
      setConfirmPassword("");
      utils.auth.getMe.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    updateProfileMutation.mutate({
      name: name || undefined,
      password: password || undefined,
    });
  };

  return (
    <DashboardLayout title="User Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="card-neon">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 glow-cyan">
              <User className="w-5 h-5" />
              Account Settings
            </CardTitle>
            <CardDescription>
              Update your personal information and security credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="input-neon pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="input-neon opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed for security reasons.
                </p>
              </div>

              <div className="border-t border-glow-cyan/20 pt-4 mt-6">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Security
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-neon pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-neon pl-10"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Leave blank if you don't want to change your password.
                </p>
              </div>

              <Button
                type="submit"
                className="btn-neon-cyan w-full mt-6"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Info */}
        <div className="card-neon-cyan p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-cyan-400 mt-1" />
            <div>
              <p className="text-sm font-bold">Security Tip</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use a strong, unique password for your administrator account. 
                We recommend a mix of uppercase, lowercase, numbers, and symbols.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
