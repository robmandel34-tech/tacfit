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
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshUser: () => Promise<void>;
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
          const userData = JSON.parse(savedUser);
          // Validate the user still exists in the database
          const response = await fetch(`/api/users/${userData.id}`);
          if (response.ok) {
            const currentUser = await response.json();
            setUser(currentUser);
          } else {
            // User no longer exists, clear localStorage
            localStorage.removeItem("user");
            setUser(null);
          }
        } catch (error) {
          // Invalid user data, clear localStorage
          localStorage.removeItem("user");
          setUser(null);
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
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      // Force navigation to dashboard
      window.location.href = "/";
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      setLocation("/");
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
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
        const response = await fetch(`/api/users/${user.id}`);
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