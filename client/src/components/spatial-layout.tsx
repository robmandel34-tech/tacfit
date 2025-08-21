import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SpatialLayoutProps {
  children: ReactNode;
  className?: string;
}

export function SpatialLayout({ children, className }: SpatialLayoutProps) {
  return (
    <div 
      className={cn(
        "relative min-h-screen",
        // Depth layers with perspective
        "perspective-1000",
        className
      )}
      style={{
        background: `
          radial-gradient(circle at 20% 30%, rgba(124, 179, 66, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(124, 179, 66, 0.05) 0%, transparent 50%),
          linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)
        `
      }}
    >
      {/* Ambient lighting overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/2 via-transparent to-military-green/2 pointer-events-none" />
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/10 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

interface FloatingElementProps {
  children: ReactNode;
  depth?: number;
  className?: string;
  animate?: boolean;
}

export function FloatingElement({ 
  children, 
  depth = 1, 
  className, 
  animate = true 
}: FloatingElementProps) {
  return (
    <div 
      className={cn(
        "relative transform-gpu",
        animate && "transition-transform duration-700 ease-out",
        className
      )}
      style={{
        transform: `translateZ(${depth * 10}px) rotateX(${depth * 2}deg)`,
        filter: `drop-shadow(0 ${depth * 4}px ${depth * 8}px rgba(0,0,0,0.3))`
      }}
    >
      {children}
    </div>
  );
}

interface GlassNavigationProps {
  items: Array<{
    label: string;
    href: string;
    icon?: ReactNode;
    active?: boolean;
  }>;
  className?: string;
}

export function GlassNavigation({ items, className }: GlassNavigationProps) {
  return (
    <nav 
      className={cn(
        "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50",
        "backdrop-blur-xl bg-black/20 border border-white/20",
        "rounded-2xl px-4 py-3 shadow-2xl",
        className
      )}
    >
      <div className="flex items-center space-x-2">
        {items.map((item, index) => (
          <a
            key={index}
            href={item.href}
            className={cn(
              "relative px-4 py-2 rounded-xl transition-all duration-200",
              "hover:bg-white/10 active:scale-95",
              item.active && "bg-military-green/20 text-military-green"
            )}
          >
            {item.active && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-military-green/10 to-transparent" />
            )}
            
            <div className="relative flex items-center space-x-2">
              {item.icon}
              <span className="text-sm font-medium text-white/90">
                {item.label}
              </span>
            </div>
          </a>
        ))}
      </div>
    </nav>
  );
}