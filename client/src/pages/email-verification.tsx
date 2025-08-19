import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Mail, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


export default function EmailVerification() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      // Get token from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setError("Invalid verification link");
        setIsVerifying(false);
        return;
      }

      let response: Response | undefined;
      try {
        response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (response.ok && (data.verified || data.alreadyVerified)) {
          setIsVerified(true);
          toast({
            title: "Email verified successfully",
            description: "You can now log in to your account.",
          });
          
          // Redirect to login after 3 seconds
          setTimeout(() => setLocation("/login"), 3000);
        }
      } catch (error: any) {
        let errorData: any = {};
        try {
          if (response && !response.ok) {
            errorData = await response.json();
          }
        } catch {}
        const errorMessage = errorData?.message || error.message || "Email verification failed";
        if (errorData?.tokenExpired) {
          setIsExpired(true);
        } else {
          setError(errorMessage);
        }
        toast({
          title: "Verification failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [toast, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-tactical-gray px-4">
      <Card className="w-full max-w-md card-modern">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            {isVerifying ? (
              <RefreshCw className="h-16 w-16 text-military-green animate-spin" />
            ) : isVerified ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-3xl font-bold text-heading tracking-tight">
            {isVerifying ? "Verifying Email" : isVerified ? "Email Verified" : "Verification Failed"}
          </CardTitle>
          <CardDescription className="text-body text-lg">
            {isVerifying 
              ? "Please wait while we verify your email address..."
              : isVerified 
                ? "Your email has been successfully verified. Redirecting to login..."
                : error || "Email verification failed"
            }
          </CardDescription>
        </CardHeader>

        {!isVerifying && !isVerified && (
          <CardContent className="space-y-6">
            <div className="text-center">
              {isExpired ? (
                <div className="space-y-4">
                  <p className="text-muted">
                    Your verification link has expired. Please request a new verification email.
                  </p>
                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full bg-military-green hover:bg-military-green/90 text-white font-semibold"
                  >
                    Go to Login
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full bg-military-green hover:bg-military-green/90 text-white font-semibold"
                  >
                    Back to Login
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}