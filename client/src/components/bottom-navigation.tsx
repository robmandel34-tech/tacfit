import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { House, Mountain, Shield } from "lucide-react";

export default function BottomNavigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Check if user is part of an active competition and team
  const { data: userTeamMember } = useQuery({
    queryKey: [`/api/team-members/${user?.id}`],
    enabled: !!user,
  });

  // Only show bottom nav if user is logged in
  if (!user) return null;

  // Show different nav items based on whether user is in a competition
  const hasActiveMembership = userTeamMember && userTeamMember.length > 0;
  
  const navItems = [
    { path: "/", icon: House, label: "Command", enabled: true },
    { 
      path: hasActiveMembership ? "/competition-status" : "/competitions", 
      icon: Mountain, 
      label: "Competitions", 
      enabled: true 
    },
    { path: "/team", icon: Shield, label: "Team", enabled: hasActiveMembership }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-elevated border-t border-border-subtle z-50 md:hidden shadow-strong">
      <div className="flex justify-around items-center py-3">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const IconComponent = item.icon;
          
          if (!item.enabled) {
            // Disabled item - grey and not clickable
            return (
              <div 
                key={item.path}
                className="flex flex-col items-center justify-center p-3 rounded-lg cursor-not-allowed opacity-40"
              >
                <IconComponent size={22} />
                <span className="text-xs mt-1 font-semibold">{item.label}</span>
              </div>
            );
          }
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? "text-military-green bg-surface-overlay" 
                  : "text-muted hover:text-secondary hover:bg-surface-overlay"
              }`}
            >
              <IconComponent size={22} />
              <span className="text-xs mt-1 font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}