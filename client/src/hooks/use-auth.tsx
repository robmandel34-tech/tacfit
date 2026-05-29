import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { loadAuthToken, setAuthToken, getCachedAuthToken } from "@/lib/authToken";
import { queryClient } from "@/lib/queryClient";
import { identifyUser, resetAnalytics } from "@/lib/analytics";

const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "";

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const token = getCachedAuthToken() ?? (await loadAuthToken());
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface User {
  id: number;
  username: string;
  email: string;
  points: number;
  avatar?: string;
  coverPhoto?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, phoneNumber?: string) => Promise<any>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  forceRefresh: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const validateUser = async () => {
      // Prime the auth token cache from persistent storage (Capacitor
      // Preferences on native, localStorage on web) before any API call.
      await loadAuthToken();

      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          identifyUser(userData);
        } catch {
          localStorage.removeItem("user");
          setIsLoading(false);
          return;
        }

        // Try to sync fresh data from the server using bearer token + cookie.
        try {
          const sessionResponse = await fetch(`${API_BASE}/api/auth/me`, {
            credentials: "include",
            headers: await buildAuthHeaders(),
          });
          if (sessionResponse.ok) {
            const currentUser = await sessionResponse.json();
            setUser(currentUser);
            localStorage.setItem("user", JSON.stringify(currentUser));
          }
        } catch {
          // Network error — keep the locally-stored user.
        }
      }
      setIsLoading(false);
    };

    validateUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.message || "Login failed");
        (error as any).requiresEmailVerification = errorData.requiresEmailVerification;
        throw error;
      }

      const userData = await response.json();
      // Persist the bearer token (used by native) before stripping it from the user object.
      if (userData.authToken) {
        await setAuthToken(userData.authToken);
        delete userData.authToken;
      }
      // Drop any cached data from a previous session in this tab — otherwise
      // staleTime:Infinity makes us reuse the prior user's team/competition data.
      queryClient.clear();
      setUser(userData);
      identifyUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      // Navigation is handled by the caller so Capacitor WKWebView gets a single
      // reliable redirect rather than racing wouter's history push with React batching.
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, phoneNumber?: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password, phoneNumber }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const data = await response.json();
      
      // Return data to let component handle verification flow
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: await buildAuthHeaders(),
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    await setAuthToken(null);
    setUser(null);
    resetAnalytics();
    localStorage.removeItem("user");
    // Wipe TanStack Query cache so the next user in this tab doesn't inherit
    // this user's team/competition data.
    queryClient.clear();
    setLocation("/login");
  };

  const forceRefresh = async () => {
    await setAuthToken(null);
    resetAnalytics();
    localStorage.removeItem("user");
    setUser(null);
    queryClient.clear();
    setLocation("/login");
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedUser };
      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
    }
  };

  const refreshUser = async () => {
    if (user) {
      try {
        const response = await fetch(`${API_BASE}/api/users/${user.id}`, {
          credentials: "include",
          headers: await buildAuthHeaders(),
        });
        if (response.ok) {
          const currentUser = await response.json();
          setUser(currentUser);
          localStorage.setItem("user", JSON.stringify(currentUser));
        }
      } catch (error) {
        console.error("Failed to refresh user:", error);
      }
    }
  };

  const contextValue: AuthContextType = {
    user,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    forceRefresh,
    isLoading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}