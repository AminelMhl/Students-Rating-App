"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Role = "admin" | "viewer";

type User = {
  name: string;
  role: Role;
};

type AuthContextValue = {
  user: User | null;
  login: (name: string, password: string) => User;
  logout: () => void;
};

const STORAGE_KEY = "rating_app_user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as User;
      if (parsed?.name && parsed?.role) {
        setUser(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const login = (name: string, password: string): User => {
      const trimmedName = name.trim();
      const trimmedPassword = password.trim();

      let role: Role = "viewer";
      if (trimmedName.toLowerCase() === "admin" && trimmedPassword.length > 0) {
        role = "admin";
      }

      const nextUser: User = {
        name: trimmedName || "Guest",
        role,
      };

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      }

      setUser(nextUser);
      return nextUser;
    };

    const logout = () => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      setUser(null);
    };

    return { user, login, logout };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
