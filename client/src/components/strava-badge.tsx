import { Badge } from "@/components/ui/badge";

interface StravaBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StravaBadge({ className = "", size = "sm" }: StravaBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5", 
    lg: "text-base px-4 py-2"
  };

  // Simple version for debugging
  return (
    <div 
      className={`inline-flex items-center rounded font-semibold tracking-wide text-white ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: '#FC4C02', border: '1px solid #FC4C02' }}
    >
      <svg 
        className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} mr-1`}
        viewBox="0 0 24 24" 
        fill="currentColor"
      >
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0L0 20.172h3.066l1.947-3.839h3.065z"/>
      </svg>
      STRAVA
    </div>
  );
}