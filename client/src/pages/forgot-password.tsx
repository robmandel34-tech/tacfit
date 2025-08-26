import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        toast({
          title: "Recovery email sent",
          description: "Check your email for password reset instructions.",
        });
      } else {
        toast({
          title: "Request failed",
          description: data.message || "Unable to process password reset request.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network error",
        description: "Unable to connect to the server. Please try again.",
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
          <CardTitle className="text-3xl font-bold text-white tracking-tight">
            Password Recovery
          </CardTitle>
          <CardDescription className="text-gray-300 text-lg">
            Enter your email to receive reset instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4">
                <h3 className="text-white font-semibold mb-2">Check Your Email</h3>
                <p className="text-gray-300 text-sm">
                  If an account with that email exists, we've sent password reset instructions to:
                </p>
                <p className="text-military-green font-medium mt-2">{email}</p>
              </div>
              <div className="space-y-3">
                <Link href="/login">
                  <Button className="w-full btn-modern" variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-modern"
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full btn-modern" 
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Instructions"}
              </Button>
              <div className="text-center">
                <Link href="/login">
                  <Button variant="ghost" className="text-military-green hover:text-military-green/80">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}