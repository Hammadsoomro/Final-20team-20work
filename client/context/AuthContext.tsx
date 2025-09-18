import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { User, logout as authLogout } from "@/lib/auth";

interface AuthCtx {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);

  async function postAttendance() {
    try {
      await fetch("/api/attendance", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      // ignore attendance errors
    }
  }

  useEffect(() => {
    (async () => {
      try {
        // try up to 2 times before giving up (handles transient session delete)
        let attempts = 0;
        let ok = false;
        while (attempts < 2 && !ok) {
          attempts++;
          try {
            const res = await fetch("/api/auth/me", { credentials: "include" });
            if (!res.ok) {
              // if unauthorized, don't retry
              if (res.status === 401) break;
              await new Promise((r) => setTimeout(r, 500));
              continue;
            }
            const data = await res.json();
            setUserState(data as User);
            // mark attendance when we detect an authenticated user
            postAttendance();
            ok = true;
          } catch (e) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }
        if (!ok) setUserState(null);
      } catch {
        setUserState(null);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser: (u: User | null) => {
        setUserState(u);
        if (u) postAttendance();
      },
      logout: () => {
        authLogout();
        setUserState(null);
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
