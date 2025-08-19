import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await register(username, email, password);
      
      // Check if email verification is required
      if (result?.requiresEmailVerification) {
        setUserEmail(email);
        setShowVerificationMessage(true);
        toast({
          title: "Registration successful",
          description: "Please check your email to verify your account.",
        });
      } else {
        toast({
          title: "Operator registered",
          description: "Your tactical command access has been granted.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Registration denied",
        description: error?.message || "Unable to process registration. Check your details and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-tactical-gray px-4">
      <Card className="w-full max-w-md card-modern">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <Shield className="h-20 w-20 text-military-green" />
          </div>
          <CardTitle className="text-3xl font-bold text-heading tracking-tight">Join the Force</CardTitle>
          <CardDescription className="text-body text-lg">
            Register for your tactical command access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showVerificationMessage ? (
            <EmailVerificationNotice 
              userEmail={userEmail} 
              onBackToRegister={() => setShowVerificationMessage(false)} 
            />
          ) : (
            <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-300 font-medium">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-surface-elevated border-border-subtle text-primary placeholder:text-muted focus:border-military-green focus:ring-1 focus:ring-military-green"
                placeholder="Choose your callsign"
              />
            </div>
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
                placeholder="Create a password"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 text-lg font-semibold"
            >
              {isLoading ? "Registering operator..." : "Join the Force"}
            </Button>
          </form>
            
            <div className="text-center">
            <span className="text-secondary text-sm">
              Already have tactical access?{" "}
              <Link href="/login" className="text-military-green hover:text-military-green-light font-semibold transition-colors">
                Access command center
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

// Email verification notice component
function EmailVerificationNotice({ userEmail, onBackToRegister }: { 
  userEmail: string; 
  onBackToRegister: () => void; 
}) {
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
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

  return (
    <div className="text-center space-y-4">
      <Mail className="h-16 w-16 text-military-green mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-heading">Check Your Email</h3>
      <p className="text-muted">
        We've sent a verification link to <span className="text-military-green font-medium">{userEmail}</span>
      </p>
      <p className="text-sm text-muted">
        Click the link in the email to verify your account and complete registration.
      </p>
      
      <div className="space-y-3 pt-4">
        <Button
          onClick={handleResendVerification}
          disabled={isResending}
          variant="outline"
          className="w-full"
        >
          {isResending ? "Sending..." : "Resend Verification Email"}
        </Button>
        <Button
          onClick={onBackToRegister}
          variant="ghost"
          className="w-full text-muted hover:text-primary"
        >
          Back to Registration
        </Button>
      </div>
    </div>
  );
}
