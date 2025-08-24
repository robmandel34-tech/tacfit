import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { InstallAppButton } from "@/components/install-app-button";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { ShieldPlus, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Navigation() {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  if (!user) return null;

  // Get pending tasks for notification count
  const { data: pendingTasks = [] } = useQuery({
    queryKey: [`/api/mission-tasks/user/${user.id}/pending`],
    enabled: !!user.id,
  });

  // Get unread message count
  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations", user.id],
    enabled: !!user.id,
  });

  const pendingTasksCount = Array.isArray(pendingTasks) ? pendingTasks.length : 0;
  const unreadMessagesCount = conversations.reduce((total: number, conv: any) => total + Number(conv.unreadCount || 0), 0);
  const hasNotifications = pendingTasksCount > 0 || unreadMessagesCount > 0;

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  return (
    <header className="bg-surface-elevated border-b border-border-subtle sticky top-0 z-50 shadow-medium w-full overflow-hidden safe-area-nav">
      <div className="container mx-auto px-4 py-4 max-w-full">
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center space-x-3 md:space-x-6 min-w-0 flex-shrink">
            <div className="flex items-center space-x-3 flex-shrink-0">
              <ShieldPlus 
                className="h-6 w-6 text-military-green" 
                style={{ display: 'inline-block', strokeWidth: 1.5 }}
                onLoad={() => console.log("ShieldPlus icon loaded")}
                onError={() => console.log("ShieldPlus icon error")}
              />
              <span className="text-2xl font-bold text-heading tracking-tight">TacFit</span>
            </div>
            <nav className="hidden md:flex space-x-4 lg:space-x-8 flex-shrink">
              <Link 
                href="/"
                className={`${location === '/' ? 'text-primary font-semibold' : 'text-gray-300'} hover:text-military-green transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-surface-overlay text-sm font-medium`}
              >
                Command Center
              </Link>
              <Link 
                href="/competitions"
                className={`${location === '/competitions' ? 'text-primary font-semibold' : 'text-gray-300'} hover:text-military-green transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-surface-overlay text-sm font-medium`}
              >
                Competitions
              </Link>
              <Link 
                href="/team"
                className={`${location === '/team' ? 'text-primary font-semibold' : 'text-gray-300'} hover:text-military-green transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-surface-overlay text-sm font-medium`}
              >
                Team
              </Link>
              <Link 
                href="/activity-feed"
                className={`${location === '/activity-feed' ? 'text-primary font-semibold' : 'text-gray-300'} hover:text-military-green transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-surface-overlay text-sm font-medium`}
              >
                Intel Feed
              </Link>

            </nav>
          </div>
          <div className="flex items-center space-x-1 md:space-x-3 flex-shrink-0">
            <div className="hidden lg:flex items-center space-x-2 bg-surface-overlay px-3 py-2 rounded-full border border-border-subtle">
              <Trophy 
                className="h-4 w-4 text-combat-orange" 
                style={{ display: 'inline-block' }}
              />
              <span className="text-sm font-semibold text-white">{user.points || 0} PTS</span>
            </div>
            <InstallAppButton />
            <HamburgerMenu />
            <div className="relative">
              <button 
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
                onClick={() => navigate('/profile')}
              >
                <div className="relative">
                  {user.avatar ? (
                    <img
                      src={`/uploads/${user.avatar}`}
                      alt="Profile picture"
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        console.error("Profile image failed to load:", user.avatar);
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.fallback-avatar') as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                      onLoad={() => {
                        console.log("Profile image loaded successfully:", user.avatar);
                      }}
                    />
                  ) : null}
                  <div className="w-10 h-10 bg-military-green rounded-full flex items-center justify-center fallback-avatar" style={{ display: user.avatar ? 'none' : 'flex' }}>
                    <span className="text-white font-bold text-sm">{getInitials(user.username)}</span>
                  </div>
                  {/* Notification indicator for tasks and messages */}
                  {hasNotifications && (
                    <div className="absolute -top-1 -left-1 bg-combat-orange rounded-full w-3 h-3"></div>
                  )}
                </div>
                <span className="hidden md:block text-white font-medium text-sm">{user.username}</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
