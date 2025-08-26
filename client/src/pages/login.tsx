import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldPlus, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast({
          title: "Verification email sent",
          description: "Please check your email for the verification link.",
        });
      } else {
        const data = await response.json();
        toast({
          title: "Failed to send email",
          description: data.message || "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Mission briefing ready",
        description: "Access granted. Welcome back, operator.",
      });
    } catch (error: any) {
      // Check if email verification is required
      if (error?.requiresEmailVerification) {
        setShowResendVerification(true);
        toast({
          title: "Email verification required",
          description: "Please verify your email before logging in.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Access denied",
          description: error?.message || "Invalid credentials. Check your intel and try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-tactical-gray px-4">
      <Card className="w-full max-w-md card-modern">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <ShieldPlus className="h-16 w-16 text-military-green" style={{ strokeWidth: 1.5 }} />
          </div>
          <CardTitle className="text-3xl font-bold text-heading tracking-tight">TacFit</CardTitle>
          <CardDescription className="text-body text-lg">
            Teamwork, Fitness, Winning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showResendVerification ? (
            <ResendVerificationForm
              userEmail={email}
              isResending={isResending}
              onResend={handleResendVerification}
              onBackToLogin={() => setShowResendVerification(false)}
            />
          ) : (
            <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-surface-elevated border-border-subtle text-primary placeholder:text-muted focus:border-military-green focus:ring-1 focus:ring-military-green"
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-surface-elevated border-border-subtle text-primary placeholder:text-muted focus:border-military-green focus:ring-1 focus:ring-military-green"
                placeholder="Enter your password"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 text-lg font-semibold"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
            
            <div className="text-center space-y-3">
              <Link href="/forgot-password" className="block text-gray-400 hover:text-military-green text-sm transition-colors">
                Forgot your password?
              </Link>
              <span className="text-secondary text-sm">
                Need tactical clearance?{" "}
                <Link href="/register" className="text-military-green hover:text-military-green-light font-semibold transition-colors">
                  Join the force
                </Link>
              </span>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Resend verification form component
function ResendVerificationForm({
  userEmail,
  isResending,
  onResend,
  onBackToLogin,
}: {
  userEmail: string;
  isResending: boolean;
  onResend: () => void;
  onBackToLogin: () => void;
}) {
  return (
    <div className="text-center space-y-4">
      <Mail className="h-16 w-16 text-military-green mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-heading">Email Verification Required</h3>
      <p className="text-muted">
        Your account requires email verification before you can log in.
      </p>
      <p className="text-sm text-muted">
        Check your email for the verification link, or request a new one below.
      </p>
      
      <div className="space-y-3 pt-4">
        <Button
          onClick={onResend}
          disabled={isResending}
          className="w-full bg-military-green hover:bg-military-green/90"
        >
          {isResending ? "Sending..." : "Resend Verification Email"}
        </Button>
        <Button
          onClick={onBackToLogin}
          variant="ghost"
          className="w-full text-muted hover:text-primary"
        >
          Back to Login
        </Button>
      </div>
    </div>
  );
}
