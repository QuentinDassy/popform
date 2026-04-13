"use client";
import { useState } from "react";
import { C } from "@/lib/data";

export const PROFESSIONS = [
  { label: "Orthophoniste", value: "Orthophonistes" },
  { label: "Kinésithérapeute", value: "Kinésithérapeutes" },
];

export function getProfessionLabel(profession: string | null): string {
  if (!profession || profession === "__all__") return "Toutes professions";
  return PROFESSIONS.find(p => p.value === profession)?.label ?? profession;
}

/** Lit/écrit la profession dans localStorage */
export function readProfession(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pf_profession");
}
export function saveProfession(value: string) {
  if (typeof window !== "undefined") localStorage.setItem("pf_profession", value);
}

type Props = {
  profession: string | null;
  onSelect: (p: string) => void;
  mob?: boolean;
  /** Si true, affiche le pill même quand profession = null (non défini) */
  alwaysShow?: boolean;
  /** Si true, utilise un style plus visible avec fond dégradé */
  prominent?: boolean;
};

export default function ProfessionSwitcher({ profession, onSelect, mob, alwaysShow, prominent }: Props) {
  const [open, setOpen] = useState(false);

  if (!alwaysShow && profession === null) return null;

  const label = getProfessionLabel(profession);

  const handleSelect = (value: string) => {
    saveProfession(value);
    onSelect(value);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={prominent ? {
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "9px 20px 9px 16px", borderRadius: 99,
          border: "none", background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
          cursor: "pointer", fontSize: mob ? 13 : 14, color: "#fff",
          fontFamily: "inherit", boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
          fontWeight: 700,
        } : {
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px 5px 12px", borderRadius: 99,
          border: "1.5px solid " + C.border, background: C.surface,
          cursor: "pointer", fontSize: mob ? 11 : 12, color: C.textSec,
          fontFamily: "inherit", boxShadow: "0 1px 4px rgba(45,27,6,0.06)",
        }}>
        <span style={{ fontWeight: 700, color: prominent ? "#fff" : C.text }}>{label}</span>
        {!prominent && <span style={{ color: C.accent, fontSize: 11, fontWeight: 600 }}>· Changer</span>}
        {prominent && <span style={{ fontSize: 12, opacity: 0.85 }}>· Changer ›</span>}
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={() => setOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(45,27,6,0.55)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", background: C.surface, borderRadius: 24, padding: mob ? "28px 20px 24px" : "36px 36px 28px", maxWidth: 420, width: "100%", boxShadow: "0 24px 80px rgba(45,27,6,0.18)", textAlign: "center" }}>
            <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>Vous êtes…</h2>
            <p style={{ fontSize: 13, color: C.textTer, marginBottom: 20 }}>Pour afficher les formations qui vous correspondent.</p>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexDirection: mob ? "column" : "row", marginBottom: 16 }}>
              {PROFESSIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    flex: 1, padding: mob ? "14px 16px" : "18px 22px", borderRadius: 14,
                    border: "2px solid " + (profession === opt.value ? C.accent : C.border),
                    background: profession === opt.value ? C.accentBg : C.bg,
                    color: C.text, cursor: "pointer", fontFamily: "inherit",
                    fontSize: mob ? 14 : 15, fontWeight: 700,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleSelect("__all__")}
              style={{ background: "none", border: "none", color: C.textTer, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
              Voir toutes les professions
            </button>
          </div>
        </div>
      )}
    </>
  );
}
