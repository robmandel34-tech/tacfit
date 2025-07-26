import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Crown, Shield, MessageCircle, Target } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function TeamFormationHelp() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-tactical-gray">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="text-gray-400 hover:text-white mb-4"
            onClick={() => window.close()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Close Tab
          </Button>
          <h1 className="text-3xl font-bold text-white mb-2">Team Formation</h1>
          <p className="text-gray-400">Complete guide to building and managing your tactical fitness team</p>
        </div>

        <div className="space-y-6">
          {/* Team Basics */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="h-6 w-6 mr-2 text-military-green" />
                Team Formation Basics
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Teams are the foundation of TacFit competitions. Every participant must be part of a team 
                to compete in tactical operations. Teams provide accountability, motivation, and shared goals 
                that drive individual and collective success.
              </p>
              <div className="bg-military-green/10 border border-military-green/30 p-4 rounded-lg">
                <h4 className="font-semibold text-military-green mb-2">Why Teams Matter:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Accountability:</strong> Team members motivate each other to stay active</li>
                  <li>• <strong>Support System:</strong> Share challenges and celebrate victories together</li>
                  <li>• <strong>Strategic Planning:</strong> Coordinate efforts for maximum team points</li>
                  <li>• <strong>Social Connection:</strong> Build buddy relationships through shared fitness goals</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Joining vs Creating */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="h-6 w-6 mr-2 text-military-green" />
                Joining vs Creating Teams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-300 mb-3 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Joining Existing Teams
                  </h4>
                  <p className="text-sm text-gray-300 mb-3">
                    Browse available teams and join one that matches your goals and schedule.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-2">
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>View team members and their activity levels</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Check team motto and culture fit</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Join teams with open slots</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Start contributing immediately</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-green-900/20 border border-green-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-300 mb-3 flex items-center">
                    <Crown className="h-5 w-5 mr-2" />
                    Creating New Teams
                  </h4>
                  <p className="text-sm text-gray-300 mb-3">
                    Start your own team and recruit members who share your vision and commitment.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-2">
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Become team captain automatically</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Set team name and motto</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Recruit compatible team members</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Lead team strategy and coordination</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Roles */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Crown className="h-6 w-6 mr-2 text-military-green" />
                Team Roles & Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <Crown className="h-6 w-6 text-yellow-400 mr-3" />
                    <h4 className="font-semibold text-white">Team Captain</h4>
                    <span className="ml-auto text-xs bg-yellow-600/20 text-yellow-300 px-2 py-1 rounded">Leadership Role</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-white mb-2">Privileges:</h5>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Edit team name and motto</li>
                        <li>• Manage mission planning board</li>
                        <li>• Assign tasks to team members</li>
                        <li>• Upload and change team photos</li>
                        <li>• Lead team chat discussions</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-white mb-2">Rewards:</h5>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• 2x bonus points for competition wins</li>
                        <li>• Recognition as team leader</li>
                        <li>• Enhanced profile visibility</li>
                        <li>• Strategic decision-making authority</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/50 border border-gray-600/30 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <Shield className="h-6 w-6 text-gray-400 mr-3" />
                    <h4 className="font-semibold text-white">Team Members</h4>
                    <span className="ml-auto text-xs bg-gray-600/20 text-gray-300 px-2 py-1 rounded">Core Contributors</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-white mb-2">Responsibilities:</h5>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Submit daily fitness activities</li>
                        <li>• Participate in team communications</li>
                        <li>• Complete assigned mission tasks</li>
                        <li>• Support team goals and strategy</li>
                        <li>• Provide evidence for activities</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-white mb-2">Benefits:</h5>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Individual and team recognition</li>
                        <li>• Competition win bonuses</li>
                        <li>• Access to team chat and planning</li>
                        <li>• Supportive fitness community</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Communication */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <MessageCircle className="h-6 w-6 mr-2 text-military-green" />
                Team Communication & Coordination
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Effective communication is crucial for team success. TacFit provides multiple tools 
                to help teams coordinate their efforts and stay connected throughout competitions.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-300 mb-3 flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Team Chat
                  </h4>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Real-time messaging with team members</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Share workout tips and motivation</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Emoji and GIF support for fun interactions</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Coordinate schedules and activities</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-purple-900/20 border border-purple-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-300 mb-3 flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Mission Planning
                  </h4>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Create and assign team tasks</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Track completion status</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Set strategic goals and milestones</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 mr-2 flex-shrink-0"></div>
                      <span>Captain-managed task delegation</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Target className="h-6 w-6 mr-2 text-military-green" />
                Team Success Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-3">For Team Captains:</h4>
                  <div className="space-y-2">
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Set clear team expectations and goals</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Regularly check in with team members</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Create motivating team motto and identity</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Lead by example with consistent activity</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3">For All Team Members:</h4>
                  <div className="space-y-2">
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Communicate openly about challenges</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Celebrate each other's achievements</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Submit activities with quality evidence</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Stay active in team chat and planning</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}