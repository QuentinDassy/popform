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

    // Read session from localStorage SYNCHRONOUSLY — zero network, zero delay.
    // Works even with expired tokens; onAuthStateChange refreshes in background.
    try {
      const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").split("//")[1]?.split(".")[0];
      const stored = projectRef ? localStorage.getItem(`sb-${projectRef}-auth-token`) : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        const u: User | null = parsed?.user ?? null;
        if (u?.id) {
          currentUserId = u.id;
          setUser(u);
          // Fetch profile, then unblock UI (max 3s wait so dashboards never hang)
          const profileFetch = supabase.from("profiles").select("*").eq("id", u.id).single()
            .then(({ data: pData }: { data: Profile | null }) => { if (pData) setProfile(pData); })
            .catch(() => {});
          const maxWait = new Promise<void>(resolve => setTimeout(resolve, 3000));
          Promise.race([profileFetch, maxWait]).finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch { /* localStorage unavailable (SSR/private browsing) */ setLoading(false); }

    // onAuthStateChange handles token refresh + sign in/out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: { user: User | null } | null) => {
      const u = session?.user ?? null;
      if (_event === "INITIAL_SESSION") return; // already handled above
      if (_event === "TOKEN_REFRESHED" && !session) { setUser(null); setProfile(null); currentUserId = null; return; }
      if (_event === "SIGNED_OUT") { setUser(null); setProfile(null); currentUserId = null; return; }
      if (u?.id === currentUserId) return;
      currentUserId = u?.id || null;
      setUser(u);
      if (u) {
        try {
          const { data: pData }: { data: Profile | null } = await supabase.from("profiles").select("*").eq("id", u.id).single();
          setProfile(pData);
        } catch { /* ignore */ }
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
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
    // Notify admin of new signup (formateur or organisme only)
    if (!error && (role === "formateur" || role === "organisme")) {
      fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "new_user", email, role, full_name: fullName }) }).catch(() => {});
    }
    // If signup succeeded and newsletter_opt is true, update profile after slight delay
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
