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
            <div className="relative flex items-center justify-center">
              <svg 
                width="120" 
                height="80" 
                viewBox="0 0 120 80" 
                className="drop-shadow-lg"
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Left Wing */}
                <path 
                  d="M10 40 Q25 25 40 35 Q35 45 25 50 Q15 48 10 40Z" 
                  fill="url(#wingGradient)"
                  stroke="#2D5A3D"
                  strokeWidth="1.5"
                  className="wing-left"
                />
                
                {/* Right Wing */}
                <path 
                  d="M110 40 Q95 25 80 35 Q85 45 95 50 Q105 48 110 40Z" 
                  fill="url(#wingGradient)"
                  stroke="#2D5A3D"
                  strokeWidth="1.5"
                  className="wing-right"
                />
                
                {/* Main Shield with gradient */}
                <path 
                  d="M60 10 L80 20 L80 45 Q80 60 60 70 Q40 60 40 45 L40 20 L60 10 Z" 
                  fill="url(#shieldGradient)"
                  stroke="#2D5A3D"
                  strokeWidth="2"
                />
                
                {/* Inner shield detail */}
                <path 
                  d="M60 18 L72 25 L72 42 Q72 52 60 60 Q48 52 48 42 L48 25 L60 18 Z" 
                  fill="none"
                  stroke="#A8D5BA"
                  strokeWidth="1.5"
                  opacity="0.7"
                />
                
                {/* Loading shimmer overlay */}
                <rect 
                  x="35" 
                  y="10" 
                  width="50" 
                  height="60" 
                  fill="url(#shimmer)" 
                  opacity="0.3"
                  className="shimmer-overlay"
                />
                
                {/* Gradient definitions */}
                <defs>
                  {/* Shield gradient */}
                  <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6B9080" />
                    <stop offset="30%" stopColor="#4A7C59" />
                    <stop offset="70%" stopColor="#2D5A3D" />
                    <stop offset="100%" stopColor="#1A3A24" />
                  </linearGradient>
                  
                  {/* Wing gradient */}
                  <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A8D5BA" />
                    <stop offset="50%" stopColor="#6B9080" />
                    <stop offset="100%" stopColor="#4A7C59" />
                  </linearGradient>
                  
                  {/* Shimmer effect */}
                  <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="40%" stopColor="rgba(255,255,255,0.4)" />
                    <stop offset="60%" stopColor="rgba(255,255,255,0.6)" />
                    <stop offset="100%" stopColor="transparent" />
                    <animateTransform
                      attributeName="gradientTransform"
                      attributeType="XML"
                      type="translate"
                      values="-100 0;100 0;-100 0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* CSS for wing flapping animation */}
              <style jsx>{`
                .wing-left {
                  animation: flapLeft 2s ease-in-out infinite;
                  transform-origin: 40px 35px;
                }
                .wing-right {
                  animation: flapRight 2s ease-in-out infinite;
                  transform-origin: 80px 35px;
                }
                .shimmer-overlay {
                  animation: shimmerPulse 3s ease-in-out infinite;
                }
                
                @keyframes flapLeft {
                  0%, 100% { transform: rotateZ(0deg) scaleY(1); }
                  25% { transform: rotateZ(-8deg) scaleY(0.9); }
                  50% { transform: rotateZ(0deg) scaleY(1.1); }
                  75% { transform: rotateZ(8deg) scaleY(0.9); }
                }
                
                @keyframes flapRight {
                  0%, 100% { transform: rotateZ(0deg) scaleY(1); }
                  25% { transform: rotateZ(8deg) scaleY(0.9); }
                  50% { transform: rotateZ(0deg) scaleY(1.1); }
                  75% { transform: rotateZ(-8deg) scaleY(0.9); }
                }
                
                @keyframes shimmerPulse {
                  0%, 100% { opacity: 0.2; }
                  50% { opacity: 0.4; }
                }
              `}</style>
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
