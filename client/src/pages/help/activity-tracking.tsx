import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Camera, Video, Award, Clock } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function ActivityTrackingHelp() {
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
          <h1 className="text-3xl font-bold text-white mb-2">Activity Tracking</h1>
          <p className="text-gray-400">Complete guide to submitting and tracking your fitness activities</p>
        </div>

        <div className="space-y-6">
          {/* Activity Overview */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Activity className="h-6 w-6 mr-2 text-military-green" />
                Activity Submission Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                Activity tracking is the core of TacFit competitions. Every workout, training session, 
                and fitness activity you complete contributes to your team's success. The more evidence 
                you provide, the more points you earn for your team.
              </p>
              <div className="bg-military-green/10 border border-military-green/30 p-4 rounded-lg">
                <h4 className="font-semibold text-military-green mb-2">Why Activity Tracking Matters:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Team Points:</strong> Each activity directly contributes to team rankings</li>
                  <li>• <strong>Personal Progress:</strong> Track your fitness journey over time</li>
                  <li>• <strong>Accountability:</strong> Share your commitment with teammates</li>
                  <li>• <strong>Motivation:</strong> See your impact on team performance</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Activity Types */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Clock className="h-6 w-6 mr-2 text-military-green" />
                Activity Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-300">
                TacFit organizes all fitness activities into three main categories. Each competition 
                will specify which activities are required and set target goals for teams to achieve.
              </p>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-red-900/20 border border-red-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-300 mb-3 flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Cardio Training
                  </h4>
                  <p className="text-sm text-gray-300 mb-3">Measured in minutes</p>
                  <div className="space-y-2">
                    <h5 className="font-medium text-white text-sm">Examples:</h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Running, jogging, walking</li>
                      <li>• Cycling (indoor/outdoor)</li>
                      <li>• Swimming laps</li>
                      <li>• HIIT workouts</li>
                      <li>• Dance fitness classes</li>
                      <li>• Rowing machine</li>
                      <li>• Elliptical training</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-300 mb-3 flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Strength Training
                  </h4>
                  <p className="text-sm text-gray-300 mb-3">Measured in repetitions</p>
                  <div className="space-y-2">
                    <h5 className="font-medium text-white text-sm">Examples:</h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Weight lifting (any type)</li>
                      <li>• Push-ups, pull-ups, squats</li>
                      <li>• Resistance band training</li>
                      <li>• Bodyweight exercises</li>
                      <li>• Functional movements</li>
                      <li>• Core strengthening</li>
                      <li>• Kettlebell workouts</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-green-900/20 border border-green-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-300 mb-3 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Mobility Training
                  </h4>
                  <p className="text-sm text-gray-300 mb-3">Measured in minutes</p>
                  <div className="space-y-2">
                    <h5 className="font-medium text-white text-sm">Examples:</h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Yoga sessions</li>
                      <li>• Stretching routines</li>
                      <li>• Pilates classes</li>
                      <li>• Mobility work</li>
                      <li>• Recovery sessions</li>
                      <li>• Balance training</li>
                      <li>• Foam rolling</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission Process */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Camera className="h-6 w-6 mr-2 text-military-green" />
                How to Submit Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-3">Step-by-Step Submission:</h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black mr-3">1</div>
                    <div>
                      <p className="text-sm font-medium text-white">Click the Floating Action Button</p>
                      <p className="text-xs text-gray-400">Look for the crosshair target button in the bottom right</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black mr-3">2</div>
                    <div>
                      <p className="text-sm font-medium text-white">Select Activity Type</p>
                      <p className="text-xs text-gray-400">Choose from your competition's required activities</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black mr-3">3</div>
                    <div>
                      <p className="text-sm font-medium text-white">Enter Quantity</p>
                      <p className="text-xs text-gray-400">Input minutes for cardio/mobility, reps for strength</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black mr-3">4</div>
                    <div>
                      <p className="text-sm font-medium text-white">Add Evidence (Optional but Recommended)</p>
                      <p className="text-xs text-gray-400">Upload photos and videos for bonus points</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black mr-3">5</div>
                    <div>
                      <p className="text-sm font-medium text-white">Submit Activity</p>
                      <p className="text-xs text-gray-400">Points are automatically awarded to your team</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evidence & Points */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Video className="h-6 w-6 mr-2 text-military-green" />
                Evidence & Point System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-3">Point Values</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-white">Base Activity</span>
                        <p className="text-xs text-gray-400">Activity submission only</p>
                      </div>
                      <span className="font-bold text-military-green text-lg">15 pts</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-military-green/10 border border-military-green/30 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-white">With Evidence</span>
                        <p className="text-xs text-gray-400">Photo + Video proof</p>
                      </div>
                      <span className="font-bold text-military-green text-lg">30 pts</span>
                    </div>
                  </div>
                  <div className="mt-4 bg-yellow-900/20 border border-yellow-600/30 p-3 rounded-lg">
                    <p className="text-sm text-yellow-200">
                      <strong>Pro Tip:</strong> Always submit both photo and video evidence when possible 
                      to earn double points (30 vs 15) for your team!
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3">Evidence Guidelines</h4>
                  <div className="space-y-4">
                    <div className="bg-blue-900/20 border border-blue-600/30 p-3 rounded-lg">
                      <h5 className="font-medium text-blue-300 mb-2 flex items-center">
                        <Camera className="h-4 w-4 mr-2" />
                        Photo Evidence
                      </h5>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>• Clear image of you performing the activity</li>
                        <li>• Show equipment or environment when relevant</li>
                        <li>• Include workout stats from fitness apps/devices</li>
                        <li>• Before/after progress photos</li>
                      </ul>
                    </div>

                    <div className="bg-purple-900/20 border border-purple-600/30 p-3 rounded-lg">
                      <h5 className="font-medium text-purple-300 mb-2 flex items-center">
                        <Video className="h-4 w-4 mr-2" />
                        Video Evidence
                      </h5>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>• Short clips showing activity in progress</li>
                        <li>• Demonstration of proper form/technique</li>
                        <li>• Time-lapse of longer activities</li>
                        <li>• Post-workout celebration or summary</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Award className="h-6 w-6 mr-2 text-military-green" />
                Activity Tracking Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-3">Maximize Your Points:</h4>
                  <div className="space-y-2">
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Always include both photo and video evidence</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Submit activities immediately after completion</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Be accurate with quantity measurements</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Focus on your competition's required activities</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3">Team Contribution Tips:</h4>
                  <div className="space-y-2">
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Check team progress regularly</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Coordinate with teammates on activity types</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Share your achievements in team chat</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Help teammates reach their goals</span>
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