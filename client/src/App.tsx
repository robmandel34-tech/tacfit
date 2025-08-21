import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { MoodTracker } from "@/components/mood-tracker";
import { ErrorBoundary } from "@/components/error-boundary";
import { AppLoader } from "@/components/app-loader";
import { MinimalApp } from "@/components/minimal-app";
import { InstallPrompt } from "@/components/install-prompt";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import EmailVerification from "@/pages/email-verification";
import Competitions from "@/pages/competitions";
import CompetitionStatus from "@/pages/competition-status";
import Team from "@/pages/team";
import TeamPublic from "@/pages/team-public";
import ActivityFeed from "@/pages/activity-feed";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import Invitation from "@/pages/invitation";
import TeamInvite from "@/pages/team-invite";
import AdminPage from "@/pages/admin";
import Checkout from "@/pages/checkout";
import Subscribe from "@/pages/subscribe";
import CompetitionSystemHelp from "@/pages/help/competition-system";
import TeamFormationHelp from "@/pages/help/team-formation";
import ActivityTrackingHelp from "@/pages/help/activity-tracking";
import PointSystemHelp from "@/pages/help/point-system";
import NavigationHelp from "@/pages/help/navigation";
import Settings from "@/pages/settings";
import BottomNavigation from "@/components/bottom-navigation";
import FloatingActionButton from "@/components/floating-action-button";


function Router() {
  return (
    <div className="pb-16 md:pb-0">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/verify-email" component={EmailVerification} />
        <Route path="/competitions" component={Competitions} />
        <Route path="/competition-status" component={CompetitionStatus} />
        <Route path="/team" component={Team} />
        <Route path="/team/:teamId" component={TeamPublic} />
        <Route path="/activity-feed" component={ActivityFeed} />
        <Route path="/profile" component={Profile} />
        <Route path="/profile/:userId" component={Profile} />
        <Route path="/invite/:token" component={Invitation} />
        <Route path="/team-invite/:token" component={TeamInvite} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/checkout/:id" component={Checkout} />
        <Route path="/subscribe" component={Subscribe} />
        <Route path="/help/competition-system" component={CompetitionSystemHelp} />
        <Route path="/help/team-formation" component={TeamFormationHelp} />
        <Route path="/help/activity-tracking" component={ActivityTrackingHelp} />
        <Route path="/help/point-system" component={PointSystemHelp} />
        <Route path="/help/navigation" component={NavigationHelp} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  // Don't render anything until auth is resolved
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-military-green"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <Router />
      <BottomNavigation />
      <FloatingActionButton />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
