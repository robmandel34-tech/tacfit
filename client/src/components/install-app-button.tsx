import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Download, Smartphone, Monitor, Share } from "lucide-react";
import { useInstallPrompt } from "./install-prompt";

export function InstallAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [isIOS] = useState(/iPad|iPhone|iPod/.test(navigator.userAgent));
  const [isInstalled] = useState(window.matchMedia('(display-mode: standalone)').matches);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setIsOpen(false);
    }
  };

  if (isInstalled) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-gray-300 hover:bg-surface-overlay hover:text-white">
          <Download className="h-4 w-4" />
          Install App
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-surface-elevated border-border-subtle">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-heading">
            <Smartphone className="h-5 w-5 text-military-green" />
            Install TacFit App
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            Get the best TacFit experience by installing the app on your device.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isInstallable ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-military-green/20 rounded-lg border border-military-green/30">
                <Monitor className="h-5 w-5 text-military-green" />
                <div>
                  <p className="font-medium text-heading">Quick Install Available</p>
                  <p className="text-sm text-text-secondary">
                    Your browser supports one-click installation
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleInstall} 
                className="w-full bg-military-green hover:bg-military-green/90"
              >
                <Download className="h-4 w-4 mr-2" />
                Install TacFit App
              </Button>
            </div>
          ) : isIOS ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-surface-overlay rounded-lg border border-border-subtle">
                <Share className="h-5 w-5 text-combat-orange" />
                <div>
                  <p className="font-medium text-heading">iOS Installation</p>
                  <p className="text-sm text-text-secondary">
                    Follow these steps to add TacFit to your home screen
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-text-primary">
                <div className="flex items-start gap-3">
                  <div className="bg-military-green text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</div>
                  <p>Tap the Share button <span className="text-lg">📤</span> at the bottom of your browser</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-military-green text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</div>
                  <p>Scroll down and tap <strong className="text-heading">"Add to Home Screen"</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-military-green text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</div>
                  <p>Tap <strong className="text-heading">"Add"</strong> to confirm</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-surface-overlay rounded-lg border border-border-subtle">
                <Monitor className="h-5 w-5 text-combat-orange" />
                <div>
                  <p className="font-medium text-heading">Browser Installation</p>
                  <p className="text-sm text-text-secondary">
                    Look for install options in your browser menu
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-text-primary">
                <p><strong className="text-heading">Chrome/Edge:</strong> Look for the install icon in the address bar or menu</p>
                <p><strong className="text-heading">Firefox:</strong> Check the menu for "Install" or "Add to Home Screen"</p>
                <p><strong className="text-heading">Other browsers:</strong> Look for PWA or install options in settings</p>
              </div>
            </div>
          )}
          
          <div className="pt-3 border-t border-border-subtle">
            <h4 className="font-medium mb-2 text-heading">Benefits of installing:</h4>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• Quick access from your home screen</li>
              <li>• Works offline for viewing activities</li>
              <li>• Full-screen experience without browser bars</li>
              <li>• Faster loading and better performance</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}