"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { C, getDC, getPhoto, type Formation, CITY_PHOTOS } from "@/lib/data";


export function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={rating >= i ? "#F5B731" : "none"} stroke={rating >= i ? "#F5B731" : "#D8CAAD"} strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export function PriseTag({ label }: { label: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    DPC: { bg: C.greenBg, color: "#1E7A54" },
    "FIF-PL": { bg: C.accentBg, color: C.accentDark },
    OPCO: { bg: C.yellowBg, color: C.yellowDark },
  };
  const c = colors[label] || { bg: C.accentBg, color: C.accent };
  return (<span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: c.bg, color: c.color }}>{label}</span>);
}

export function PopcornLogo({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size}>
      <path d="M8 14 L11 36 L29 36 L32 14 Z" fill="#D42B2B" stroke="#A91E1E" strokeWidth="0.8" />
      <path d="M12.5 14 L14 36 L17.5 36 L16 14 Z" fill="#FFF" opacity="0.85" />
      <path d="M20 14 L20.5 36 L24 36 L23.5 14 Z" fill="#FFF" opacity="0.85" />
      <ellipse cx="20" cy="14" rx="13" ry="3" fill="#E84545" stroke="#A91E1E" strokeWidth="0.6" />
      <circle cx="15" cy="10" r="3.5" fill="#FFF8EC" stroke="#D4C5A0" strokeWidth="0.4" />
      <circle cx="21" cy="8" r="4" fill="#FFF" stroke="#D4C5A0" strokeWidth="0.4" />
      <circle cx="27" cy="10" r="3" fill="#FFF3D6" stroke="#D4C5A0" strokeWidth="0.4" />
      <circle cx="18" cy="6" r="3" fill="#FFFDF7" stroke="#D4C5A0" strokeWidth="0.4" />
      <circle cx="24" cy="6" r="2.8" fill="#FFF8EC" stroke="#D4C5A0" strokeWidth="0.4" />
      <circle cx="20" cy="4" r="2.5" fill="#FFF" stroke="#D4C5A0" strokeWidth="0.4" />
    </svg>
  );
}

