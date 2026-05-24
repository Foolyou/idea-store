"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "./api";
import type { UserMe, AuthRegisterInput, AuthLoginInput } from "./types";

interface AuthContextType {
  user: UserMe | null | undefined;
  login: (input: AuthLoginInput) => Promise<string | null>;
  register: (input: AuthRegisterInput) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  login: async () => null,
  register: async () => null,
  logout: async () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const r = await api<{ user: UserMe | null }>("/api/auth/me");
    setUser(r.ok ? r.data.user : null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ user: UserMe | null }>("/api/auth/me").then((r) => {
      if (!cancelled) setUser(r.ok ? r.data.user : null);
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(
    async (input: AuthLoginInput) => {
      const r = await api<{ user: UserMe }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (r.ok) {
        setUser(r.data.user);
        return null;
      }
      return r.error;
    },
    []
  );

  const register = useCallback(
    async (input: AuthRegisterInput) => {
      const r = await api<{ user: UserMe }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (r.ok) {
        setUser(r.data.user);
        return null;
      }
      return r.error;
    },
    []
  );

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
