import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const KEY = "tacfit_auth_token";
const isNative = Capacitor.isNativePlatform();

let cachedToken: string | null = null;
let initialized = false;

export async function loadAuthToken(): Promise<string | null> {
  if (initialized) return cachedToken;
  try {
    if (isNative) {
      const { value } = await Preferences.get({ key: KEY });
      cachedToken = value ?? null;
    } else {
      cachedToken = localStorage.getItem(KEY);
    }
  } catch {
    cachedToken = null;
  }
  initialized = true;
  return cachedToken;
}

export async function setAuthToken(token: string | null): Promise<void> {
  cachedToken = token;
  initialized = true;
  try {
    if (token) {
      if (isNative) {
        await Preferences.set({ key: KEY, value: token });
      } else {
        localStorage.setItem(KEY, token);
      }
    } else {
      if (isNative) {
        await Preferences.remove({ key: KEY });
      } else {
        localStorage.removeItem(KEY);
      }
    }
  } catch (e) {
    console.error("Failed to persist auth token:", e);
  }
}

export function getCachedAuthToken(): string | null {
  return cachedToken;
}

/**
 * Install a global fetch interceptor that automatically attaches the
 * `Authorization: Bearer <token>` header to every same-origin or API request.
 * This guarantees that direct `fetch(...)` calls scattered across the app
 * (not just those going through apiRequest) carry the bearer token, which
 * is essential for native (Capacitor iOS) where cross-origin cookies are
 * unreliable.
 *
 * Call this exactly once at app startup, BEFORE React renders.
 */
export function installAuthFetchInterceptor(apiBase: string): void {
  if (typeof window === "undefined" || (window as any).__tacfitFetchPatched) return;
  (window as any).__tacfitFetchPatched = true;

  const originalFetch = window.fetch.bind(window);
  const apiBaseNormalized = apiBase.replace(/\/$/, "");

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      // Resolve target URL as a string
      let url: string;
      if (typeof input === "string") url = input;
      else if (input instanceof URL) url = input.toString();
      else url = (input as Request).url;

      // Only attach token to our own API: relative `/api/...` calls OR
      // calls to the configured native API base.
      const isApiCall =
        url.startsWith("/api/") ||
        url.startsWith("api/") ||
        (apiBaseNormalized.length > 0 && url.startsWith(apiBaseNormalized + "/api/"));

      if (isApiCall) {
        const token = getCachedAuthToken();
        if (token) {
          const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          init = { ...(init || {}), headers };
        }
      }
    } catch {
      // If anything goes wrong with the interception, fall back to original fetch
    }
    return originalFetch(input as any, init);
  };
}
