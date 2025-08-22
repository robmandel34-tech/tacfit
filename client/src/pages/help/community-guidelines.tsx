import { Shield, AlertTriangle, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CommunityGuidelinesHelp() {
  return (
    <div className="min-h-screen bg-tactical-gray">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Community Guidelines</h1>
          <p className="text-gray-400">Rules of engagement and community standards for TacFit operators</p>
        </div>

        <div className="space-y-6">
          {/* Community Philosophy */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <UserCheck className="h-6 w-6 mr-2 text-military-green" />
                Community Philosophy
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <p>
                TacFit supports free speech and encourages light-hearted banter between teams. 
                Some friendly poking and competitive spirit makes competitions fun! Our community 
                thrives on mutual respect, accountability, and shared commitment to fitness excellence.
              </p>
              <div className="bg-military-green/10 border border-military-green/30 p-4 rounded-lg">
                <h4 className="font-semibold text-military-green mb-2">Core Values:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Respect:</strong> Honor your fellow operators and their fitness journeys</li>
                  <li>• <strong>Integrity:</strong> Submit accurate and truthful activity data</li>
                  <li>• <strong>Accountability:</strong> Support your team and honor your commitments</li>
                  <li>• <strong>Inclusivity:</strong> Welcome operators of all fitness levels and backgrounds</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Encouraged Behavior */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="h-6 w-6 mr-2 text-military-green" />
                Encouraged Behavior
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                These behaviors help build a strong, supportive tactical fitness community:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-white">Team Spirit</h4>
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
                      <span className="text-sm text-gray-300">Celebrating team victories</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-white">Knowledge Sharing</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-military-green"></div>
                      <span className="text-sm text-gray-300">Sharing fitness tips and advice</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-military-green"></div>
                      <span className="text-sm text-gray-300">Encouraging struggling teammates</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-military-green"></div>
                      <span className="text-sm text-gray-300">Sharing success stories</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prohibited Conduct */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertTriangle className="h-6 w-6 mr-2 text-red-400" />
                Prohibited Conduct
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                The following behaviors will result in warnings, suspensions, or permanent bans:
              </p>
              <div className="space-y-4">
                <div className="bg-red-900/20 border border-red-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-400 mb-3">Harassment & Abuse</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Personal attacks based on appearance, ability, or background</li>
                    <li>• Discriminatory language (racism, sexism, homophobia, etc.)</li>
                    <li>• Targeted harassment or bullying of other users</li>
                    <li>• Threats of violence or harm</li>
                    <li>• Sharing personal information without consent</li>
                  </ul>
                </div>

                <div className="bg-orange-900/20 border border-orange-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-400 mb-3">Cheating & Fraud</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Submitting fake or manipulated activity photos/videos</li>
                    <li>• False reporting of activity duration, intensity, or type</li>
                    <li>• Using someone else's workout data as your own</li>
                    <li>• Creating multiple accounts to gain unfair advantages</li>
                    <li>• Coordinating with other teams to manipulate competition results</li>
                  </ul>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-400 mb-3">Disruptive Behavior</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Excessive posting or spamming in team chats</li>
                    <li>• Off-topic discussions that disrupt team coordination</li>
                    <li>• Intentionally misleading or giving false advice</li>
                    <li>• Promoting external services, products, or competitions</li>
                    <li>• Impersonating other users or platform administrators</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Consequences */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertTriangle className="h-6 w-6 mr-2 text-orange-400" />
                Team Disqualification Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-900/20 border border-orange-600/30 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-400 mb-2">⚠️ Important: Collective Responsibility</h4>
                <p className="text-orange-200 mb-3">
                  <strong>If any team member is caught cheating with false activity submissions, 
                  your entire team can be disqualified</strong> from the competition. This policy 
                  ensures fair play and maintains competitive integrity.
                </p>
                <div className="space-y-2 text-sm text-gray-300">
                  <h5 className="font-medium text-orange-300">Team Captain Responsibilities:</h5>
                  <ul className="space-y-1 ml-4">
                    <li>• Monitor team member activity submissions for legitimacy</li>
                    <li>• Address suspicious activity reports immediately</li>
                    <li>• Communicate community standards to new team members</li>
                    <li>• Report suspected violations to platform administrators</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enforcement & Appeals */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="h-6 w-6 mr-2 text-military-green" />
                Enforcement & Consequences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg text-center">
                  <h4 className="font-semibold text-yellow-400 mb-2">First Warning</h4>
                  <p className="text-sm text-gray-300">Official notice sent via email and platform notification</p>
                </div>
                <div className="bg-orange-900/20 border border-orange-600/30 p-4 rounded-lg text-center">
                  <h4 className="font-semibold text-orange-400 mb-2">Account Suspension</h4>
                  <p className="text-sm text-gray-300">1-30 day suspension for repeated violations</p>
                </div>
                <div className="bg-red-900/20 border border-red-600/30 p-4 rounded-lg text-center">
                  <h4 className="font-semibold text-red-400 mb-2">Permanent Ban</h4>
                  <p className="text-sm text-gray-300">Account termination for severe misconduct</p>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-2">Appeal Process</h4>
                <p className="text-sm text-blue-200 mb-2">
                  If you believe you've been unfairly penalized, you can appeal through the following process:
                </p>
                <ol className="text-sm text-gray-300 space-y-1 ml-4">
                  <li>1. Contact support within 7 days of the penalty</li>
                  <li>2. Provide evidence supporting your appeal</li>
                  <li>3. Allow 3-5 business days for review</li>
                  <li>4. Receive final decision via email</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Reporting Violations */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertTriangle className="h-6 w-6 mr-2 text-military-green" />
                Reporting Violations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Help maintain our community standards by reporting violations when you encounter them:
              </p>
              <div className="bg-military-green/10 border border-military-green/30 p-4 rounded-lg">
                <h4 className="font-semibold text-military-green mb-3">How to Report:</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-military-green"></div>
                    <span>Use the report button on activities, chat messages, or profiles</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-military-green"></div>
                    <span>Contact team captains for team-related issues</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-military-green"></div>
                    <span>Email support for serious violations or appeals</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-military-green"></div>
                    <span>Provide screenshots or evidence when possible</span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-600/30 p-3 rounded-lg">
                <p className="text-sm text-blue-200">
                  <strong>Remember:</strong> False reporting or misuse of the reporting system 
                  is itself a violation and may result in penalties.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}