import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { MoodTracker } from "@/components/mood-tracker";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
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
import BottomNavigation from "@/components/bottom-navigation";
import FloatingActionButton from "@/components/floating-action-button";


function Router() {
  return (
    <div className="pb-16 md:pb-0">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
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
        <Route path="/checkout" component={Checkout} />
        <Route path="/subscribe" component={Subscribe} />
        <Route path="/help/competition-system" component={CompetitionSystemHelp} />
        <Route path="/help/team-formation" component={TeamFormationHelp} />
        <Route path="/help/activity-tracking" component={ActivityTrackingHelp} />
        <Route path="/help/point-system" component={PointSystemHelp} />
        <Route path="/help/navigation" component={NavigationHelp} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <MoodTracker>
            <Toaster />
            <Router />
            <BottomNavigation />
            <FloatingActionButton />

          </MoodTracker>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
