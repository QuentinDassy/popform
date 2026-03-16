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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // If not logged in after auth loads, redirect to homepage with auth modal
    if (!loading && !user) {
      router.replace("/?auth=1");
    }
  }, [loading, user, router]);

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
    // Lier automatiquement l'organisme si l'invitation en portait un
    await fetch("/api/auth/complete-invite", { method: "POST" });
    setDone(true);
    setSaving(false);
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>Chargement…</div>;
  }

  if (done) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 8 }}>Bienvenue sur PopForm !</h1>
          <p style={{ fontSize: 15, color: C.textSec, lineHeight: 1.6, marginBottom: 28 }}>
            Votre compte est activé. Vous pouvez maintenant accéder à toutes les formations.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/compte" style={{ padding: "12px 24px", borderRadius: 10, background: C.gradient, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
              Mon espace
            </Link>
            <Link href="/catalogue" style={{ padding: "12px 24px", borderRadius: 10, background: C.surface, border: "1.5px solid " + C.border, color: C.text, fontWeight: 600, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
              Explorer les formations
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Au moins 8 caractères"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bg, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textTer, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Répétez votre mot de passe"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bg, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
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
