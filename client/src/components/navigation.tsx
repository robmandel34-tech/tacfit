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
    <header className="bg-surface-elevated border-b border-border-subtle sticky top-0 z-50 shadow-medium">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <Shield className="text-military-green text-3xl" />
              <span className="text-2xl font-bold text-heading tracking-tight">TacFit</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link 
                href="/"
                className={`${location === '/' ? 'text-primary font-semibold' : 'text-gray-300'} hover:text-military-green transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-surface-overlay`}
              >
                Command Center
              </Link>
              <Link 
                href="/competitions"
                className={`${location === '/competitions' ? 'text-primary font-semibold' : 'text-gray-300'} hover:text-military-green transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-surface-overlay`}
              >
                Competitions
              </Link>
              <Link 
                href="/team"
                className={`${location === '/team' ? 'text-primary font-semibold' : 'text-gray-300'} hover:text-military-green transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-surface-overlay`}
              >
                Squad
              </Link>
              <Link 
                href="/activity-feed"
                className={`${location === '/activity-feed' ? 'text-primary font-semibold' : 'text-gray-300'} hover:text-military-green transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-surface-overlay`}
              >
                Intel Feed
              </Link>
              {user.isAdmin && (
                <Link 
                  href="/admin"
                  className={`${location === '/admin' ? 'text-primary font-semibold' : 'text-gray-300'} hover:text-military-green transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-surface-overlay`}
                >
                  Admin Portal
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-surface-overlay px-4 py-2 rounded-full border border-border-subtle">
              <Trophy className="text-combat-orange text-lg" />
              <span className="text-sm font-semibold text-white">{user.points || 0} PTS</span>
            </div>
            {user.isAdmin && (
              <Link 
                href="/admin"
                className="md:hidden text-gray-300 hover:text-military-green transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-surface-overlay"
              >
                Admin
              </Link>
            )}
            <div className="relative">
              <button 
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
                onClick={() => navigate('/profile')}
              >
                {user.avatar ? (
                  <img
                    src={`/uploads/${user.avatar}`}
                    alt="Profile picture"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-military-green rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{getInitials(user.username)}</span>
                  </div>
                )}
                <span className="hidden md:block text-white font-semibold">{user.username}</span>
              </button>
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
