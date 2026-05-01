import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "";

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
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        // Always restore from localStorage first so the UI is instantly available
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        } catch {
          localStorage.removeItem("user");
          setIsLoading(false);
          return;
        }

        // Then try to sync fresh data from the server.
        // In Capacitor (capacitor://localhost → https://tacfit.replit.app), cross-origin
        // cookies may not be forwarded on the first cold load. If the check fails, we
        // keep the locally-stored user so the app stays functional rather than booting
        // the user to the login screen unnecessarily.
        try {
          const sessionResponse = await fetch(`${API_BASE}/api/auth/me`, {
            credentials: "include",
          });
          if (sessionResponse.ok) {
            const currentUser = await sessionResponse.json();
            setUser(currentUser);
            localStorage.setItem("user", JSON.stringify(currentUser));
          }
          // If 401/403: session cookie not available (common in Capacitor cold-start).
          // The user stays logged in via localStorage; protected routes will redirect
          // to login naturally if a real auth error occurs.
        } catch {
          // Network error — keep the localStorage user as-is.
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
      setUser(userData);
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
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUser(null);
    localStorage.removeItem("user");
    setLocation("/login");
  };

  const forceRefresh = () => {
    localStorage.removeItem("user");
    setUser(null);
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