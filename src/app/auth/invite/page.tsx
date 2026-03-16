"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { C } from "@/lib/data";
import { supabase } from "@/lib/supabase-data";

export default function InvitePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Parse hash fragment and establish session manually
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(() => {
        setSessionReady(true);
        // Clean the hash from the URL without triggering a reload
        window.history.replaceState(null, "", window.location.pathname);
      });
    } else {
      setSessionReady(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user && sessionReady) {
      router.replace("/?auth=1");
    }
  }, [loading, user, router, sessionReady]);

  const handleSetPassword = async () => {
    if (!password.trim()) { setMsg("Veuillez saisir un mot de passe."); return; }
    if (password.length < 8) { setMsg("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (password !== confirm) { setMsg("Les mots de passe ne correspondent pas."); return; }
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg("Erreur : " + error.message);
      setSaving(false);
      return;
    }
    await fetch("/api/auth/complete-invite", { method: "POST" });
    setDone(true);
    setSaving(false);
  };

  if (loading && !sessionReady) {
    return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>Chargement…</div>;
  }

  if (done) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 8 }}>Bienvenue sur PopForm !</h1>
          <p style={{ fontSize: 15, color: C.textSec, lineHeight: 1.6, marginBottom: 28 }}>
            Votre compte est activé. Vous pouvez maintenant accéder à votre dashboard.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/dashboard/organisme" style={{ padding: "12px 24px", borderRadius: 10, background: C.gradient, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
              Mon dashboard
            </Link>
            <Link href="/catalogue" style={{ padding: "12px 24px", borderRadius: 10, background: C.surface, border: "1.5px solid " + C.border, color: C.text, fontWeight: 600, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
              Explorer les formations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = { flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 14, fontFamily: "inherit", minWidth: 0 };
  const wrapStyle: React.CSSProperties = { display: "flex", alignItems: "center", padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bg, boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✉️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8 }}>Activez votre compte</h1>
          <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.6 }}>
            Vous avez été invité·e sur PopForm. Choisissez un mot de passe pour finaliser votre inscription.
          </p>
        </div>

        <div style={{ background: C.surface, borderRadius: 16, border: "1.5px solid " + C.border, padding: "28px 24px" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textTer, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Mot de passe
            </label>
            <div style={wrapStyle}>
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
                style={inputStyle}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textTer, fontSize: 16, padding: "0 0 0 8px", lineHeight: 1 }}>
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textTer, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Confirmer le mot de passe
            </label>
            <div style={wrapStyle}>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Répétez votre mot de passe"
                style={inputStyle}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textTer, fontSize: 16, padding: "0 0 0 8px", lineHeight: 1 }}>
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {msg && <p style={{ color: C.pink, fontSize: 13, marginBottom: 12 }}>{msg}</p>}

          <button
            onClick={handleSetPassword}
            disabled={saving}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Activation…" : "Activer mon compte"}
          </button>
        </div>
      </div>
    </div>
  );
}
