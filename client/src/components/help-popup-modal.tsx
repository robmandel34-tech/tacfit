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
  ArrowLeft,
  X,
  Shield
} from 'lucide-react';

// Import help page components directly
import CompetitionSystemHelp from '@/pages/help/competition-system';
import TeamFormationHelp from '@/pages/help/team-formation';
import ActivityTrackingHelp from '@/pages/help/activity-tracking';
import PointSystemHelp from '@/pages/help/point-system';
import CommunityGuidelinesHelp from '@/pages/help/community-guidelines';
import NavigationHelp from '@/pages/help/navigation';

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
      component: "competition-system"
    },
    {
      title: "Team Formation",
      icon: <Users className="h-5 w-5" />,
      description: "Team formation, roles, and collaboration strategies",
      component: "team-formation"
    },
    {
      title: "Activity Tracking",
      icon: <Activity className="h-5 w-5" />,
      description: "Submit training activities and earn points for your team",
      component: "activity-tracking"
    },
    {
      title: "Point System",
      icon: <Target className="h-5 w-5" />,
      description: "Base points (15), bonus for evidence (30 total), team rewards",
      component: "point-system"
    },
    {
      title: "Community Guidelines",
      icon: <Shield className="h-5 w-5" />,
      description: "Rules of engagement, conduct standards, and reporting guidelines",
      component: "community-guidelines"
    },
    {
      title: "Navigation Help",
      icon: <MessageSquare className="h-5 w-5" />,
      description: "Learn how to navigate the TacFit platform effectively",
      component: "navigation"
    }
  ];

  const handleSectionClick = (component: string) => {
    setCurrentView(component);
  };

  const renderHelpContent = () => {
    switch (currentView) {
      case 'competition-system':
        return <CompetitionSystemHelp />;
      case 'team-formation':
        return <TeamFormationHelp />;
      case 'activity-tracking':
        return <ActivityTrackingHelp />;
      case 'point-system':
        return <PointSystemHelp />;
      case 'community-guidelines':
        return <CommunityGuidelinesHelp />;
      case 'navigation':
        return <NavigationHelp />;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-700 overflow-hidden flex flex-col">
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
                onClick={onClose}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1">
            {currentView ? (
              <div className="p-0">
                {renderHelpContent()}
              </div>
            ) : (
              <>
              <div className="space-y-6 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {helpSections.map((section, index) => (
                    <Card 
                      key={index} 
                      className="bg-gray-800 border-gray-700 hover:border-military-green/50 transition-colors cursor-pointer"
                      onClick={() => handleSectionClick(section.component)}
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
                        onClose();
                      }}
                      className="w-full bg-military-green hover:bg-military-green-light text-white"
                    >
                      Start Walkthrough
                    </Button>
                  </CardContent>
                </Card>
              </div>
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