export function FormationCard({ f, compact, mob, favori, onToggleFav }: { f: Formation; compact?: boolean; mob?: boolean; favori?: boolean; onToggleFav?: () => void }) {
  const [hov, setHov] = useState(false);
  const dc = getDC(f.domaine);
  const photo = (f as any).photo_url || getPhoto(f.domaine) || null;
  const m = mob ?? false;
  const sessions = f.sessions || [];
  const uniqueLieux = [...new Set(sessions.flatMap((s: any) => {
    const parties = (s as any).session_parties as any[] | null;
    if (parties && parties.length > 0) {
      const fromParties = parties.map((p: any) => p.modalite === "Visio" ? "Visio" : (p.ville || p.lieu || p.adresse || "")).filter(Boolean);
      if (fromParties.length > 0) return fromParties;
    }
    return s.lieu ? [s.lieu] : [];
  }))];
  const isElearning = f.modalite === "E-learning";
  const lieuDisplay = uniqueLieux.length > 1 ? "Plusieurs lieux" : (uniqueLieux[0] || "—");
  const isVisioOnly = uniqueLieux.length > 0 && uniqueLieux.every((l: string) => /visio/i.test(l));
  const domaines: string[] = (f as any).domaines?.length > 0 ? (f as any).domaines : [f.domaine];
  const isPrixFrom = (f.prix_extras || []).some((e: any) => e.label === "__from__");
  const fmts = (f as any).formateurs as any[] | undefined;
  const formateurNom = fmts && fmts.length > 0 ? fmts.map((fm: any) => fm.nom).join(", ") : (f as any).formateur?.nom;
  return (
    <Link href={`/formation/${f.id}`} style={{ textDecoration: "none", color: "inherit", height: "100%", display: "block" }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ cursor: "pointer", transition: "all 0.3s", transform: hov && !m ? "translateY(-3px)" : "none", height: "100%", display: "flex", flexDirection: "column", background: C.surface, borderRadius: m ? 14 : 16, border: "1.5px solid " + C.borderLight, overflow: "hidden" }}>

        {/* ── Photo ── */}
        <div style={{ position: "relative", height: m ? (compact ? 130 : 155) : undefined, aspectRatio: m ? undefined : "4/3", maxHeight: m ? undefined : (compact ? 160 : 210), flexShrink: 0, background: `linear-gradient(135deg, ${dc.bg}, ${dc.color}22)` }}>
          {photo ? (
            <img src={photo} alt="" loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transition: "transform 0.5s", transform: hov && !m ? "scale(1.03)" : "scale(1)" }} />
          ) : null}
          {onToggleFav && (
            <button onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }} style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", zIndex: 2, transition: "transform 0.15s" }} onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.15)")} onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
              {favori ? "❤️" : "🤍"}
            </button>
          )}
          {(f as any).is_webinaire && <span style={{ position: "absolute", top: 8, left: 8, padding: "3px 9px", borderRadius: 8, fontSize: 9, fontWeight: 700, background: "linear-gradient(135deg, #2E7CE6, #7C3AED)", color: "#fff", textTransform: "uppercase" }}>📡 Webinaire</span>}
        </div>

        {/* ── Info ── */}
        <div style={{ padding: m ? "8px 10px 10px" : "10px 12px 12px", flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Domain + modalite */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: m ? 5 : 6 }}>
            {domaines.map((d: string) => {
              const ddc = getDC(d);
              return <span key={d} style={{ padding: "2px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: ddc.bg, color: ddc.color }}>{d}</span>;
            })}
            <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 10, fontWeight: 500, background: C.bgAlt, color: C.textSec }}>{f.modalite}</span>
          </div>
          {/* Title */}
          <h3 style={{ fontSize: m ? 13 : compact ? 13 : 15, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{f.titre}</h3>
          {/* Formateur */}
          {formateurNom && <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 4 }}>{formateurNom}</div>}
          {/* Location */}
          <div style={{ fontSize: 11, color: C.textTer, marginBottom: 4 }}>{isElearning ? "💻" : isVisioOnly ? "💻" : "📍"} {isElearning ? "En ligne" : lieuDisplay}</div>
          {/* Price + rating */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}><StarRow rating={Math.round(f.note)} /><span style={{ fontSize: 10, color: C.textSec }}>{f.note}</span></div>
            {f.prix > 0 && (
              <div style={{ fontSize: m ? 12 : 14, fontWeight: 800, color: C.text }}>
                {isPrixFrom && <span style={{ fontSize: 10, fontWeight: 600, color: C.accent }}>dès </span>}{f.prix}€
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function CityCard({ city, count, mob, image }: { city: string; count: number; mob?: boolean; image?: string }) {
  const [hov, setHov] = useState(false);
  const computePhoto = (img?: string) => img || CITY_PHOTOS[city] || "";
  const [photo, setPhoto] = useState(() => computePhoto(image));
  useEffect(() => { setPhoto(computePhoto(image)); }, [image, city, computePhoto]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = mob ?? false;
  return (
    <Link href={`/catalogue?ville=${encodeURIComponent(city)}`} style={{ textDecoration: "none", display: "block" }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ position: "relative", borderRadius: m ? 12 : 16, overflow: "hidden", cursor: "pointer", width: "100%", height: m ? 100 : 140, transition: "all 0.3s", transform: hov ? "translateY(-4px)" : "none", boxShadow: hov ? "0 12px 32px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.06)", background: C.gradientSoft }}>
        {photo && <img src={photo} onError={() => setPhoto("")} alt={city} loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s", transform: hov ? "scale(1.06)" : "scale(1)" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(45,27,6,0.8) 0%, rgba(45,27,6,0.1) 60%)" }} />
        <div style={{ position: "absolute", bottom: 10, left: 10 }}>
          <div style={{ fontSize: m ? 14 : 18, fontWeight: 800, color: "#fff" }}>{city}</div>
          <div style={{ fontSize: m ? 10 : 12, color: "rgba(255,255,255,0.7)" }}>{count} formation{count > 1 ? "s" : ""} ›</div>
        </div>
      </div>
    </Link>
  );
}
