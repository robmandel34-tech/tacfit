import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingWalkthrough } from '@/components/onboarding-walkthrough';
import { 
  HelpCircle, 
  BookOpen, 
  Trophy, 
  Users, 
  Activity, 
  MessageSquare,
  Target,
  ExternalLink,
  ArrowLeft,
  X
} from 'lucide-react';
import { Link } from 'wouter';

interface HelpPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpPopupModal({ isOpen, onClose }: HelpPopupModalProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentView, setCurrentView] = useState<string | null>(null);

  const helpSections = [
    {
      title: "Competition System",
      icon: <Trophy className="h-5 w-5" />,
      description: "Understand join windows, team formation, and victory conditions",
      href: "/help/competition-system"
    },
    {
      title: "Team Formation",
      icon: <Users className="h-5 w-5" />,
      description: "Team formation, roles, and collaboration strategies",
      href: "/help/team-formation"
    },
    {
      title: "Activity Tracking",
      icon: <Activity className="h-5 w-5" />,
      description: "Submit training activities and earn points for your team",
      href: "/help/activity-tracking"
    },
    {
      title: "Point System",
      icon: <Target className="h-5 w-5" />,
      description: "Base points (15), bonus for evidence (30 total), team rewards",
      href: "/help/point-system"
    },
    {
      title: "Navigation Help",
      icon: <MessageSquare className="h-5 w-5" />,
      description: "Learn how to navigate the TacFit platform effectively",
      href: "/help/navigation"
    }
  ];

  const handleSectionClick = (href: string) => {
    setCurrentView(href);
  };

  const handleLinkClick = () => {
    onClose();
  };

  // Reset current view when modal closes
  const handleModalClose = () => {
    setCurrentView(null);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleModalClose}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] bg-gray-900 border-gray-700 overflow-hidden flex flex-col"
          aria-describedby="help-modal-description"
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-white flex items-center justify-between">
              {currentView ? (
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setCurrentView(null)}
                    className="text-gray-400 hover:text-white mr-2 p-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span>Back to Help Portal</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <HelpCircle className="h-6 w-6 text-military-green" />
                  <span>TacFit Help Center</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleModalClose}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div id="help-modal-description" className="space-y-6 overflow-y-auto flex-1 pr-2 py-4">
            {currentView ? (
              <div className="text-gray-300">
                <iframe 
                  src={currentView} 
                  className="w-full h-96 rounded-lg border border-gray-600"
                  title="Help Content"
                />
                <div className="mt-4 flex justify-center">
                  <Link href={currentView} onClick={handleLinkClick}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-military-green border-military-green hover:bg-military-green hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Full Page
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {helpSections.map((section, index) => (
                    <Card 
                      key={index} 
                      className="bg-gray-800 border-gray-700 hover:border-military-green/50 transition-colors cursor-pointer"
                      onClick={() => handleSectionClick(section.href)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center space-x-2 text-lg">
                          <div className="text-military-green">
                            {section.icon}
                          </div>
                          <span>{section.title}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {section.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <BookOpen className="h-5 w-5 text-military-green" />
                      <span>New to TacFit?</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-400 text-sm">
                      Take our guided walkthrough to learn the basics of tactical fitness competition.
                    </p>
                    <Button 
                      onClick={() => {
                        setShowOnboarding(true);
                        handleModalClose();
                      }}
                      className="w-full bg-military-green hover:bg-military-green-light text-white"
                    >
                      Start Walkthrough
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Walkthrough */}
      <OnboardingWalkthrough
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => setShowOnboarding(false)}
      />
    </>
  );
}