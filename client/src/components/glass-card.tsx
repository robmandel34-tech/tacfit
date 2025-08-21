import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  blur?: "sm" | "md" | "lg" | "xl";
  opacity?: number;
  hover?: boolean;
  glow?: boolean;
}

export function GlassCard({ 
  children, 
  className, 
  blur = "md", 
  opacity = 0.1, 
  hover = true,
  glow = false 
}: GlassCardProps) {
  const blurMap = {
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md", 
    lg: "backdrop-blur-lg",
    xl: "backdrop-blur-xl"
  };

  return (
    <div 
      className={cn(
        // Base glass effect
        "relative rounded-2xl border border-white/20",
        "shadow-2xl shadow-black/10",
        blurMap[blur],
        
        // Background with opacity
        `bg-white/${Math.round(opacity * 100)}`,
        "dark:bg-white/5",
        
        // Hover effects
        hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl",
        hover && "hover:bg-white/15 dark:hover:bg-white/10",
        
        // Glow effect
        glow && "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none",
        
        // Tactical theme integration
        "border-military-green/20 shadow-military-green/5",
        
        className
      )}
      style={{
        backdropFilter: `blur(${blur === 'sm' ? '4px' : blur === 'md' ? '8px' : blur === 'lg' ? '12px' : '16px'})`,
        WebkitBackdropFilter: `blur(${blur === 'sm' ? '4px' : blur === 'md' ? '8px' : blur === 'lg' ? '12px' : '16px'})`
      }}
    >
      {/* Inner glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-military-green/5 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  floating?: boolean;
}

export function GlassPanel({ children, className, floating = false }: GlassPanelProps) {
  return (
    <div 
      className={cn(
        "relative rounded-3xl backdrop-blur-xl",
        "bg-white/8 dark:bg-white/4",
        "border border-white/15",
        "shadow-2xl shadow-black/20",
        
        // Floating effect
        floating && "transform-gpu hover:translate-y-[-2px] transition-transform duration-300",
        floating && "shadow-4xl hover:shadow-military-green/10",
        
        className
      )}
    >
      {/* Frosted glass overlay */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/3 via-transparent to-military-green/3" />
      
      {/* Edge highlight */}
      <div className="absolute inset-px rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent" />
      
      <div className="relative z-10 p-6">
        {children}
      </div>
    </div>
  );
}

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

export function GlassButton({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "md", 
  className,
  disabled = false 
}: GlassButtonProps) {
  const sizeMap = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const variantStyles = {
    primary: "bg-military-green/20 border-military-green/30 text-white hover:bg-military-green/30",
    secondary: "bg-white/10 border-white/20 text-white hover:bg-white/15",
    ghost: "bg-transparent border-transparent text-white/80 hover:bg-white/10 hover:text-white"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative rounded-xl backdrop-blur-md",
        "border transition-all duration-200",
        "shadow-lg hover:shadow-xl",
        "transform-gpu hover:scale-[1.02] active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        sizeMap[size],
        variantStyles[variant],
        className
      )}
    >
      {/* Button glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      
      <span className="relative z-10 font-medium">
        {children}
      </span>
    </button>
  );
}