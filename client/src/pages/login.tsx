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
                width="140" 
                height="80" 
                viewBox="0 0 140 80" 
                className="drop-shadow-lg"
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Left Wing - Majestic with feather details */}
                <g className="wing-left">
                  <path 
                    d="M5 40 Q15 15 35 25 Q42 30 40 35 Q38 42 30 48 Q20 52 12 48 Q5 45 5 40Z" 
                    fill="url(#wingGradient)"
                    stroke="#2D5A3D"
                    strokeWidth="1.5"
                  />
                  {/* Feather details */}
                  <path 
                    d="M12 35 Q20 28 28 32 Q25 38 18 42" 
                    fill="none"
                    stroke="#A8D5BA"
                    strokeWidth="1"
                    opacity="0.8"
                  />
                  <path 
                    d="M15 42 Q22 38 25 44" 
                    fill="none"
                    stroke="#A8D5BA"
                    strokeWidth="0.8"
                    opacity="0.6"
                  />
                </g>
                
                {/* Right Wing - Majestic with feather details */}
                <g className="wing-right">
                  <path 
                    d="M115 40 Q105 15 85 25 Q78 30 80 35 Q82 42 90 48 Q100 52 108 48 Q115 45 115 40Z" 
                    fill="url(#wingGradient)"
                    stroke="#2D5A3D"
                    strokeWidth="1.5"
                  />
                  {/* Feather details */}
                  <path 
                    d="M108 35 Q100 28 92 32 Q95 38 102 42" 
                    fill="none"
                    stroke="#A8D5BA"
                    strokeWidth="1"
                    opacity="0.8"
                  />
                  <path 
                    d="M105 42 Q98 38 95 44" 
                    fill="none"
                    stroke="#A8D5BA"
                    strokeWidth="0.8"
                    opacity="0.6"
                  />
                </g>
                
                {/* Main Shield with gradient - centered for new viewport */}
                <path 
                  d="M70 10 L90 20 L90 45 Q90 60 70 70 Q50 60 50 45 L50 20 L70 10 Z" 
                  fill="url(#shieldGradient)"
                  stroke="#2D5A3D"
                  strokeWidth="2"
                />
                
                {/* Inner shield detail */}
                <path 
                  d="M70 18 L82 25 L82 42 Q82 52 70 60 Q58 52 58 42 L58 25 L70 18 Z" 
                  fill="none"
                  stroke="#A8D5BA"
                  strokeWidth="1.5"
                  opacity="0.7"
                />
                
                {/* Loading shimmer overlay */}
                <rect 
                  x="45" 
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
                  animation: flapLeft 3s ease-in-out infinite;
                  transform-origin: 40px 35px;
                }
                .wing-right {
                  animation: flapRight 3s ease-in-out infinite;
                  transform-origin: 90px 35px;
                }
                .shimmer-overlay {
                  animation: shimmerPulse 3s ease-in-out infinite;
                }
                
                @keyframes flapLeft {
                  0%, 100% { transform: rotateZ(0deg) scaleY(1) scaleX(1); }
                  25% { transform: rotateZ(-15deg) scaleY(0.8) scaleX(1.1); }
                  50% { transform: rotateZ(-5deg) scaleY(1.2) scaleX(0.95); }
                  75% { transform: rotateZ(10deg) scaleY(0.85) scaleX(1.05); }
                }
                
                @keyframes flapRight {
                  0%, 100% { transform: rotateZ(0deg) scaleY(1) scaleX(1); }
                  25% { transform: rotateZ(15deg) scaleY(0.8) scaleX(1.1); }
                  50% { transform: rotateZ(5deg) scaleY(1.2) scaleX(0.95); }
                  75% { transform: rotateZ(-10deg) scaleY(0.85) scaleX(1.05); }
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
