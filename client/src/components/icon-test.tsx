import { Shield, Trophy, Activity, MessageCircle, Users, Bell, HelpCircle } from "lucide-react";

export function IconTest() {
  return (
    <div className="fixed top-20 right-4 z-50 bg-red-500 p-4 rounded">
      <div className="text-white mb-2">Icon Test:</div>
      <div className="flex gap-2">
        <Shield className="h-6 w-6 text-white" />
        <Trophy className="h-6 w-6 text-yellow-400" />
        <Activity className="h-6 w-6 text-green-400" />
        <MessageCircle className="h-6 w-6 text-blue-400" />
        <Users className="h-6 w-6 text-purple-400" />
        <Bell className="h-6 w-6 text-orange-400" />
        <HelpCircle className="h-6 w-6 text-pink-400" />
      </div>
      <div className="text-white text-xs mt-2">
        Can you see these 7 colored icons above?
      </div>
    </div>
  );
}