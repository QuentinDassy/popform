"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { C } from "@/lib/constants";

interface Props {
  mode: "login" | "register";
  onClose: () => void;
  onSwitch: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ mode, onClose, onSwitch, onSuccess }: Props) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) setError(error);
      else onSuccess();
    } else {
      const { error } = await signUp(email, password, name, role);
      if (error) {
        setError(error);
      } else {
        setSuccess(true);
      }
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    background: C.bgAlt,
    color: C.text,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(45,27,6,0.4)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 22,
          padding: 36,
          position: "relative",
          boxShadow: "0 24px 80px rgba(45,27,6,0.2)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            color: C.textTer,
            cursor: "pointer",
            fontSize: 18,
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>🍿</span>
        </div>

        <h2
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: C.text,
            marginBottom: 4,
            textAlign: "center",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {mode === "login" ? "Bon retour !" : "Rejoignez le show"}
        </h2>
        <p
          style={{
            fontSize: 13.5,
            color: C.textTer,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          {mode === "login"
            ? "Connectez-vous pour retrouver vos favoris"
            : "Créez votre compte popform"}
        </p>

        {success ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: C.text,
                marginBottom: 8,
              }}
            >
              Vérifiez vos emails !
            </p>
            <p style={{ fontSize: 13, color: C.textTer, lineHeight: 1.6 }}>
              Un lien de confirmation a été envoyé à{" "}
              <strong>{email}</strong>. Cliquez dessus pour activer
              votre compte.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {mode === "register" && (
                <>
                  <input
                    placeholder="Votre nom"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                  />
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        color: C.textTer,
                        marginBottom: 6,
                        display: "block",
                      }}
                    >
                      Je suis :
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        { v: "user", l: "🎧 Ortho" },
                        { v: "organisme", l: "🏢 Organisme" },
                        { v: "formateur", l: "🎤 Formateur" },
                      ].map((r) => (
                        <button
                          key={r.v}
                          onClick={() => setRole(r.v)}
                          style={{
                            flex: 1,
                            padding: 10,
                            borderRadius: 10,
                            border: `1.5px solid ${
                              role === r.v ? C.accent + "55" : C.border
                            }`,
                            background:
                              role === r.v ? C.accentBg : C.bgAlt,
                            color:
                              role === r.v ? C.accent : C.textSec,
                            fontSize: 12,
                            cursor: "pointer",
                            fontWeight: role === r.v ? 700 : 400,
                          }}
                        >
                          {r.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                style={inputStyle}
              />
            </div>

            {error && (
              <p
                style={{
                  color: C.pink,
                  fontSize: 13,
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "none",
                background: C.gradient,
                color: "#fff",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer",
                marginTop: 18,
                opacity: loading ? 0.6 : 1,
                boxShadow: "0 8px 24px rgba(212,43,43,0.2)",
                fontFamily: "inherit",
              }}
            >
              {loading
                ? "⏳ Un instant..."
                : mode === "login"
                ? "Se connecter"
                : "Créer mon compte 🍿"}
            </button>

            <p
              style={{
                textAlign: "center",
                marginTop: 16,
                fontSize: 13,
                color: C.textTer,
              }}
            >
              {mode === "login"
                ? "Pas encore de compte ? "
                : "Déjà un compte ? "}
              <span
                onClick={onSwitch}
                style={{
                  color: C.accent,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {mode === "login" ? "S'inscrire" : "Se connecter"}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
