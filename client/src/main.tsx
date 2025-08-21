import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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

// Add error handling for the root render
try {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }
  createRoot(root).render(<App />);
} catch (error) {
  console.error("Failed to render app:", error);
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #111; color: #fff; font-family: Arial;">
      <div style="text-align: center;">
        <h2>App Loading Error</h2>
        <p>Please refresh the page</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px; background: #22c55e; color: white; border: none; border-radius: 5px; cursor: pointer;">Refresh</button>
      </div>
    </div>
  `;
}
