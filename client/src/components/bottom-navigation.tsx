import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Home, Trophy, Users, Activity, MessageCircle } from "lucide-react";

export default function BottomNavigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Check if user is part of an active competition and team
  const { data: userTeamMember } = useQuery({
    queryKey: [`/api/team-members/${user?.id}`],
    enabled: !!user,
  });

  // Only show bottom nav if user is in a competition and team
  if (!user || !userTeamMember || userTeamMember.length === 0) return null;

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/competitions", icon: Trophy, label: "Missions" },
    { path: "/team", icon: Users, label: "Squad" },
    { path: "/activity-feed", icon: Activity, label: "Intel" },
    { path: "/profile", icon: MessageCircle, label: "Comms" }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-tactical-gray-light border-t border-tactical-gray-lighter z-50 md:hidden">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const IconComponent = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <a className={`flex flex-col items-center justify-center p-2 rounded-none transition-colors ${
                isActive 
                  ? "text-military-green" 
                  : "text-gray-400 hover:text-gray-300"
              }`}>
                <IconComponent size={20} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}