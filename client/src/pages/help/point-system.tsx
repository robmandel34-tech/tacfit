import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Coins, Trophy, Star, Target } from "lucide-react";
import { Link } from "wouter";

export default function PointSystemHelp() {
  return (
    <div className="min-h-screen bg-tactical-gray">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="text-gray-400 hover:text-white mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Intel Feed
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Point System</h1>
          <p className="text-gray-400">Complete guide to earning, using, and maximizing your tactical points</p>
        </div>

        <div className="space-y-6">
          {/* Point System Overview */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Coins className="h-6 w-6 mr-2 text-military-green" />
                Tactical Points Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Tactical points are TacFit's currency system that rewards your fitness activities, 
                competition performance, and platform engagement. Points serve multiple purposes: 
                individual recognition, team contribution, and access to platform features.
              </p>
              <div className="bg-military-green/10 border border-military-green/30 p-4 rounded-lg">
                <h4 className="font-semibold text-military-green mb-2">Point System Benefits:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Individual Recognition:</strong> Track your fitness commitment and progress</li>
                  <li>• <strong>Team Contribution:</strong> Your points directly impact team competition rankings</li>
                  <li>• <strong>Platform Access:</strong> Create competitions and unlock premium features</li>
                  <li>• <strong>Social Status:</strong> Display your dedication to the TacFit community</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Earning Points */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Star className="h-6 w-6 mr-2 text-military-green" />
                How to Earn Points
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Activity Submissions</h4>
                  
                  <div className="bg-gray-700/50 border border-gray-600/30 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">Base Activity</span>
                      <span className="font-bold text-military-green text-lg">15 pts</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Submit any fitness activity (cardio, strength, mobility) with quantity measurement
                    </p>
                  </div>

                  <div className="bg-military-green/10 border border-military-green/30 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">Activity + Evidence</span>
                      <span className="font-bold text-military-green text-lg">30 pts</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Include both photo and video evidence for bonus (+15 additional points)
                    </p>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded-lg">
                    <p className="text-sm text-yellow-200">
                      <strong>Pro Tip:</strong> Always upload both photo and video evidence to maximize 
                      your points per activity submission!
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Competition Rewards</h4>
                  
                  <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg">
                    <h5 className="font-medium text-yellow-300 mb-2 flex items-center">
                      <Trophy className="h-4 w-4 mr-2" />
                      1st Place Team
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Team Captain:</span>
                        <span className="font-bold text-yellow-300">1,000 pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Team Members:</span>
                        <span className="font-bold text-yellow-300">500 pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700/50 border border-gray-600/30 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-300 mb-2 flex items-center">
                      <Trophy className="h-4 w-4 mr-2" />
                      2nd Place Team
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Team Captain:</span>
                        <span className="font-bold text-gray-300">500 pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Team Members:</span>
                        <span className="font-bold text-gray-300">250 pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-300 mb-2">Referral Rewards</h5>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Successful Phone Invitation:</span>
                      <span className="font-bold text-blue-300">200 pts</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Earned when someone joins TacFit using your phone invitation link
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Using Points */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Target className="h-6 w-6 mr-2 text-military-green" />
                Using Your Points
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-300">
                Points aren't just for show - they unlock important platform features and 
                demonstrate your commitment to the TacFit community.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-red-900/20 border border-red-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-300 mb-3 flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Competition Creation
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Required Points:</span>
                      <span className="font-bold text-red-300 text-lg">1,000 pts</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Create your own competitions with custom activities, team limits, and duration. 
                      Points are not consumed - this is a minimum balance requirement.
                    </p>
                  </div>
                </div>

                <div className="bg-green-900/20 border border-green-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-300 mb-3 flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Free Competition Joining
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Required Points:</span>
                      <span className="font-bold text-green-300 text-lg">0 pts</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Joining competitions and teams is completely free. No points required - 
                      just find a competition and start contributing to your team!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Point Strategy */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-military-green" />
                Point Maximization Strategies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-3">Daily Point Earning:</h4>
                  <div className="space-y-3">
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <h5 className="font-medium text-military-green mb-2">Submit Multiple Activities</h5>
                      <p className="text-xs text-gray-400">
                        Each activity submission earns points. Break larger workouts into 
                        separate activities when appropriate (cardio + strength + mobility).
                      </p>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <h5 className="font-medium text-military-green mb-2">Always Include Evidence</h5>
                      <p className="text-xs text-gray-400">
                        The 15-point evidence bonus adds up quickly. Make it a habit to 
                        capture both photo and video proof of your activities.
                      </p>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <h5 className="font-medium text-military-green mb-2">Consistent Daily Submissions</h5>
                      <p className="text-xs text-gray-400">
                        Regular activity submissions not only earn points but also help 
                        your team maintain momentum in competitions.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3">Long-term Point Goals:</h4>
                  <div className="space-y-3">
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <h5 className="font-medium text-military-green mb-2">Reach 1,000 Points</h5>
                      <p className="text-xs text-gray-400">
                        Unlock competition creation rights. This typically requires 
                        33-50 activity submissions with evidence over several weeks.
                      </p>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <h5 className="font-medium text-military-green mb-2">Team Leadership</h5>
                      <p className="text-xs text-gray-400">
                        High-point users often become natural team captains and leaders 
                        in the TacFit community, earning respect and bonus rewards.
                      </p>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <h5 className="font-medium text-military-green mb-2">Invite Buddies</h5>
                      <p className="text-xs text-gray-400">
                        Use phone invitations to bring buddies to TacFit. Each successful 
                        invitation earns 200 points and grows the community.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Point Examples */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Coins className="h-6 w-6 mr-2 text-military-green" />
                Point Earning Examples
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-3">Weekly Point Scenarios:</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-red-900/20 border border-red-600/30 p-3 rounded-lg">
                    <h5 className="font-medium text-red-300 mb-2">Minimal Effort</h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• 3 activities per week</li>
                      <li>• No evidence uploaded</li>
                      <li>• 15 pts × 3 = 45 pts/week</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded-lg">
                    <h5 className="font-medium text-yellow-300 mb-2">Good Commitment</h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• 5 activities per week</li>
                      <li>• Evidence for all activities</li>
                      <li>• 30 pts × 5 = 150 pts/week</li>
                    </ul>
                  </div>
                  <div className="bg-green-900/20 border border-green-600/30 p-3 rounded-lg">
                    <h5 className="font-medium text-green-300 mb-2">High Performance</h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• 7+ activities per week</li>
                      <li>• Evidence for all activities</li>
                      <li>• 30 pts × 7 = 210+ pts/week</li>
                    </ul>
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