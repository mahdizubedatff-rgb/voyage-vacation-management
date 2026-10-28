import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setUnauthorizedListener, tokenStorage } from "../services/api";
import { authService } from "../services";
import type { AuthResponse, User } from "../types";

interface AuthContextValue {
  user: User | null;
  /** True until the stored token has been checked against the API. */
  initializing: boolean;
  isAdmin: boolean;
  login: (input: { email: string; password: string }) => Promise<User>;
  register: (input: { firstName: string; lastName: string; email: string; password: string }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(() => Boolean(tokenStorage.get()));

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedListener(() => {
      setUser(null);
      queryClient.clear();
    });
    return () => setUnauthorizedListener(null);
  }, [queryClient]);

  useEffect(() => {
    if (!tokenStorage.get()) return;
    authService
      .me()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setInitializing(false));
  }, []);

  const accept = useCallback(
    ({ user: nextUser, token }: AuthResponse) => {
      queryClient.clear();
      tokenStorage.set(token);
      setUser(nextUser);
      return nextUser;
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      isAdmin: user?.role === "ADMIN",
      login: async (input) => accept(await authService.login(input)),
      register: async (input) => accept(await authService.register(input)),
      logout,
    }),
    [user, initializing, accept, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
