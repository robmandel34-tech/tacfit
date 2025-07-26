import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, Users, Trophy, Calendar, Activity } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function CompetitionSystemHelp() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-tactical-gray">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="text-gray-400 hover:text-white mb-4"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white mb-2">Competition System</h1>
          <p className="text-gray-400">Complete guide to TacFit's tactical operations and competition mechanics</p>
        </div>

        <div className="space-y-6">
          {/* Overview */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Target className="h-6 w-6 mr-2 text-military-green" />
                Competition Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                TacFit competitions are structured fitness challenges designed to promote teamwork, 
                accountability, and healthy competition. Each competition follows a three-phase structure 
                to ensure fair participation and exciting outcomes.
              </p>
              <div className="bg-military-green/10 border border-military-green/30 p-4 rounded-lg">
                <h4 className="font-semibold text-military-green mb-2">Key Benefits:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Team-based accountability and motivation</li>
                  <li>• Structured fitness goals with measurable outcomes</li>
                  <li>• Social connection through shared challenges</li>
                  <li>• Rewards and recognition for achievement</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Three Phases */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Calendar className="h-6 w-6 mr-2 text-military-green" />
                Competition Phases
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white mr-3">1</div>
                    <h4 className="font-semibold text-white">Join Window</h4>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">
                    Limited time period where participants can register and form teams.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Browse available competitions</li>
                    <li>• Join existing teams or create new ones</li>
                    <li>• Review competition requirements</li>
                    <li>• Team formation and strategy planning</li>
                  </ul>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-sm font-bold text-black mr-3">2</div>
                    <h4 className="font-semibold text-white">Competition Period</h4>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">
                    Active competition phase lasting 2-4 weeks where teams complete challenges.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Submit daily fitness activities</li>
                    <li>• Coordinate with team members</li>
                    <li>• Track progress on leaderboards</li>
                    <li>• Complete fitness activities to earn team points</li>
                  </ul>
                </div>

                <div className="bg-green-900/20 border border-green-600/30 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-sm font-bold text-black mr-3">3</div>
                    <h4 className="font-semibold text-white">Victory & Rewards</h4>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">
                    Competition concludes with rankings and reward distribution.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Final team rankings calculated</li>
                    <li>• Points awarded to top performers</li>
                    <li>• Achievement recognition</li>
                    <li>• Prepare for next competition</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Structure */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="h-6 w-6 mr-2 text-military-green" />
                Team Structure & Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-3">Team Captain</h4>
                  <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded-lg">
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start">
                        <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                        <span>Edit team name and motto</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                        <span>Manage mission planning tasks</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                        <span>Lead team strategy and coordination</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                        <span>Receive bonus points for team performance</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3">Team Members</h4>
                  <div className="bg-gray-700/50 border border-gray-600/30 p-3 rounded-lg">
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start">
                        <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                        <span>Submit fitness activities with evidence</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                        <span>Participate in team chat communications</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                        <span>Complete assigned mission tasks</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                        <span>Support team goals and objectives</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Scoring System */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-military-green" />
                Scoring & Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-3">Activity Points</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <span className="text-sm">Base Activity Submission</span>
                      <span className="font-semibold text-military-green">15 points</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <span className="text-sm">With Photo + Video Evidence</span>
                      <span className="font-semibold text-military-green">30 points</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3">Competition Rewards</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                      <span className="text-sm">1st Place Team</span>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Captain: 1000pts</div>
                        <div className="text-xs text-gray-400">Members: 500pts</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <span className="text-sm">2nd Place Team</span>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Captain: 500pts</div>
                        <div className="text-xs text-gray-400">Members: 250pts</div>
                      </div>
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