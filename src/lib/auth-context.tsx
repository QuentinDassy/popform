"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/constants";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  showAuth: boolean;
  setShowAuth: (v: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let currentUserId: string | null = null;

    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      const user = data.user;
      currentUserId = user?.id || null;
      setUser(user);
      if (user) {
        supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data: pData }: { data: Profile | null }) => setProfile(pData));
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: { user: User | null } | null) => {
      // Handle token refresh errors — clear session silently
      if (_event === "TOKEN_REFRESHED" && !session) {
        setUser(null); setProfile(null); currentUserId = null; return;
      }
      const u = session?.user ?? null;
      if (u?.id === currentUserId) return;
      currentUserId = u?.id || null;
      setUser(u);
      if (u) {
        const { data: pData }: { data: Profile | null } = await supabase.from("profiles").select("*").eq("id", u.id).single();
        setProfile(pData);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role } },
    });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      // ignore errors
    }
    setUser(null);
    setProfile(null);
    // Clear cookies manually as fallback
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    window.location.href = "/";
  };

  const resetPassword = async (email: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    return { error: error?.message || null };
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, showAuth, setShowAuth, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null, profile: null, loading: false,
      showAuth: false, setShowAuth: () => {},
      signIn: async () => ({ error: "Not initialized" }),
      signUp: async () => ({ error: "Not initialized" }),
      signOut: async () => {},
      resetPassword: async () => ({ error: "Not initialized" }),
    };
  }
  return ctx;
};
