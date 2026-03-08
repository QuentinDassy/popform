"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
type Profile = { id: string; full_name: string | null; role: string | null; newsletter_opt: boolean | null; [key: string]: unknown };
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  showAuth: boolean;
  setShowAuth: (v: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: string, newsletterOpt?: boolean) => Promise<{ error: string | null }>;
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

    // Safety net: if INITIAL_SESSION never fires (shouldn't happen), unblock after 8s
    const safetyTimer = setTimeout(() => setLoading(false), 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: { user: User | null } | null) => {
      const u = session?.user ?? null;
      if (_event === "INITIAL_SESSION") {
        // This is the authoritative first-load event from @supabase/ssr
        clearTimeout(safetyTimer);
        currentUserId = u?.id || null;
        setUser(u);
        if (u) {
          // Fetch profile with max 3s wait, then unblock UI
          try {
            const race = await Promise.race([
              supabase.from("profiles").select("*").eq("id", u.id).single(),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
            ]);
            const pd = (race as { data: Profile | null }).data;
            if (pd) setProfile(pd);
          } catch { /* profile unavailable or timed out */ }
        }
        setLoading(false);
        return;
      }

      if (_event === "SIGNED_OUT" || (_event === "TOKEN_REFRESHED" && !session)) {
        setUser(null); setProfile(null); currentUserId = null;
        return;
      }

      // SIGNED_IN, TOKEN_REFRESHED (with session), USER_UPDATED, etc.
      // IMPORTANT: do NOT await anything here — this callback runs while the
      // auth lock is held. Awaiting a Supabase query blocks the lock for up to
      // 15s, which prevents INITIAL_SESSION from ever firing (its lock acquire
      // times out at 10s). Fire profile fetch as a non-blocking side effect.
      if (u?.id === currentUserId) return; // no change
      currentUserId = u?.id || null;
      setUser(u);
      if (u) {
        supabase.from("profiles").select("*").eq("id", u.id).single()
          .then(({ data: pData }: { data: Profile | null }) => { if (pData) setProfile(pData); })
          .catch(() => {});
      } else {
        setProfile(null);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return { error: "Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte mail." };
    }
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, fullName: string, role: string, newsletterOpt?: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName, role, newsletter_opt: newsletterOpt ?? false },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (!error && (role === "formateur" || role === "organisme")) {
      fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "new_user", email, role, full_name: fullName }) }).catch(() => {});
    }
    if (!error && newsletterOpt) {
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from("profiles").update({ newsletter_opt: true }).eq("id", user.id);
      }, 2000);
    }
    return { error: error?.message || null };
  };

  const signOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    setUser(null);
    setProfile(null);
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
