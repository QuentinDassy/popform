"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C } from "@/lib/data";
import { supabase } from "@/lib/supabase-data";
import { useIsMobile } from "@/lib/hooks";

type CongresSpeaker = { nom: string; titre_intervention: string };
type Congres = {
  id: number; titre: string; description: string; date: string;
  adresse: string; lien_url: string | null; lien_visio: string | null;
  photo_url: string | null; status: string; organisme_id: number | null;
  organisme?: { nom: string; logo: string }; speakers?: CongresSpeaker[];
};

function CountdownSmall({ target }: { target: string }) {
  const [parts, setParts] = useState({ j: 0, h: 0, m: 0 });
  useEffect(() => {
    const update = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setParts({ j: 0, h: 0, m: 0 }); return; }
      setParts({ j: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000) });
    };
    update(); const t = setInterval(update, 60000); return () => clearInterval(t);
  }, [target]);
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {[{ v: parts.j, l: "j" }, { v: parts.h, l: "h" }, { v: parts.m, l: "m" }].map(({ v, l }) => (
        <div key={l} style={{ textAlign: "center", background: "rgba(255,255,255,0.15)", borderRadius: 7, padding: "3px 7px", minWidth: 32 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{String(v).padStart(2, "0")}</div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

export default function CongresPage() {
  const mob = useIsMobile();
  const [congres, setCongres] = useState<Congres[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("congres").select("*, organisme:organismes(nom,logo), speakers:congres_speakers(nom,titre_intervention)")
      .eq("status", "publie").order("date", { ascending: true })
      .then(({ data }: { data: Congres[] | null }) => { setCongres(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = congres.filter(c => new Date(c.date) >= now);
  const past = congres.filter(c => new Date(c.date) < now);

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: mob ? "0 16px 60px" : "0 40px 60px" }}>
      <div style={{ padding: "18px 0 20px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 24 : 32, fontWeight: 800, color: C.text, marginTop: 6 }}>🎤 Congrès</h1>
        <p style={{ fontSize: 14, color: C.textTer }}>Événements professionnels en orthophonie</p>
      </div>

      {upcoming.length === 0 && past.length === 0 && (
        <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎤</div>
          <p style={{ fontSize: 16 }}>Aucun congrès programmé pour le moment.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <><h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 20 }}>À venir</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: mob ? 14 : 20, marginBottom: 40 }}>
          {upcoming.map(c => <CongresCard key={c.id} c={c} mob={mob} />)}
        </div></>
      )}

      {past.length > 0 && (
        <><h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 16, opacity: 0.6 }}>Passés</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: mob ? 10 : 14, opacity: 0.7 }}>
          {past.map(c => <CongresCard key={c.id} c={c} mob={mob} past />)}
        </div></>
      )}
    </div>
  );
}

function CongresCard({ c, mob, past = false }: { c: Congres; mob: boolean; past?: boolean }) {
  const dateObj = new Date(c.date);
  const dateStr = dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const hasPhoto = !!c.photo_url;
  const DESC_LIMIT = 160;
  const descShort = (c.description || "").length > DESC_LIMIT;

  if (mob) {
    return (
      <Link href={`/congres/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{ background: C.surface, borderRadius: 16, border: "1px solid " + C.borderLight, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.15s", boxShadow: "0 2px 8px rgba(45,27,6,0.05)" }}>
          {hasPhoto && <img src={c.photo_url!} alt={c.titre} style={{ width: "100%", height: 150, objectFit: "cover" }} />}
          {!hasPhoto && <div style={{ width: "100%", height: 90, background: "linear-gradient(135deg,#1a0a0a,#6b2020)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🎤</div>}
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.textTer, marginBottom: 3 }}>📅 {dateStr}</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 6 }}>{c.titre}</h3>
            {c.organisme && <div style={{ fontSize: 11, color: C.textTer, marginBottom: 6 }}>🏢 {c.organisme.nom}</div>}
            {c.description && (
              <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5, margin: "0 0 8px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, wordBreak: "break-word", overflowWrap: "break-word" }}>
                {c.description}
              </p>
            )}
            {descShort && <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>Voir plus →</span>}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 8px", borderRadius: 6, background: C.accentBg, color: C.accent, fontSize: 10, fontWeight: 700 }}>🎤 CONGRÈS</span>
              {c.lien_visio && <span style={{ padding: "3px 8px", borderRadius: 6, background: "#7C3AED11", color: "#7C3AED", fontSize: 10, fontWeight: 700 }}>💻 Visio</span>}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Desktop — grande card horizontale cliquable
  return (
    <Link href={`/congres/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ background: C.surface, borderRadius: 20, border: "1px solid " + C.borderLight, overflow: "hidden", display: "flex", minHeight: 260, boxShadow: "0 4px 20px rgba(45,27,6,0.06)", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.15s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(45,27,6,0.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(45,27,6,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
      >
        {/* Photo side */}
        <div style={{ width: 300, flexShrink: 0, position: "relative", overflow: "hidden" }}>
          {hasPhoto
            ? <img src={c.photo_url!} alt={c.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a0a0a,#3d1515,#6b2020)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60 }}>🎤</div>
          }
          {!past && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 16px", background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 5, fontWeight: 700, letterSpacing: "0.06em" }}>Commence dans</div>
              <CountdownSmall target={c.date} />
            </div>
          )}
          {past && <div style={{ position: "absolute", top: 10, left: 10, padding: "3px 9px", borderRadius: 7, background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700 }}>PASSÉ</div>}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "24px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0, overflow: "hidden" }}>
          <div style={{ minWidth: 0 }}>
            {/* Badges */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 10px", borderRadius: 8, background: C.accentBg, color: C.accent, fontSize: 11, fontWeight: 700 }}>🎤 CONGRÈS</span>
              {c.lien_visio && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#7C3AED11", color: "#7C3AED", fontSize: 11, fontWeight: 700 }}>💻 Visio</span>}
              {c.organisme && <span style={{ fontSize: 12, color: C.textTer }}>🏢 {c.organisme.nom}</span>}
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6, lineHeight: 1.2 }}>{c.titre}</h3>
            <div style={{ fontSize: 13, color: C.textTer, marginBottom: 10 }}>
              📅 {dateStr} à {timeStr}{c.adresse && <> &nbsp;·&nbsp; 📍 {c.adresse}</>}
            </div>

            {c.description && (
              <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.6, margin: "0 0 8px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, wordBreak: "break-word", overflowWrap: "break-word" }}>
                {c.description}
              </p>
            )}
            {descShort && <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>Lire la suite →</span>}
          </div>

          {/* Bottom row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 10 }}>
            {(c.speakers || []).length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(c.speakers || []).slice(0, 3).map((s: CongresSpeaker, i: number) => (
                  <span key={i} style={{ padding: "4px 10px", borderRadius: 8, background: C.bgAlt, border: "1px solid " + C.borderLight, fontSize: 12, color: C.textSec, fontWeight: 600 }}>{s.nom}</span>
                ))}
                {(c.speakers || []).length > 3 && <span style={{ padding: "4px 10px", borderRadius: 8, background: C.bgAlt, fontSize: 12, color: C.textTer }}>+{(c.speakers || []).length - 3}</span>}
              </div>
            )}
            <span style={{ fontSize: 13, color: C.accent, fontWeight: 700, marginLeft: "auto" }}>Voir le détail →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
