import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCachedAuthToken, loadAuthToken } from "./authToken";

// In native Capacitor context, API calls must use the absolute backend URL.
// Set VITE_API_URL in your .env.production to your deployed backend (e.g. https://myapp.replit.app)
export const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "";

async function buildAuthHeaders(): Promise<Record<string, string>> {
  // Use the in-memory cached token when available (instant). Fall back to
  // an async load on the very first request after app launch.
  const token = getCachedAuthToken() ?? (await loadAuthToken());
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Helper to build absolute URLs for user-uploaded files.
// Handles bare filenames ("photo.jpg"), full paths ("/uploads/photo.jpg"), and already-absolute URLs.
export const uploadUrl = (path: string | null | undefined): string => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return `${API_BASE}/uploads/${path}`;
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeaders = await buildAuthHeaders();
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...authHeaders,
  };
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = await buildAuthHeaders();
    const res = await fetch(`${API_BASE}${queryKey.join("/")}`, {
      credentials: "include",
      headers: authHeaders,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
