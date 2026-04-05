"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getUser, onAuthStateChange } from "@/lib/auth";
import { checkIsAdmin } from "@/lib/admin";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false });

export function useAuth() {
  return useContext(AuthContext);
}

function getCachedAdmin(): boolean {
  try { return localStorage.getItem("pinpic_admin") === "1"; } catch { return false; }
}
function setCachedAdmin(v: boolean) {
  try { localStorage.setItem("pinpic_admin", v ? "1" : "0"); } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Restore cached admin status after mount (avoids hydration mismatch)
  useEffect(() => {
    if (getCachedAdmin()) setIsAdmin(true);
  }, []);

  useEffect(() => {
    Promise.all([getUser(), checkIsAdmin().catch(() => false)]).then(([u, admin]) => {
      setUser(u);
      const adminStatus = u ? admin : false;
      setIsAdmin(adminStatus);
      setCachedAdmin(adminStatus);
      setLoading(false);
    });

    const subscription = onAuthStateChange(async (u) => {
      setUser(u);
      if (u) {
        try {
          const admin = await checkIsAdmin();
          setIsAdmin(admin);
          setCachedAdmin(admin);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setCachedAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
