import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../services/api";
import { authService } from "../services/authService";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setActiveBranch: (branchId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persistUser(next: User | null) {
  if (next) localStorage.setItem("user", JSON.stringify(next));
  else localStorage.removeItem("user");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await authService.getCurrentUser();
      setUser(res.user);
      persistUser(res.user);
    } catch {
      setUser(null);
      persistUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setUser(res.user);
    persistUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    persistUser(null);
    setUser(null);
    try {
      await authService.logout();
    } catch {
      /* still proceed with local logout */
    }
    window.location.replace("/login");
  }, []);

  const setActiveBranch = useCallback(async (branchId: string) => {
    const res = await authService.setActiveBranch(branchId);
    setUser(res.user);
    persistUser(res.user);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh, setActiveBranch }),
    [user, loading, login, logout, refresh, setActiveBranch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
