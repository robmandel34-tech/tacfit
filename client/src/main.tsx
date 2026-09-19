import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { analytics } from "@heycatch/sdk";
import App from "./App";
import "./index.css";
import { installAuthFetchInterceptor, loadAuthToken } from "./lib/authToken";
import { initAnalytics } from "./lib/analytics";

// Native iOS builds bake VITE_API_URL (the published backend); the web build
// talks to its own origin and leaves it empty.
const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "";

// HeyCatch product analytics — initialised once, at module scope, before the
// app renders. Autocaptures pageviews/clicks; identity is set after sign-in in
// lib/analytics.ts and business outcomes are reported by the server.
// When the API lives on another origin (native app), list its host so API
// calls carry the session header that links server events to this session.
const apiHost = (() => {
  if (!API_BASE) return undefined;
  try {
    return new URL(API_BASE).hostname;
  } catch {
    return undefined;
  }
})();
analytics.init({
  projectKey: "hck_pk_RFfvs65QXI_qS_mc3FXOTVjeL_du86XB",
  install: { framework: "vite-react", frameworkVersion: "18", agent: "replit" },
  ...(apiHost ? { tracingHosts: [apiHost] } : {}),
});

// Initialize product analytics (PostHog). No-op if no key is configured.
initAnalytics();

// Attach the bearer token to every API request — required for native iOS
// (Capacitor WKWebView) where cross-origin session cookies are unreliable.
// Web requests are unaffected when no token is stored.
installAuthFetchInterceptor(API_BASE);
// Prime the in-memory token cache from persistent storage before first paint.
void loadAuthToken();

// Register service worker for PWA functionality - only in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);

// On native iOS, hand the static launch image off to the in-app animated splash
// as soon as the web layer paints. The web splash shows the identical Muster Up
// mark, so revealing it produces no flash. A short fallback ensures the native
// splash never sticks if first paint is delayed.
if (Capacitor.isNativePlatform()) {
  const hideNativeSplash = () => {
    SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
  };
  requestAnimationFrame(() => requestAnimationFrame(hideNativeSplash));
  window.setTimeout(hideNativeSplash, 2500);
}
