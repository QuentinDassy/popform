"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { C } from "@/lib/constants";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Method 1: Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setChecking(false);
      }
    });

    // Method 2: Check if there's a hash fragment with tokens (Supabase PKCE flow)
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        // Parse hash params
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
            if (!error) {
              setReady(true);
            } else {
              setError("Lien invalide ou expiré.");
            }
            setChecking(false);
          });
          return () => { subscription.unsubscribe() };
        }
      }

      // Method 3: Check URL query params (code flow)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
          if (!error) {
            setReady(true);
          } else {
            setError("Lien invalide ou expiré.");
          }
          setChecking(false);
        });
        return () => { subscription.unsubscribe() };
      }

      // Method 4: Check if already has a session
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setReady(true);
        }
        // Give the auth listener a moment to fire
        setTimeout(() => setChecking(false), 2000);
      });
    }

    return () => { subscription.unsubscribe() };
  }, []);

  const checks = useMemo(() => [
    { label: "8 caractères minimum", ok: password.length >= 8 },
    { label: "Une majuscule", ok: /[A-Z]/.test(password) },
    { label: "Une minuscule", ok: /[a-z]/.test(password) },
    { label: "Un chiffre", ok: /[0-9]/.test(password) },
    { label: "Un caractère spécial", ok: /[^A-Za-z0-9]/.test(password) },
  ], [password]);
  const pwValid = checks.every(c => c.ok);
  const score = checks.filter(c => c.ok).length;
  const color = score <= 2 ? "#D42B2B" : score <= 3 ? "#E87B35" : score <= 4 ? "#F5B731" : "#2A9D6E";

  const handleSubmit = async () => {
    if (!pwValid) { setError("Le mot de passe ne respecte pas tous les critères."); return }
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true);
    setLoading(false);
    setTimeout(() => router.push("/"), 3000);
  };

  const inputStyle: React.CSSProperties = {
    padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: C.bgAlt, color: C.text, fontSize: 14, outline: "none",
    width: "100%", boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 22, padding: "32px 28px", boxShadow: "0 12px 40px rgba(45,27,6,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}><span style={{ fontSize: 32 }}>🔐</span></div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, textAlign: "center", marginBottom: 4, fontFamily: "'Space Grotesk', sans-serif" }}>Nouveau mot de passe</h1>

        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>Mot de passe mis à jour !</p>
            <p style={{ fontSize: 13, color: C.textTer }}>Redirection en cours...</p>
          </div>
        ) : checking ? (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <p style={{ fontSize: 14, color: C.textTer }}>⏳ Vérification du lien...</p>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Lien invalide ou expiré</p>
            <p style={{ fontSize: 13, color: C.textTer, lineHeight: 1.6 }}>
              Ce lien de réinitialisation n&apos;est plus valide. Demandez-en un nouveau depuis la page de connexion.
            </p>
            <button onClick={() => router.push("/")} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Retour à l&apos;accueil</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: C.textTer, marginBottom: 18, textAlign: "center" }}>Choisissez votre nouveau mot de passe.</p>
            <div style={{ position: "relative" }}>
              <input
                placeholder="Nouveau mot de passe"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ ...inputStyle, paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.textTer, padding: 4 }} tabIndex={-1}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>

            {password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                  {[1, 2, 3, 4, 5].map(i => (<div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? color : "#F0E4CC", transition: "all 0.3s" }} />))}
                </div>
                {checks.map(c => (
                  <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: c.ok ? "#2A9D6E" : "#A48C6A" }}>
                    <span style={{ fontSize: 10 }}>{c.ok ? "✓" : "○"}</span> {c.label}
                  </div>
                ))}
              </div>
            )}

            {error && <p style={{ color: C.pink, fontSize: 13, marginTop: 10, textAlign: "center" }}>{error}</p>}

            <button onClick={handleSubmit} disabled={loading || !pwValid} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer", marginTop: 16, opacity: loading || !pwValid ? 0.5 : 1, boxShadow: "0 8px 24px rgba(212,43,43,0.2)", fontFamily: "inherit" }}>
              {loading ? "⏳ Mise à jour..." : "Mettre à jour"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
