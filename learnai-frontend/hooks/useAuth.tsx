"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { auth as authLib, User } from "@/lib/auth";
import { api } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; isAdmin?: boolean }>;
  register: (name: string, username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const storedUser = authLib.getUser();
      const token = authLib.getToken();
      
      if (token && storedUser) {
        setUser(storedUser);
        try {
          const response = await api.auth.me();
          setUser(response.user);
          authLib.setUser(response.user);
        } catch {
          authLib.clear();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authLib.getUser();
        const token = authLib.getToken();

        if (token && storedUser) {
          setUser(storedUser);
          try {
            const response = await api.auth.me();
            setUser(response.user);
            authLib.setUser(response.user);
          } catch {
            authLib.clear();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.auth.login(username, password);
      authLib.setToken(response.token);
      authLib.setUser(response.user);
      setUser(response.user);
      return { success: true, isAdmin: response.user.isAdmin };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Login failed" };
    }
  };

  const register = async (name: string, username: string, email: string, password: string) => {
    try {
      const response = await api.auth.register(name, username, email, password);
      authLib.setToken(response.token);
      authLib.setUser(response.user);
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Registration failed" };
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
    } finally {
      authLib.clear();
      setUser(null);
      router.push("/");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
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
