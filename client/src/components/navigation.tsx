import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation, useRouter } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Trophy, MessageCircle, Users, Activity } from "lucide-react";

export default function Navigation() {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  if (!user) return null;

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  return (
    <header className="bg-tactical-gray-light border-b border-tactical-gray-lighter sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="text-military-green text-2xl" />
              <span className="text-xl font-bold text-white">TacFit</span>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link href="/">
                <a className={`${location === '/' ? 'text-white' : 'text-gray-300'} hover:text-military-green transition-colors font-medium`}>
                  Dashboard
                </a>
              </Link>
              <Link href="/competitions">
                <a className={`${location === '/competitions' ? 'text-white' : 'text-gray-300'} hover:text-military-green transition-colors font-medium`}>
                  Competitions
                </a>
              </Link>
              <Link href="/team">
                <a className={`${location === '/team' ? 'text-white' : 'text-gray-300'} hover:text-military-green transition-colors font-medium`}>
                  Teams
                </a>
              </Link>
              <Link href="/activity-feed">
                <a className={`${location === '/activity-feed' ? 'text-white' : 'text-gray-300'} hover:text-military-green transition-colors font-medium`}>
                  Activity Feed
                </a>
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-tactical-gray-lighter px-3 py-1 rounded-full">
              <Trophy className="text-combat-orange text-sm" />
              <span className="text-sm font-medium">{user.points || 0} PTS</span>
            </div>
            <div className="relative">
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 bg-tactical-gray-lighter hover:bg-tactical-gray-lightest px-3 py-2 rounded-lg"
                onClick={() => navigate('/profile')}
              >
                <div className="w-8 h-8 bg-military-green rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{getInitials(user.username)}</span>
                </div>
                <span className="hidden md:block text-white font-medium">{user.username}</span>
              </Button>
            </div>
            <Button 
              variant="ghost" 
              onClick={logout}
              className="text-gray-300 hover:text-white"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
