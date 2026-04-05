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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    Promise.all([getUser(), checkIsAdmin()]).then(([u, admin]) => {
      setUser(u);
      setIsAdmin(u ? admin : false);
      setLoading(false);
    });

    const subscription = onAuthStateChange(async (u) => {
      setUser(u);
      if (u) {
        const admin = await checkIsAdmin();
        setIsAdmin(admin);
      } else {
        setIsAdmin(false);
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
