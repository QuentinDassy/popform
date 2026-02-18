"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { C } from "@/lib/constants";

interface Props {
  mode: "login" | "register";
  onClose: () => void;
  onSwitch: () => void;
  onSuccess: () => void;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = useMemo(() => [
    { label: "8 caractères minimum", ok: password.length >= 8 },
    { label: "Une majuscule", ok: /[A-Z]/.test(password) },
    { label: "Une minuscule", ok: /[a-z]/.test(password) },
    { label: "Un chiffre", ok: /[0-9]/.test(password) },
    { label: "Un caractère spécial (!@#...)", ok: /[^A-Za-z0-9]/.test(password) },
  ], [password]);
  const score = checks.filter(c => c.ok).length;
  const color = score <= 2 ? "#D42B2B" : score <= 3 ? "#E87B35" : score <= 4 ? "#F5B731" : "#2A9D6E";
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? color : "#F0E4CC", transition: "all 0.3s" }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {checks.map(c => (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: c.ok ? "#2A9D6E" : "#A48C6A", transition: "color 0.2s" }}>
            <span style={{ fontSize: 10 }}>{c.ok ? "✓" : "○"}</span> {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthModal({ mode, onClose, onSwitch, onSuccess }: Props) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const pwValid = useMemo(() => {
    if (mode === "login") return true;
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
  }, [password, mode]);

  const handleSubmit = async () => {
    setError(null);
    if (mode === "register" && !name.trim()) { setError("Veuillez entrer votre nom."); return }
    if (mode === "register" && !firstName.trim()) { setError("Veuillez entrer votre prénom."); return }
    if (!email.trim()) { setError("Veuillez entrer votre email."); return }
    if (!password) { setError("Veuillez entrer un mot de passe."); return }
    if (mode === "register" && !pwValid) { setError("Le mot de passe ne respecte pas tous les critères."); return }
    setLoading(true);
    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) setError(error); else onSuccess();
    } else {
      const { error } = await signUp(email, password, (firstName.trim() + " " + name.trim()).trim(), role);
      if (error) setError(error); else setSuccess(true);
    }
    setLoading(false);
  };

  const handleReset = async () => {
    setError(null);
    if (!email.trim()) { setError("Entrez votre email pour recevoir le lien."); return }
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) setError(error); else setResetSent(true);
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: C.bgAlt, color: C.text, fontSize: 14, outline: "none",
    width: "100%", boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(45,27,6,0.4)", backdropFilter: "blur(8px)", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 22, padding: "28px 28px 24px", position: "relative", boxShadow: "0 24px 80px rgba(45,27,6,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: C.textTer, cursor: "pointer", fontSize: 18 }}>✕</button>

        <div style={{ textAlign: "center", marginBottom: 8 }}><span style={{ fontSize: 32 }}>🍿</span></div>

        {/* === MOT DE PASSE OUBLIÉ === */}
        {forgotMode ? (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4, textAlign: "center", fontFamily: "'Space Grotesk', sans-serif" }}>Mot de passe oublié</h2>
            <p style={{ fontSize: 13, color: C.textTer, marginBottom: 20, textAlign: "center" }}>Entrez votre email, on vous envoie un lien de réinitialisation.</p>

            {resetSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>Email envoyé !</p>
                <p style={{ fontSize: 13, color: C.textTer, lineHeight: 1.6 }}>
                  Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien pour réinitialiser votre mot de passe.
                </p>
                <button onClick={() => { setForgotMode(false); setResetSent(false); setError(null) }} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>← Retour à la connexion</button>
              </div>
            ) : (
              <>
                <input placeholder="votre@email.fr" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReset()} style={inputStyle} />
                {error && <p style={{ color: C.pink, fontSize: 13, marginTop: 10, textAlign: "center" }}>{error}</p>}
                <button onClick={handleReset} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer", marginTop: 14, opacity: loading ? 0.5 : 1, boxShadow: "0 8px 24px rgba(212,43,43,0.2)", fontFamily: "inherit" }}>
                  {loading ? "⏳ Envoi..." : "Envoyer le lien"}
                </button>
                <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: C.textTer }}>
                  <span onClick={() => { setForgotMode(false); setError(null) }} style={{ color: C.accent, cursor: "pointer", fontWeight: 600 }}>← Retour</span>
                </p>
              </>
            )}
          </>
        ) : success ? (
          /* === SUCCÈS INSCRIPTION === */
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>Vérifiez vos emails !</p>
            <p style={{ fontSize: 13, color: C.textTer, lineHeight: 1.6 }}>
              Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour activer votre compte.
            </p>
          </div>
        ) : (
          /* === FORMULAIRE LOGIN / REGISTER === */
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4, textAlign: "center", fontFamily: "'Space Grotesk', sans-serif" }}>
              {mode === "login" ? "Bon retour !" : "Rejoignez le show"}
            </h2>
            <p style={{ fontSize: 13, color: C.textTer, marginBottom: 20, textAlign: "center" }}>
              {mode === "login" ? "Connectez-vous pour retrouver vos favoris" : "Créez votre compte popform"}
            </p>

            <form onSubmit={e => { e.preventDefault(); handleSubmit() }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mode === "register" && (
                <>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input placeholder="Prénom *" value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" style={{ ...inputStyle, flex: 1 }} />
                    <input placeholder="Nom *" value={name} onChange={e => setName(e.target.value)} autoComplete="family-name" style={{ ...inputStyle, flex: 1 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.textTer, marginBottom: 6, display: "block" }}>Je suis :</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[{ v: "user", l: "🎧 Ortho" }, { v: "organisme", l: "🏢 Organisme" }, { v: "formateur", l: "🎤 Formateur" }].map(r => (
                        <button key={r.v} type="button" onClick={() => setRole(r.v)} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1.5px solid ${role === r.v ? C.accent + "55" : C.border}`, background: role === r.v ? C.accentBg : C.bgAlt, color: role === r.v ? C.accent : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: role === r.v ? 700 : 400 }}>{r.l}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={inputStyle} />
              <div style={{ position: "relative" }}>
                <input
                  placeholder="Mot de passe"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.textTer, padding: 4 }}
                  tabIndex={-1}
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
              {mode === "register" && <PasswordStrength password={password} />}
            </form>

            {mode === "login" && (
              <div style={{ textAlign: "right", marginTop: 8, marginBottom: 4 }}>
                <span onClick={() => { setForgotMode(true); setError(null) }} style={{ fontSize: 12.5, color: C.accent, cursor: "pointer", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>Mot de passe oublié ?</span>
              </div>
            )}

            {error && <p style={{ color: C.pink, fontSize: 13, marginTop: 10, textAlign: "center" }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || (mode === "register" && !pwValid && password.length > 0)}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer", marginTop: 18, opacity: loading || (mode === "register" && !pwValid && password.length > 0) ? 0.5 : 1, boxShadow: "0 8px 24px rgba(212,43,43,0.2)", fontFamily: "inherit", transition: "opacity 0.2s" }}
            >
              {loading ? "⏳ Un instant..." : mode === "login" ? "Se connecter" : "Créer mon compte 🍿"}
            </button>

            <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.textTer }}>
              {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
              <span onClick={onSwitch} style={{ color: C.accent, cursor: "pointer", fontWeight: 600 }}>
                {mode === "login" ? "S'inscrire" : "Se connecter"}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
