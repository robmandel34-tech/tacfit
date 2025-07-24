import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Mission briefing ready",
        description: "Access granted. Welcome back, operator.",
      });
    } catch (error) {
      toast({
        title: "Access denied",
        description: "Invalid credentials. Check your intel and try again.",
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
            <div className="relative">
              <svg 
                width="80" 
                height="96" 
                viewBox="0 0 80 96" 
                className="drop-shadow-lg"
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Badge background with tactical shape */}
                <path 
                  d="M40 4L72 16V48C72 64 56 80 40 92C24 80 8 64 8 48V16L40 4Z" 
                  fill="url(#badgeGradient)"
                  stroke="#2D5A3D"
                  strokeWidth="2"
                />
                
                {/* Inner border detail */}
                <path 
                  d="M40 12L64 22V46C64 58 52 70 40 80C28 70 16 58 16 46V22L40 12Z" 
                  fill="none"
                  stroke="#4A7C59"
                  strokeWidth="1.5"
                />
                
                {/* Central tactical star */}
                <path 
                  d="M40 30L44 38H52L46 44L48 52L40 48L32 52L34 44L28 38H36L40 30Z" 
                  fill="#A8D5BA"
                  stroke="#2D5A3D"
                  strokeWidth="1"
                />
                
                {/* Side tactical elements - crossed elements */}
                <g stroke="#4A7C59" strokeWidth="1.5" fill="none">
                  {/* Left side accent */}
                  <path d="M20 40L26 34M20 34L26 40" />
                  {/* Right side accent */}
                  <path d="M54 40L60 34M54 34L60 40" />
                </g>
                
                {/* Bottom banner for text */}
                <rect 
                  x="16" 
                  y="62" 
                  width="48" 
                  height="12" 
                  rx="2"
                  fill="#2D5A3D"
                  stroke="#4A7C59"
                  strokeWidth="1"
                />
                <text 
                  x="40" 
                  y="70" 
                  textAnchor="middle" 
                  fontSize="8" 
                  fill="#A8D5BA" 
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  TACTICAL
                </text>
                
                {/* Gradient definitions */}
                <defs>
                  <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4A7C59" />
                    <stop offset="50%" stopColor="#2D5A3D" />
                    <stop offset="100%" stopColor="#1A3A24" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-heading tracking-tight">TacFit</CardTitle>
          <CardDescription className="text-body text-lg">
            Teamwork, Fitness, Winning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
          <div className="text-center">
            <span className="text-secondary text-sm">
              Don't have an account?{" "}
              <Link href="/register" className="text-military-green hover:text-military-green-light font-semibold transition-colors">
                Sign up
              </Link>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
