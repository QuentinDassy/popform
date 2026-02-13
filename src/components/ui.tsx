"use client";
import React, { useState } from "react";
import Link from "next/link";
import { C, getDC, getPhoto, Formation, CITY_PHOTOS } from "@/lib/data";

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

export function FormationCard({ f, compact }: { f: Formation; compact?: boolean }) {
  const [hov, setHov] = useState(false);
  const dc = getDC(f.domaine);
  const photo = getPhoto(f.domaine);
  return (
    <Link href={`/formation/${f.id}`} style={{ textDecoration: "none", color: "inherit", height: "100%", display: "block" }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ background: C.surface, border: "1px solid " + C.borderLight, borderRadius: 18, overflow: "hidden", cursor: "pointer", transition: "all 0.35s", transform: hov ? "translateY(-6px)" : "none", boxShadow: hov ? "0 20px 50px rgba(212,43,43,0.1)" : "0 2px 12px rgba(212,43,43,0.03)", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative", height: compact ? 130 : 160, overflow: "hidden" }}>
          <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s", transform: hov ? "scale(1.06)" : "scale(1)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(45,27,6,0.7) 0%, transparent 55%)" }} />
          {f.isNew && <span style={{ position: "absolute", top: 8, left: 8, padding: "3px 9px", borderRadius: 8, fontSize: 9, fontWeight: 700, background: C.gradient, color: "#fff", textTransform: "uppercase" }}>À l&apos;affiche 🍿</span>}
          <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
            <span style={{ padding: "3px 8px", borderRadius: 7, fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,0.92)", color: dc.color }}>{f.domaine}</span>
            <span style={{ padding: "3px 8px", borderRadius: 7, fontSize: 10, background: "rgba(255,255,255,0.75)", color: "#2D1B06" }}>{f.modalite}</span>
          </div>
        </div>
        <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: compact ? 13.5 : 15, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{f.titre}</h3>
          {f.motsCles && (
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
              {f.motsCles.slice(0, 3).map(m => <span key={m} style={{ padding: "2px 6px", borderRadius: 5, fontSize: 9, background: C.yellowBg, color: C.yellowDark }}>{m}</span>)}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10.5, color: C.textSec, borderTop: "1px solid " + C.borderLight, paddingTop: 8, marginTop: "auto" }}>
            <span>⏱ {f.duree}</span><span>📍 {f.sessions[0]?.lieu}</span>{f.effectif && <span>👥 {f.effectif}</span>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><StarRow rating={Math.round(f.note)} /><span style={{ fontSize: 10.5, color: C.textSec }}>{f.note}</span></div>
            <div><span style={{ fontSize: 19, fontWeight: 800, color: C.text }}>{f.prix}</span><span style={{ fontSize: 10, color: C.textTer }}>€</span></div>
          </div>
          {f.priseEnCharge.length > 0 && (
            <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>{f.priseEnCharge.map(p => <PriseTag key={p} label={p} />)}</div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CityCard({ city, count, onClick }: { city: string; count: number; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  const photo = CITY_PHOTOS[city] || CITY_PHOTOS["Paris"];
  const inner = (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ position: "relative", borderRadius: 16, overflow: "hidden", cursor: "pointer", minWidth: 200, height: 130, transition: "all 0.3s", transform: hov ? "translateY(-4px)" : "none", boxShadow: hov ? "0 12px 32px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.06)" }}>
      <img src={photo} alt={city} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s", transform: hov ? "scale(1.06)" : "scale(1)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(45,27,6,0.8) 0%, rgba(45,27,6,0.1) 60%)" }} />
      <div style={{ position: "absolute", bottom: 10, left: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{city}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{count} formation{count > 1 ? "s" : ""}</div>
      </div>
    </div>
  );
  if (onClick) return <div onClick={onClick}>{inner}</div>;
  return (<Link href={`/catalogue?ville=${encodeURIComponent(city)}`} style={{ textDecoration: "none" }}>{inner}</Link>);
}
