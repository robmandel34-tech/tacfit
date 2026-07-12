import { useEffect, useState, Component, ReactNode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import MusterSplash from "@/components/MusterSplash";
import CelebrationOverlay from "@/components/celebration-overlay";

// Class-based error boundary — must be a class component
class ErrorBoundaryBase extends Component<
  { children: ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error("App error boundary caught:", error.message, error.stack);
    this.props.onError?.(error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-tactical-dark flex flex-col items-center justify-center p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-white text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-sm mb-6">An unexpected error occurred on this page.</p>
          <button
            className="bg-military-green text-forest-green px-6 py-2 rounded-lg font-semibold"
            onClick={() => { this.setState({ hasError: false }); window.location.href = "/"; }}
          >
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Route-aware wrapper: changing the key destroys/recreates the boundary,
// automatically resetting hasError whenever the user navigates to a new route.
function ErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundaryBase key={location}>{children}</ErrorBoundaryBase>;
}

// Minimal boundary for UI chrome (nav, FAB) — never shows full-page error, just hides the broken widget
class SilentErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error("UI chrome error (silenced):", error.message);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
import { MoodTracker } from "@/components/mood-tracker";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import EmailVerification from "@/pages/email-verification";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Competitions from "@/pages/competitions";
import CompetitionStatus from "@/pages/competition-status";
import Team from "@/pages/team";
import Call from "@/pages/call";
import TeamPublic from "@/pages/team-public";
import ActivityFeed from "@/pages/activity-feed";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import Invitation from "@/pages/invitation";
import JoinCompetition from "@/pages/join-competition";
import TeamInvite from "@/pages/team-invite";
import AdminPage from "@/pages/admin";
import CompetitionSystemHelp from "@/pages/help/competition-system";
import TeamFormationHelp from "@/pages/help/team-formation";
import ActivityTrackingHelp from "@/pages/help/activity-tracking";
import PointSystemHelp from "@/pages/help/point-system";
import NavigationHelp from "@/pages/help/navigation";
import CommunityGuidelinesHelp from "@/pages/help/community-guidelines";
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
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/competitions" component={Competitions} />
        <Route path="/competition-status" component={CompetitionStatus} />
        <Route path="/team" component={Team} />
        <Route path="/call/:callId" component={Call} />
        <Route path="/team/:teamId" component={TeamPublic} />
        <Route path="/activity-feed" component={ActivityFeed} />
        <Route path="/profile" component={Profile} />
        <Route path="/profile/:userId" component={Profile} />
        <Route path="/invite/:token" component={Invitation} />
        <Route path="/join/:code" component={JoinCompetition} />
        <Route path="/team-invite/:token" component={TeamInvite} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/help/competition-system" component={CompetitionSystemHelp} />
        <Route path="/help/team-formation" component={TeamFormationHelp} />
        <Route path="/help/activity-tracking" component={ActivityTrackingHelp} />
        <Route path="/help/point-system" component={PointSystemHelp} />
        <Route path="/help/navigation" component={NavigationHelp} />
        <Route path="/help/community-guidelines" component={CommunityGuidelinesHelp} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();

  return (
    <MoodTracker>
      <Toaster />
      <CelebrationOverlay />
      <ErrorBoundary>
        <Router />
      </ErrorBoundary>
      <SilentErrorBoundary>
        <BottomNavigation />
      </SilentErrorBoundary>
      <SilentErrorBoundary>
        <FloatingActionButton />
      </SilentErrorBoundary>
    </MoodTracker>
  );
}

function App() {
  // The in-app animated splash (parachute drop-in). Renders on top of everything
  // while the app loads, plays one pass, then fades to reveal the app. Gated per
  // session: on native iOS every cold launch is a fresh webview session so it
  // plays on each launch, while browser refreshes within a session skip it.
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem('muster_splash_shown') !== '1';
    } catch {
      return true;
    }
  });
  const dismissSplash = () => {
    try {
      sessionStorage.setItem('muster_splash_shown', '1');
    } catch {
      /* ignore (private mode / unavailable storage) */
    }
    setShowSplash(false);
  };

  // Remove the instant first-paint splash from index.html once React has mounted.
  // The animated MusterSplash overlay (rendered below) already covers the screen
  // with the identical Muster Up mark, so this is just cleanup — no visible flash.
  useEffect(() => {
    const splash = document.getElementById('tacfit-splash');
    if (splash) {
      splash.style.opacity = '0';
      const timer = setTimeout(() => splash.remove(), 380);
      return () => clearTimeout(timer);
    }
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <>
      {showSplash && <MusterSplash onDone={dismissSplash} />}
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
