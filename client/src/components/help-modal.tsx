import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  ExternalLink
} from 'lucide-react';
import { Link } from 'wouter';

export function HelpModal() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const helpSections = [
    {
      title: "Getting Started",
      icon: <BookOpen className="h-5 w-5" />,
      description: "Learn the basics of TacFit and how competitions work",
      href: "/help/navigation"
    },
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
      description: "Base points (20), bonus for evidence (30 total), team rewards",
      href: "/help/point-system"
    },
    {
      title: "Navigation Guide",
      icon: <MessageSquare className="h-5 w-5" />,
      description: "Learn to navigate TacFit's interface and features efficiently",
      href: "/help/navigation"
    }
  ];

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-gray-300 hover:text-military-green p-2"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-gray-900 border-gray-700 overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-white flex items-center space-x-2">
              <HelpCircle className="h-6 w-6 text-military-green" />
              <span>TacFit Help Center</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto flex-1 pr-2 py-4">
            {/* Interactive Walkthrough */}
            <Card className="bg-gradient-to-r from-military-green-dark to-military-green border-military-green/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Interactive Tutorial</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-200 mb-4">
                  New to TacFit? Take our guided walkthrough to learn all the features and competition mechanics.
                </p>
                <Button 
                  onClick={() => setShowOnboarding(true)}
                  className="bg-white text-black hover:bg-gray-100 font-semibold"
                >
                  Start Walkthrough
                </Button>
              </CardContent>
            </Card>

            {/* Help Topics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {helpSections.map((section, index) => (
                <Link key={index} href={section.href}>
                  <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-military-green/20 flex items-center justify-center group-hover:bg-military-green/30 transition-colors">
                          <div className="text-military-green">
                            {section.icon}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-white mb-1 group-hover:text-military-green transition-colors">{section.title}</h3>
                            <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-military-green transition-colors" />
                          </div>
                          <p className="text-sm text-gray-400">{section.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Quick Tips */}
            <Card className="bg-gray-800/30 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 rounded-full bg-military-green mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">Submit activities with both photo and video evidence to earn maximum points (30 vs 20)</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 rounded-full bg-military-green mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">Team captains can edit team names, mottos, and manage mission planning tasks</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 rounded-full bg-military-green mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">Use team chat and mission planning to coordinate with your team effectively</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 rounded-full bg-military-green mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">Check the progress map on competition status page to see your team's position</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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