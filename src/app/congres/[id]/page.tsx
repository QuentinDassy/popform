"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { C } from "@/lib/data";
import { supabase } from "@/lib/supabase-data";
import { useIsMobile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";

type CongresSpeaker = { nom: string; titre_intervention: string };
type Congres = {
  id: number; titre: string; description: string; date: string;
  adresse: string; lien_url: string | null; lien_visio: string | null;
  photo_url: string | null; status: string; organisme_id: number | null;
  organisme?: { nom: string; logo: string }; speakers?: CongresSpeaker[];
};

function Countdown({ target }: { target: string }) {
  const [parts, setParts] = useState({ j: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const update = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setParts({ j: 0, h: 0, m: 0, s: 0 }); return; }
      setParts({ j: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    update(); const t = setInterval(update, 1000); return () => clearInterval(t);
  }, [target]);
  const isPast = new Date(target) < new Date();
  if (isPast) return null;
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {[{ v: parts.j, l: "jours" }, { v: parts.h, l: "heures" }, { v: parts.m, l: "min" }, { v: parts.s, l: "sec" }].map(({ v, l }) => (
        <div key={l} style={{ textAlign: "center", background: "rgba(0,0,0,0.4)", borderRadius: 12, padding: "10px 14px", minWidth: 60 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{String(v).padStart(2, "0")}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginTop: 2 }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

export default function CongresDetailPage() {
  const { id } = useParams<{ id: string }>();
  const mob = useIsMobile();
  const { user } = useAuth();
  const [c, setC] = useState<Congres | null>(null);
  const [loading, setLoading] = useState(true);
  const [inscribed, setInscribed] = useState(false);
  const [inscMsg, setInscMsg] = useState("");

  useEffect(() => {
    supabase.from("congres").select("*, organisme:organismes(nom,logo), speakers:congres_speakers(nom,titre_intervention)").eq("id", Number(id)).single().then(({ data }: { data: Congres | null }) => {
      setC(data); setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    supabase.from("congres_inscriptions").select("id").eq("user_id", user.id).eq("congres_id", Number(id)).then(({ data }: { data: unknown[] | null }) => {
      if (data && data.length > 0) setInscribed(true);
    }).catch(() => {});
  }, [user, id]);

  const handleInscrire = async () => {
    if (!user) { setInscMsg("Connectez-vous pour vous inscrire."); return; }
    try {
      if (!inscribed) {
        const { error } = await supabase.from("congres_inscriptions").insert({ user_id: user.id, congres_id: Number(id) });
        if (error && error.code !== "23505") {
          setInscMsg("Erreur : " + error.message);
          return;
        }
        setInscribed(true);
      }
      setInscMsg("✅ Ajouté à votre calendrier PopForm !");
    } catch (e: any) {
      setInscMsg("Erreur : " + e.message);
    }
    setTimeout(() => setInscMsg(""), 3000);
  };

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  if (!c) return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
      <p style={{ color: C.textTer }}>Congrès introuvable.</p>
      <Link href="/congres" style={{ color: C.accent }}>← Retour aux congrès</Link>
    </div>
  );

  const dateObj = new Date(c.date);
  const dateStr = dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const isPast = dateObj < new Date();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>
      {/* Hero photo */}
      <div style={{ position: "relative", height: mob ? 220 : 380, overflow: "hidden", borderRadius: mob ? 0 : "0 0 24px 24px", marginBottom: mob ? 0 : -24 }}>
        {c.photo_url
          ? <img src={c.photo_url} alt={c.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a0a0a,#3d1515,#6b2020)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: mob ? 60 : 90 }}>🎤</span></div>
        }
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }} />
        <div style={{ position: "absolute", top: 16, left: 16 }}>
          <Link href="/congres" style={{ padding: "6px 14px", borderRadius: 20, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>← Congrès</Link>
        </div>
        {!isPast && (
          <div style={{ position: "absolute", bottom: mob ? 16 : 32, left: 0, right: 0 }}>
            <Countdown target={c.date} />
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: mob ? "20px 16px" : "40px 40px 0", position: "relative", zIndex: 1 }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ padding: "4px 12px", borderRadius: 20, background: C.accentBg, color: C.accent, fontSize: 12, fontWeight: 700 }}>🎤 CONGRÈS</span>
          {isPast && <span style={{ padding: "4px 12px", borderRadius: 20, background: C.bgAlt, color: C.textTer, fontSize: 12, fontWeight: 700 }}>Événement passé</span>}
          {c.lien_visio && <span style={{ padding: "4px 12px", borderRadius: 20, background: "#7C3AED11", color: "#7C3AED", fontSize: 12, fontWeight: 700 }}>💻 Visio disponible</span>}
          {c.organisme && <span style={{ padding: "4px 12px", borderRadius: 20, background: C.bgAlt, color: C.textSec, fontSize: 12 }}>🏢 {c.organisme.nom}</span>}
        </div>

        {/* Titre */}
        <h1 style={{ fontSize: mob ? 22 : 34, fontWeight: 800, color: C.text, marginBottom: 10, lineHeight: 1.2 }}>{c.titre}</h1>

        {/* Infos */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: mob ? 8 : 16, marginBottom: 24 }}>
          <div style={{ padding: "8px 14px", borderRadius: 10, background: C.surface, border: "1px solid " + C.borderLight, fontSize: 13, color: C.textSec }}>
            📅 {dateStr} à {timeStr}
          </div>
          {c.adresse && (
            <div style={{ padding: "8px 14px", borderRadius: 10, background: C.surface, border: "1px solid " + C.borderLight, fontSize: 13, color: C.textSec }}>
              📍 {c.adresse}
            </div>
          )}
        </div>

        {/* CTA buttons */}
        {!isPast && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: inscMsg ? 10 : 28 }}>
            <button onClick={handleInscrire} style={{ padding: "12px 24px", borderRadius: 12, background: inscribed ? C.greenBg : C.gradient, color: inscribed ? C.green : "#fff", fontSize: 14, fontWeight: 700, border: inscribed ? "1.5px solid " + C.green + "44" : "none", cursor: "pointer", boxShadow: inscribed ? "none" : "0 4px 16px rgba(212,43,43,0.2)" }}>
              {inscribed ? "✅ Dans mon calendrier PopForm" : "📅 Ajouter à mon calendrier"}
            </button>
            {c.lien_url && <a href={c.lien_url} target="_blank" rel="noreferrer" style={{ padding: "12px 22px", borderRadius: 12, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Programme officiel →</a>}
            {c.lien_visio && <a href={c.lien_visio} target="_blank" rel="noreferrer" style={{ padding: "12px 20px", borderRadius: 12, border: "1.5px solid #7C3AED44", background: "#7C3AED11", color: "#7C3AED", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>💻 Rejoindre en visio</a>}
          </div>
        )}
        {inscMsg && <p style={{ fontSize: 13, color: inscMsg.startsWith("✅") ? C.green : C.pink, marginBottom: 20 }}>{inscMsg}</p>}

        {/* Description complète */}
        {c.description && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 10 }}>À propos</h2>
            <div style={{ padding: mob ? 16 : 24, background: C.surface, borderRadius: 16, border: "1px solid " + C.borderLight, overflowWrap: "break-word", wordBreak: "break-word" }}>
              <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.75, margin: 0, overflowWrap: "break-word", wordBreak: "break-word" }}>{c.description}</p>
            </div>
          </div>
        )}

        {/* Intervenants */}
        {(c.speakers || []).length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 }}>Intervenants</h2>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {(c.speakers || []).map((s, i) => (
                <div key={i} style={{ padding: "14px 16px", background: C.surface, borderRadius: 12, border: "1px solid " + C.borderLight, display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 800, flexShrink: 0 }}>
                    {s.nom.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.nom}</div>
                    {s.titre_intervention && <div style={{ fontSize: 12, color: C.textTer, marginTop: 2 }}>{s.titre_intervention}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
