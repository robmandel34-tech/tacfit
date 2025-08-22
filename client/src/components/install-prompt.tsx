import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone, Monitor } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if user has permanently dismissed the prompt
    const permanentlyDismissed = localStorage.getItem('pwa-prompt-never-show');
    if (permanentlyDismissed) return;
    
    // Check if shown today already
    const lastShown = localStorage.getItem('pwa-prompt-last-shown');
    const today = new Date().toDateString();
    if (lastShown === today) return;
    
    // Don't show on registration day - wait until user has been active
    if (user) {
      const userCreatedAt = new Date(user.createdAt);
      const now = new Date();
      const registrationDay = new Date(userCreatedAt);
      registrationDay.setHours(23, 59, 59, 999);
      
      // Don't show on registration day
      if (now <= registrationDay) return;
    }

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 30 seconds to not be intrusive, and mark as shown today
      setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem('pwa-prompt-last-shown', today);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual installation instructions
    if (ios) {
      setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem('pwa-prompt-last-shown', today);
      }, 30000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Just dismiss for today (already marked when shown)
  };
  
  const handleNeverShow = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-never-show', 'true');
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="bg-military-green border-military-green text-white shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle className="text-lg">Install TacFit App</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-white hover:bg-white/20 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-200">
                Install TacFit on your iPhone for the best experience:
              </p>
              <ol className="text-sm space-y-1 text-gray-200">
                <li>1. Tap the Share button <span className="font-mono">📤</span></li>
                <li>2. Scroll down and tap "Add to Home Screen"</li>
                <li>3. Tap "Add" to confirm</li>
              </ol>
              <div className="space-y-2 mt-3">
                <Button
                  onClick={handleDismiss}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  Got it!
                </Button>
                <Button
                  onClick={handleNeverShow}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-gray-300 hover:bg-white/10"
                >
                  Don't show again
                </Button>
              </div>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-200">
                Get quick access to TacFit by adding it to your home screen. Works offline too!
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="flex-1 bg-white text-military-green hover:bg-gray-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  Not now
                </Button>
              </div>
              <Button
                onClick={handleNeverShow}
                variant="ghost"
                size="sm"
                className="w-full text-xs text-gray-300 hover:bg-white/10"
              >
                Don't show again
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-200">
                Add TacFit to your home screen for quick access. Look for the install option in your browser menu.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={handleDismiss}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  Got it!
                </Button>
                <Button
                  onClick={handleNeverShow}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-gray-300 hover:bg-white/10"
                >
                  Don't show again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function useInstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    setDeferredPrompt(null);
    setIsInstallable(false);
    
    return outcome === 'accepted';
  };

  return { isInstallable, promptInstall };
}