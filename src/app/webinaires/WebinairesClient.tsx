"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C } from "@/lib/data";
import { useIsMobile } from "@/lib/hooks";

export type Webinaire = {
  id: number;
  titre: string;
  description: string;
  date_heure: string;
  duree?: number | null;
  prix: number;
  lien_url: string;
  status: string;
  organisme_id: number;
  formateur_id?: number | null;
  organisme?: { nom: string } | null;
  formateur?: { nom: string } | null;
};

export default function WebinairesClient({ webinaires }: { webinaires: Webinaire[] }) {
  const mob = useIsMobile();
  const [showPast, setShowPast] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  // now est initialisé côté client uniquement pour éviter les bugs d'hydratation SSR
  useEffect(() => { setNow(new Date()); }, []);

  const clientNow = now ?? new Date(0); // avant hydratation : tout est "à venir"
  const isWebLive = (w: Webinaire) => { const s = new Date(w.date_heure); const dur = (w.duree ?? 2) * 60 * 60 * 1000; return clientNow >= s && clientNow < new Date(s.getTime() + dur); };
  const isWebPast = (w: Webinaire) => clientNow >= new Date(new Date(w.date_heure).getTime() + (w.duree ?? 2) * 60 * 60 * 1000);
  const upcoming = webinaires.filter(w => !isWebPast(w));
  const past = webinaires.filter(w => isWebPast(w));
  const displayed = showPast ? past : upcoming;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      {/* Header */}
      <div style={{ padding: mob ? "24px 0 16px" : "36px 0 24px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <div style={{ display: "flex", alignItems: mob ? "flex-start" : "center", justifyContent: "space-between", flexDirection: mob ? "column" : "row", gap: 10, marginTop: 8 }}>
          <h1 style={{ fontSize: mob ? 26 : 34, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.1 }}>
            💻 Webinaires
          </h1>
        </div>
        <p style={{ fontSize: mob ? 13 : 15, color: C.textSec, marginTop: 6, marginBottom: 0 }}>
          Formations en visioconférence en direct - participez depuis chez vous.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, padding: 4, background: C.bgAlt, borderRadius: 12, width: "fit-content" }}>
        <button
          onClick={() => setShowPast(false)}
          style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: !showPast ? C.surface : "transparent", color: !showPast ? C.text : C.textTer, fontSize: 13, fontWeight: !showPast ? 700 : 500, cursor: "pointer", boxShadow: !showPast ? "0 1px 4px rgba(45,27,6,0.08)" : "none", fontFamily: "inherit" }}>
          À venir ({upcoming.length})
        </button>
        <button
          onClick={() => setShowPast(true)}
          style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: showPast ? C.surface : "transparent", color: showPast ? C.text : C.textTer, fontSize: 13, fontWeight: showPast ? 700 : 500, cursor: "pointer", boxShadow: showPast ? "0 1px 4px rgba(45,27,6,0.08)" : "none", fontFamily: "inherit" }}>
          Passés ({past.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: mob ? "40px 0" : "60px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💻</div>
          <p style={{ color: C.textTer, fontSize: 15, fontWeight: 600 }}>
            {showPast ? "Aucun webinaire passé." : "Aucun webinaire prévu pour le moment."}
          </p>
          {!showPast && <p style={{ color: C.textTer, fontSize: 13, marginTop: 6 }}>Revenez bientôt !</p>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))", gap: mob ? 14 : 20, paddingBottom: 48 }}>
          {displayed.map(w => {
            const { date, time } = formatDate(w.date_heure);
            const live = isWebLive(w);
            const isPast = isWebPast(w);
            return (
              <div key={w.id} style={{ background: C.surface, border: "1.5px solid " + (live ? "#DC262633" : C.borderLight), borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column", opacity: isPast ? 0.75 : 1 }}>
                <div style={{ padding: mob ? "18px 16px 14px" : "22px 22px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8, background: C.blueBg, color: C.blue }}>💻 Visio</span>
                    {w.prix === 0
                      ? <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8, background: C.greenBg, color: C.green }}>Gratuit</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8, background: C.bgAlt, color: C.textSec }}>{w.prix} €</span>}
                    {live && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8, background: "#FEE2E2", color: "#DC2626" }}>🔴 EN DIRECT</span>}
                    {isPast && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8, background: C.bgAlt, color: C.textTer }}>Passé</span>}
                  </div>

                  <div style={{ fontSize: mob ? 15 : 17, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{w.titre}</div>

                  {w.description && (
                    <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as any }}>
                      {w.description}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text, fontWeight: 600, background: C.bgAlt, borderRadius: 10, padding: "9px 12px" }}>
                    <span style={{ fontSize: 16 }}>📅</span>
                    <div>
                      <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{date}</div>
                      <div style={{ fontSize: 12, color: C.textTer, fontWeight: 500 }}>à {time}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {w.organisme?.nom && (
                      <div style={{ fontSize: 12, color: C.textTer, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>🏢</span> <span>{w.organisme.nom}</span>
                      </div>
                    )}
                    {w.formateur?.nom && (
                      <div style={{ fontSize: 12, color: C.textTer, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>🎤</span> <span>{w.formateur.nom}</span>
                      </div>
                    )}
                  </div>
                </div>

                {!isPast && (
                  <div style={{ padding: mob ? "0 16px 16px" : "0 22px 18px" }}>
                    <a href={`/webinaires/${w.id}`} style={{ display: "block", padding: "11px 20px", borderRadius: 12, background: live ? "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)" : C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                      {live ? "🔴 Rejoindre la visio" : "Voir le webinaire →"}
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
