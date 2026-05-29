import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installAuthFetchInterceptor, loadAuthToken } from "./lib/authToken";
import { initAnalytics } from "./lib/analytics";

// Initialize product analytics (PostHog). No-op if no key is configured.
initAnalytics();

// Attach the bearer token to every API request — required for native iOS
// (Capacitor WKWebView) where cross-origin session cookies are unreliable.
// Web requests are unaffected when no token is stored.
const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "";
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
