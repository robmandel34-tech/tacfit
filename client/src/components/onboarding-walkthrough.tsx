import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  Users, 
  Trophy, 
  Target, 
  Activity, 
  MessageSquare, 
  MapPin,
  CheckCircle,
  Play,
  X,
  ExternalLink,
  Mountain,
  Shield,
  Download,
  Smartphone,
  Share,
  Monitor,
  AlertTriangle,
  UserCheck,
  Star
} from 'lucide-react';
import { Link } from 'wouter';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface OnboardingWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingWalkthrough({ isOpen, onClose, onComplete }: OnboardingWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to TacFit',
      description: 'Your tactical fitness competition platform',
      icon: <Trophy className="h-6 w-6" />,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-military-green/20">
              <Trophy className="h-8 w-8 text-military-green" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Mission Briefing</h3>
            <p className="text-gray-300">
              TacFit is a team-based fitness competition platform where you'll join teams, 
              complete fitness activities, and compete for victory.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-gray-800/50">
              <Users className="h-6 w-6 text-military-green mx-auto mb-2" />
              <p className="text-sm text-gray-300">Team-based</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-800/50">
              <Target className="h-6 w-6 text-military-green mx-auto mb-2" />
              <p className="text-sm text-gray-300">Goal-oriented</p>
            </div>
          </div>
          <div className="flex justify-center mt-6">
            <Link href="/help/navigation">
              <Button 
                variant="default" 
                size="sm"
                className="bg-military-green hover:bg-military-green/80 text-black font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn More About Navigation
              </Button>
            </Link>
          </div>
        </div>
      )
    },
    {
      id: 'competitions',
      title: 'Tactical Operations',
      description: 'How competitions work in TacFit',
      icon: <Target className="h-6 w-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-3">Competition Structure</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black">1</div>
                <div>
                  <p className="text-sm font-medium text-white">Join Window</p>
                  <p className="text-xs text-gray-400">Limited time to join and form teams</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black">2</div>
                <div>
                  <p className="text-sm font-medium text-white">Competition Period</p>
                  <p className="text-xs text-gray-400">2-4 weeks of tactical training challenges</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black">3</div>
                <div>
                  <p className="text-sm font-medium text-white">Victory & Rewards</p>
                  <p className="text-xs text-gray-400">Points awarded based on team performance</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded-lg">
            <p className="text-sm text-yellow-200">
              <strong>Pro Tip:</strong> Competitions have specific activity requirements like cardio training, 
              strength operations, and mobility training.
            </p>
          </div>
          <div className="flex justify-center mt-4">
            <Link href="/help/competition-system">
              <Button 
                variant="default" 
                size="sm"
                className="bg-military-green hover:bg-military-green/80 text-black font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn More About Competitions
              </Button>
            </Link>
          </div>
        </div>
      )
    },
    {
      id: 'competition-types',
      title: 'Mission Types',
      description: 'Understanding free vs paid competitions',
      icon: <Star className="h-6 w-6" />,
      content: (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h4 className="font-semibold text-white mb-2">Choose Your Mission Level</h4>
            <p className="text-sm text-gray-300">
              TacFit offers both free and paid competitions to match your commitment level
            </p>
          </div>
          
          <div className="grid gap-4">
            <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <h5 className="font-semibold text-white">Free Competitions</h5>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Individual activity points</span>
                  <span className="text-military-green font-medium">15-30 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Team completion bonus</span>
                  <span className="text-gray-400">None</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Advertisement experience</span>
                  <span className="text-gray-400">Visible</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <h5 className="font-semibold text-white">Paid Competitions</h5>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Individual activity points</span>
                  <span className="text-military-green font-medium">15-30 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Team completion bonus</span>
                  <span className="text-yellow-400 font-medium">Up to 1000 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Advertisement experience</span>
                  <span className="text-military-green font-medium">Ad-free</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-military-green/10 border border-military-green/30 p-3 rounded-lg">
            <p className="text-sm text-military-green">
              <strong>💡 Tactical Advice:</strong> Start with free competitions to learn the ropes, 
              then upgrade to paid for serious team rewards and an ad-free experience.
            </p>
          </div>
          
          <div className="flex justify-center mt-4">
            <Link href="/help/competition-system">
              <Button 
                variant="default" 
                size="sm"
                className="bg-military-green hover:bg-military-green/80 text-black font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn More About Mission Types
              </Button>
            </Link>
          </div>
        </div>
      )
    },
    {
      id: 'teams',
      title: 'Team Formation',
      description: 'Building your tactical team',
      icon: <Users className="h-6 w-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-3">Team Dynamics</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-white">Team Captain</span>
                </div>
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">Leadership role</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-military-green"></div>
                  <span className="text-sm text-white">Team Members</span>
                </div>
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">Support role</Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-800/30 rounded-lg">
              <MessageSquare className="h-5 w-5 text-military-green mx-auto mb-1" />
              <p className="text-xs text-gray-300">Team Chat</p>
            </div>
            <div className="text-center p-3 bg-gray-800/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-military-green mx-auto mb-1" />
              <p className="text-xs text-gray-300">Mission Planning</p>
            </div>
          </div>
          <p className="text-sm text-gray-300">
            Teams work together to complete training goals and climb the leaderboard. 
            Communication and coordination are key to victory.
          </p>
          <div className="flex justify-center mt-4">
            <Link href="/help/team-formation">
              <Button 
                variant="default" 
                size="sm"
                className="bg-military-green hover:bg-military-green/80 text-black font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn More About Teams
              </Button>
            </Link>
          </div>
        </div>
      )
    },
    {
      id: 'activities',
      title: 'Activity Submission',
      description: 'Tracking your tactical training',
      icon: <Activity className="h-6 w-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-3">How to Submit Activities</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-2 bg-gray-700/30 rounded">
                <div className="w-8 h-8 rounded-full bg-military-green flex items-center justify-center">
                  <span className="text-xs text-black font-bold">⊕</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Click the Crosshair Icon</p>
                  <p className="text-xs text-gray-400">Located in the bottom-right corner of any page</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-gray-700/30 rounded">
                <div className="w-8 h-8 rounded bg-military-green/20 flex items-center justify-center">
                  <span className="text-xs text-military-green">📝</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Fill Out Activity Details</p>
                  <p className="text-xs text-gray-400">Choose activity type, quantity, and description</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-gray-700/30 rounded">
                <div className="w-8 h-8 rounded bg-military-green/20 flex items-center justify-center">
                  <span className="text-xs text-military-green">📷</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Add Evidence</p>
                  <p className="text-xs text-gray-400">Upload photos and videos to earn maximum points</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-military-green/20 border border-military-green/30 p-3 rounded-lg">
            <h5 className="font-semibold text-military-green mb-2">Point System</h5>
            <div className="space-y-1 text-sm">
              <p className="text-gray-300">• Base activity (minimum 1 image): <strong className="text-white">15 points</strong></p>
              <p className="text-gray-300">• With additional photo evidence: <strong className="text-white">15 points</strong></p>
              <p className="text-gray-300">• With photo + video: <strong className="text-white">30 points</strong></p>
            </div>
          </div>
          <p className="text-sm text-gray-300">
            Submit your training activities with evidence to earn points for your team. 
            The more evidence you provide, the more points you earn!
          </p>
          <div className="flex justify-center mt-4">
            <Link href="/help/activity-tracking">
              <Button 
                variant="default" 
                size="sm"
                className="bg-military-green hover:bg-military-green/80 text-black font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn More About Activities
              </Button>
            </Link>
          </div>
        </div>
      )
    },
    {
      id: 'navigation',
      title: 'Command Center',
      description: 'Navigating the application',
      icon: <MapPin className="h-6 w-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-3">Main Navigation</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-2 bg-gray-700/30 rounded">
                <div className="w-8 h-8 rounded bg-military-green/20 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-military-green" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Intel Feed</p>
                  <p className="text-xs text-gray-400">View all team activities and updates</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-gray-700/30 rounded">
                <div className="w-8 h-8 rounded bg-military-green/20 flex items-center justify-center">
                  <Mountain className="h-4 w-4 text-military-green" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Competitions</p>
                  <p className="text-xs text-gray-400">Browse and join tactical operations</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-gray-700/30 rounded">
                <div className="w-8 h-8 rounded bg-military-green/20 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-military-green" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Team</p>
                  <p className="text-xs text-gray-400">Manage your team and view progress</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-blue-900/20 border border-blue-600/30 p-3 rounded-lg">
            <p className="text-sm text-blue-200">
              <strong>Navigation Tip:</strong> The bottom navigation is always available. The Team tab will only appear after you join a competition and team.
            </p>
          </div>
          <div className="flex justify-center mt-4">
            <Link href="/help/navigation">
              <Button 
                variant="default" 
                size="sm"
                className="bg-military-green hover:bg-military-green/80 text-black font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn More About Navigation
              </Button>
            </Link>
          </div>
        </div>
      )
    },
    {
      id: 'install-app',
      title: 'Install TacFit App',
      description: 'Get the best tactical experience',
      icon: <Download className="h-6 w-6" />,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-military-green/20">
              <Smartphone className="h-8 w-8 text-military-green" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Install for Best Experience</h3>
            <p className="text-gray-300">
              Install TacFit as an app on your device for faster access and better performance.
            </p>
          </div>
          
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-3">Installation Benefits</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Quick access from your home screen</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Works offline for viewing activities</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Full-screen experience</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Faster loading and performance</span>
              </div>
            </div>
          </div>

          <div className="bg-military-green/20 border border-military-green/30 p-4 rounded-lg">
            <h4 className="font-semibold text-military-green mb-3">How to Install</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Monitor className="h-5 w-5 text-military-green mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Desktop/Laptop</p>
                  <p className="text-xs text-gray-300">Look for the install button in the navigation bar</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Smartphone className="h-5 w-5 text-military-green mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Mobile (iOS/Android)</p>
                  <p className="text-xs text-gray-300">Tap the install button or use browser's "Add to Home Screen" option</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Share className="h-5 w-5 text-military-green mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">iOS Safari</p>
                  <p className="text-xs text-gray-300">Tap Share button → "Add to Home Screen"</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-600/30 p-3 rounded-lg">
            <p className="text-sm text-blue-200">
              <strong>Pro Tip:</strong> Installing the app gives you native app-like experience with offline access to your activities and team updates.
            </p>
          </div>
          
          <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded-lg">
            <p className="text-sm text-yellow-200">
              <strong>Coming Soon:</strong> We're working on deploying a native iPhone application to the App Store for an even better mobile experience.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'community-guidelines',
      title: 'Rules of Engagement',
      description: 'Community standards and tactical etiquette',
      icon: <Shield className="h-6 w-6" />,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-military-green/20">
              <UserCheck className="h-8 w-8 text-military-green" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Community Standards</h3>
            <p className="text-gray-300">
              TacFit supports free speech and encourages light-hearted banter between teams. 
              Some friendly poking and competitive spirit makes competitions fun!
            </p>
          </div>

          <div className="bg-military-green/20 border border-military-green/30 p-4 rounded-lg">
            <h4 className="font-semibold text-military-green mb-3">What's Encouraged</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Friendly competitive banter</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Team motivation and support</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Sharing fitness tips and advice</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Celebrating team victories</span>
              </div>
            </div>
          </div>

          <div className="bg-red-900/20 border border-red-600/30 p-4 rounded-lg">
            <h4 className="font-semibold text-red-400 mb-3 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Prohibited Conduct
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-white mb-1">Harassment & Abuse</p>
                <p className="text-xs text-gray-300">Personal attacks, discriminatory language, or targeted harassment will result in immediate suspension.</p>
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">Cheating & False Evidence</p>
                <p className="text-xs text-gray-300">Submitting fake activities, manipulated photos, or false data.</p>
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">Spam & Disruption</p>
                <p className="text-xs text-gray-300">Excessive posting, off-topic content, or disrupting team communications.</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-900/20 border border-orange-600/30 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-400 mb-2">⚠️ Team Disqualification</h4>
            <p className="text-sm text-orange-200">
              <strong>Important:</strong> If any team member is caught cheating with false activity submissions, 
              <strong className="text-orange-100"> your entire team can be disqualified</strong> from the competition. 
              Team captains are responsible for ensuring all submissions are legitimate.
            </p>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-3">Consequences</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                <span className="text-gray-300">First Warning</span>
                <span className="text-yellow-400 text-xs">Official notice</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                <span className="text-gray-300">Repeated Violations</span>
                <span className="text-orange-400 text-xs">Account suspension</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                <span className="text-gray-300">Severe Misconduct</span>
                <span className="text-red-400 text-xs">Permanent ban</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-600/30 p-3 rounded-lg">
            <p className="text-sm text-blue-200">
              <strong>Remember:</strong> TacFit is about building a supportive fitness community. 
              Respect your fellow operators and play fair!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'ready',
      title: 'Ready for Action',
      description: 'Your mission begins now',
      icon: <Play className="h-6 w-6" />,
      content: (
        <div className="space-y-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-military-green/20">
            <CheckCircle className="h-8 w-8 text-military-green" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Mission Briefing Complete</h3>
          <p className="text-gray-300 mb-4">
            You're now ready to join the tactical fitness community. Start by browsing competitions 
            and joining a team that matches your goals.
          </p>
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-3">Next Steps:</h4>
            <div className="space-y-2 text-left">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Browse available competitions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Join or create a team</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Start submitting activities</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-military-green"></div>
                <span className="text-sm text-gray-300">Communicate with your team</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-4">
            <Link href="/help/point-system">
              <Button 
                variant="default" 
                size="sm"
                className="bg-military-green hover:bg-military-green/80 text-black font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn More About Points
              </Button>
            </Link>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...Array.from(prev), currentStep]));
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set([...Array.from(prev), currentStep]));
    onComplete();
    onClose();
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-gray-900 border-gray-700 flex flex-col">
        <DialogHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-military-green/20">
              {currentStepData.icon}
            </div>
            <div>
              <DialogTitle className="text-white">{currentStepData.title}</DialogTitle>
              <DialogDescription className="text-gray-400">
                {currentStepData.description}
              </DialogDescription>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-gray-400">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              {currentStepData.content}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-700 flex-shrink-0">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:text-white hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:text-gray-500 disabled:border-gray-700 disabled:hover:bg-gray-900 disabled:hover:border-gray-700"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-1.5 mx-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'bg-military-green'
                    : index < currentStep
                    ? 'bg-military-green/80'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleComplete}
              className="bg-military-green hover:bg-military-green/80 text-black font-semibold"
            >
              Start Mission
              <Play className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-military-green hover:bg-military-green/80 text-black font-semibold"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}