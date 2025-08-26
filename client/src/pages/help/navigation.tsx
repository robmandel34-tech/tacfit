import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Trophy, Users, Activity, User, Menu, Target } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NavigationHelp() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-tactical-gray">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Navigation Guide</h1>
          <p className="text-gray-400">Complete guide to navigating the TacFit platform efficiently</p>
        </div>

        <div className="space-y-6">
          {/* Navigation Overview */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Menu className="h-6 w-6 mr-2 text-military-green" />
                Navigation Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                TacFit uses a dual navigation system designed for both desktop and mobile users. 
                The main navigation adapts based on your participation status and provides quick 
                access to all essential features.
              </p>
              <div className="bg-military-green/10 border border-military-green/30 p-4 rounded-lg">
                <h4 className="font-semibold text-military-green mb-2">Navigation Features:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Responsive Design:</strong> Optimized for both desktop and mobile devices</li>
                  <li>• <strong>Context-Aware:</strong> Shows different options based on your team participation</li>
                  <li>• <strong>Quick Actions:</strong> Floating action button for instant activity submission</li>
                  <li>• <strong>Bottom Navigation:</strong> Mobile-friendly tabs for active team members</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Top Navigation */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Menu className="h-6 w-6 mr-2 text-military-green" />
                Top Navigation Bar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-300">
                The top navigation bar is always visible and provides access to core platform 
                features, user information, and quick actions.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Left Side Elements:</h4>
                  
                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <h5 className="font-medium text-military-green mb-2 flex items-center">
                      <Home className="h-4 w-4 mr-2" />
                      TacFit Logo
                    </h5>
                    <p className="text-xs text-gray-400">
                      Click to return to the main Intel Feed (home page) from anywhere in the app
                    </p>
                  </div>

                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <h5 className="font-medium text-military-green mb-2">Main Navigation Links</h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• <strong>Intel:</strong> Activity feed and home dashboard</li>
                      <li>• <strong>Competitions:</strong> Browse and join tactical operations</li>
                      <li>• <strong>Team:</strong> View your current team (if participating)</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Right Side Elements:</h4>
                  
                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <h5 className="font-medium text-military-green mb-2">Point Display</h5>
                    <p className="text-xs text-gray-400">
                      Shows your current tactical points total. Points update in real-time 
                      as you submit activities and earn rewards.
                    </p>
                  </div>

                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <h5 className="font-medium text-military-green mb-2 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Profile Menu
                    </h5>
                    <p className="text-xs text-gray-400 mb-2">
                      Click your profile picture or username to access:
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• View/edit your profile</li>
                      <li>• Help center and tutorials</li>
                      <li>• Admin portal (if admin)</li>
                      <li>• Logout option</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Navigation */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Target className="h-6 w-6 mr-2 text-military-green" />
                Bottom Navigation (Mobile & Active Teams)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-300">
                The bottom navigation appears for all authenticated users and provides quick access to the three most important sections.
              </p>

              <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-300 mb-2">Availability:</h4>
                <p className="text-sm text-gray-300">
                  Bottom navigation appears for all users. The Team tab is only available when you're actively participating in a competition as part of a team.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-300 mb-3 flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Intel
                  </h4>
                  <p className="text-sm text-gray-300 mb-2">Activity feed and home dashboard</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• View all platform activities</li>
                    <li>• See latest submissions from all users</li>
                    <li>• Quick access to activity submission</li>
                    <li>• Browse community activity feed</li>
                  </ul>
                </div>

                <div className="bg-red-900/20 border border-red-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-300 mb-3 flex items-center">
                    <Trophy className="h-5 w-5 mr-2" />
                    Competition
                  </h4>
                  <p className="text-sm text-gray-300 mb-2">Your active competition status</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• View competition leaderboards</li>
                    <li>• Check team progress on map</li>
                    <li>• See all competition activities</li>
                    <li>• Track competition timeline</li>
                  </ul>
                </div>

                <div className="bg-green-900/20 border border-green-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-300 mb-3 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Team
                  </h4>
                  <p className="text-sm text-gray-300 mb-2">Your team management center</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• View team members and stats</li>
                    <li>• Access team chat communications</li>
                    <li>• Manage mission planning tasks</li>
                    <li>• Edit team details (if captain)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Floating Action Button */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Target className="h-6 w-6 mr-2 text-military-green" />
                Floating Action Button
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-3">Quick Activity Submission</h4>
                  <p className="text-sm text-gray-300 mb-3">
                    The crosshair target button in the bottom-right corner provides instant access 
                    to activity submission from any page in the app.
                  </p>
                  <div className="bg-military-green/10 border border-military-green/30 p-3 rounded-lg">
                    <h5 className="font-medium text-military-green mb-2">Features:</h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Always accessible (except login page)</li>
                      <li>• Opens activity submission modal</li>
                      <li>• Shows competition-specific activities</li>
                      <li>• Supports photo and video evidence</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3">When It Appears</h4>
                  <div className="space-y-3">
                    <div className="bg-green-900/20 border border-green-600/30 p-3 rounded-lg">
                      <h5 className="font-medium text-green-300 mb-1">Visible For:</h5>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Authenticated users</li>
                        <li>• All pages except login/register</li>
                        <li>• Users with or without team membership</li>
                      </ul>
                    </div>
                    <div className="bg-red-900/20 border border-red-600/30 p-3 rounded-lg">
                      <h5 className="font-medium text-red-300 mb-1">Hidden On:</h5>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Login and registration pages</li>
                        <li>• When user is not authenticated</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Tips */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Home className="h-6 w-6 mr-2 text-military-green" />
                Navigation Tips & Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-3">Efficient Navigation:</h4>
                  <div className="space-y-2">
                    <div className="flex items-start p-2 bg-gray-700/70 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm text-white">Use the logo to quickly return to Intel Feed</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/70 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm text-white">Bottom navigation for quick tab switching</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/70 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm text-white">Floating button for instant activity submission</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/70 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm text-white">Profile menu for account and help access</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3">Mobile Navigation:</h4>
                  <div className="space-y-2">
                    <div className="flex items-start p-2 bg-gray-700/70 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm text-white">Bottom tabs are optimized for thumb navigation</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/70 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm text-white">Floating button positioned for easy access</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/70 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm text-white">Top navigation collapses on smaller screens</span>
                    </div>
                    <div className="flex items-start p-2 bg-gray-700/70 rounded">
                      <div className="w-2 h-2 rounded-full bg-military-green mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm text-white">Swipe gestures supported for tab switching</span>
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