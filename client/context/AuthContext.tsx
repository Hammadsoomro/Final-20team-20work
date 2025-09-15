import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  User,
  getCurrentUser,
  setCurrentUser,
  logout as authLogout,
} from "@/lib/auth";

interface AuthCtx {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser: (u: User | null) => {
        setCurrentUser(u);
        setUser(u);
      },
      logout: () => {
        authLogout();
        setUser(null);
      },
    }),
    [user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
