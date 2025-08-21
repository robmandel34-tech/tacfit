import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    logout();
    setOpen(false);
  };

  const handleNavigation = () => {
    setOpen(false);
  };

  const handleHelpClick = () => {
    setOpen(false); // Close hamburger menu
    setIsHelpModalOpen(true); // Open help modal
  };

  return (
    <>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-sm text-white hover:bg-white/10 p-2"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-surface-elevated border-border-subtle"
      >
        {/* Settings */}
        <DropdownMenuItem asChild>
          <Link 
            href="/settings" 
            onClick={handleNavigation}
            className={`flex items-center justify-between w-full cursor-pointer ${
              location === '/settings' ? 'bg-military-green/10 text-military-green' : 'text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </div>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </DropdownMenuItem>

        {/* Admin Panel - Only show if user is admin */}
        {user?.isAdmin && (
          <DropdownMenuItem asChild>
            <Link 
              href="/admin" 
              onClick={handleNavigation}
              className={`flex items-center justify-between w-full cursor-pointer ${
                location === '/admin' ? 'bg-military-green/10 text-military-green' : 'text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Admin Panel</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </DropdownMenuItem>
        )}

        {/* Help Portal */}
        <DropdownMenuItem asChild>
          <div 
            onClick={handleHelpClick}
            className="flex items-center justify-between w-full cursor-pointer text-white hover:bg-white/10 px-2 py-1.5 rounded-sm"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span>Help Portal</span>
            </div>
            <ChevronRight className="h-4 w-4" />
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border-subtle" />

        {/* Logout */}
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-red-400 hover:bg-red-500/10 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Help Modal */}
    <HelpPopupModal 
      isOpen={isHelpModalOpen}
      onClose={() => setIsHelpModalOpen(false)}
    />
    </>
  );
}