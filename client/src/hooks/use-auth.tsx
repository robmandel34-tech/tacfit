import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

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
        try {
          // Validate session is still active on the server
          const sessionResponse = await fetch("/api/auth/me", {
            credentials: "include",
          });
          if (sessionResponse.ok) {
            const currentUser = await sessionResponse.json();
            setUser(currentUser);
            localStorage.setItem("user", JSON.stringify(currentUser));
          } else {
            // Session expired or invalid — clear local state and force re-login
            localStorage.removeItem("user");
            setUser(null);
            setLocation("/login");
          }
        } catch (error) {
          // Network error — keep local user data to avoid unnecessary logouts
          try {
            const userData = JSON.parse(savedUser);
            setUser(userData);
          } catch {
            localStorage.removeItem("user");
            setUser(null);
            setLocation("/login");
          }
        }
      }
      setIsLoading(false);
    };

    validateUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
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
      console.log("Login response:", userData); // Debug log
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      // Force navigation to dashboard
      window.location.href = "/";
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, phoneNumber?: string) => {
    try {
      const response = await fetch("/api/auth/register", {
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
      await fetch("/api/auth/logout", {
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
        const response = await fetch(`/api/users/${user.id}`, {
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