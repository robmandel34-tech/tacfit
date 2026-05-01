import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { 
  Menu, 
  Settings, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight 
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { HelpPopupModal } from '@/components/help-popup-modal';

export function HamburgerMenu() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  const handleNavigation = () => {
    setOpen(false);
  };

  const handleHelpClick = () => {
    setOpen(false);
    setTimeout(() => setIsHelpModalOpen(true), 150);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-sm text-white hover:bg-white/10 p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="right" 
          className="w-64 bg-surface-elevated border-border-subtle p-0"
        >
          <div className="flex flex-col h-full py-6">
            <div className="px-4 mb-6">
              <p className="text-white font-semibold text-lg">Menu</p>
              {user && <p className="text-gray-400 text-sm">{user.username}</p>}
            </div>

            <div className="flex flex-col gap-1 px-2 flex-1">
              {/* Settings */}
              <Link 
                href="/settings" 
                onClick={handleNavigation}
                className={`flex items-center justify-between w-full px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                  location === '/settings' 
                    ? 'bg-military-green/10 text-military-green' 
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Link>

              {/* Admin Panel - Only show if user is admin */}
              {user?.isAdmin && (
                <Link 
                  href="/admin" 
                  onClick={handleNavigation}
                  className={`flex items-center justify-between w-full px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                    location === '/admin' 
                      ? 'bg-military-green/10 text-military-green' 
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5" />
                    <span>Admin Panel</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}

              {/* Help Portal */}
              <button
                onClick={handleHelpClick}
                className="flex items-center justify-between w-full px-3 py-3 rounded-lg cursor-pointer transition-colors text-white hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5" />
                  <span>Help Portal</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="px-2 mt-auto">
              <Separator className="bg-border-subtle mb-2" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-lg cursor-pointer transition-colors text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <HelpPopupModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </>
  );
}
