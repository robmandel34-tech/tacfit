import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen } from "lucide-react";
import { OnboardingWalkthrough } from "@/components/onboarding-walkthrough";

// Hosts the full guided tour in the help portal. New users reach it from the
// "Walk through the overview" onboarding choice; anyone can revisit it later.
export default function WalkthroughHelp() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-tactical-gray">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Guided Walkthrough</h1>
          <p className="text-gray-400">
            A step-by-step overview of competitions, teams, activities, points and navigation.
          </p>
        </div>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-white">
              <BookOpen className="h-5 w-5 text-military-green" />
              <span className="font-semibold">Interactive Tutorial</span>
            </div>
            <p className="text-gray-300 text-sm">
              Take the tour again any time from here or from the Help menu.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setOpen(true)}
                className="bg-military-green hover:bg-military-green/80 text-forest-green font-semibold"
                data-testid="button-restart-walkthrough"
              >
                Start Walkthrough
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                className="border-gray-600 text-white hover:bg-gray-700"
                data-testid="button-walkthrough-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Feed
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <OnboardingWalkthrough
        isOpen={open}
        mode="tour"
        onClose={() => setOpen(false)}
        onComplete={() => setLocation("/")}
      />
    </div>
  );
}
