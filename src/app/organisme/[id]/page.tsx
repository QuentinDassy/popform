"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { C, fetchOrganismes, fetchFormations, isFormationPast, type Organisme, type Formation } from "@/lib/data";
import { FormationCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase } from "@/lib/supabase-data";

export default function OrganismePage() {
  const mob = useIsMobile();
  const { id } = useParams<{ id: string }>();
  const orgId = Number(id);

  const [org, setOrg] = useState<Organisme | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [webinaires, setWebinaires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchOrganismes(),
      fetchFormations(),
      supabase.from("webinaires").select("*, formateur:formateurs(nom)").eq("organisme_id", orgId).eq("status", "publie").order("date_heure", { ascending: true }),
    ]).then(([orgs, fos, { data: wbs }]) => {
      const found = orgs.find((o: Organisme) => o.id === orgId) || null;
      setOrg(found);
      const orgFormations = fos.filter((fo: Formation) =>
        fo.status === "publiee" &&
        !isFormationPast(fo) &&
        (fo.organisme_id === orgId || ((fo as any).organisme_ids || []).includes(orgId))
      );
      setFormations(orgFormations);
      const now = new Date();
      setWebinaires((wbs || []).filter((w: any) => now < new Date(new Date(w.date_heure).getTime() + (w.duree ?? 2) * 3600000)));
      setLoading(false);
    });
  }, [orgId]);

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  if (!org) return (
    <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🤷</div>
      <p>Organisme introuvable.</p>
      <Link href="/organismes" style={{ color: C.accent, fontSize: 13 }}>← Retour aux organismes</Link>
    </div>
  );

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px 40px" : "0 40px 60px" }}>
      {/* Back */}
      <div style={{ padding: "16px 0 20px" }}>
        <Link href="/organismes" style={{ color: C.textTer, fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
          ← Retour aux organismes
        </Link>
      </div>

      {/* Profile card */}
      <div style={{ background: C.surface, borderRadius: 18, border: "1.5px solid " + C.borderLight, padding: mob ? 20 : 36, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: mob ? 16 : 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Logo */}
          <div style={{ width: mob ? 72 : 90, height: mob ? 72 : 90, borderRadius: 16, background: C.gradient, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: mob ? 22 : 28, color: "#fff", fontWeight: 800 }}>
            {org.logo && org.logo.startsWith("http")
              ? <img src={org.logo} alt={org.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : (org.logo || org.nom?.slice(0, 2))}
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: mob ? 20 : 26, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>{org.nom}</h1>
            {(org as any).site_url && (
              <a href={(org as any).site_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.accent, textDecoration: "none" }}>
                🌐 {(org as any).site_url.replace(/^https?:\/\//, "")}
              </a>
            )}
            <div style={{ fontSize: 12, color: C.textTer, marginTop: 4 }}>
              {formations.length} formation{formations.length > 1 ? "s" : ""} publiée{formations.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>
        {org.description && (
          <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.75, marginTop: 20, paddingTop: 20, borderTop: "1px solid " + C.borderLight, marginBottom: 0 }}>
            {org.description}
          </p>
        )}
      </div>

      {/* Webinaires */}
      {webinaires.length > 0 && (
        <>
          <h2 style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: C.text, marginBottom: 14 }}>
            Webinaires à venir ({webinaires.length})
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(280px,100%),1fr))", gap: 14, marginBottom: 28 }}>
            {webinaires.map((w: any) => {
              const d = new Date(w.date_heure);
              const end = new Date(d.getTime() + (w.duree ?? 2) * 3600000);
              const dateStr = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
              const timeStr = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
              const endStr = end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
              return (
                <a key={w.id} href={`/webinaires/${w.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", background: C.surface, border: "1.5px solid " + C.borderLight, borderRadius: 16, overflow: "hidden" } as React.CSSProperties}>
                  {w.image_url && <img src={w.image_url} alt={w.titre} style={{ width: "100%", height: 140, objectFit: "cover" }} />}
                  <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 7, background: C.blueBg, color: C.blue }}>Visio</span>
                      {w.prix === 0 ? <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 7, background: C.greenBg, color: C.green }}>Gratuit</span> : <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 7, background: C.bgAlt, color: C.textSec }}>{w.prix} €</span>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{w.titre}</div>
                    <div style={{ fontSize: 12, color: C.textTer, background: C.bgAlt, borderRadius: 8, padding: "7px 10px" }}>
                      <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{dateStr}</div>
                      <div style={{ fontSize: 11 }}>de {timeStr} à {endStr}</div>
                    </div>
                    {w.formateur?.nom && <div style={{ fontSize: 11, color: C.textTer }}>🎤 {w.formateur.nom}</div>}
                  </div>
                  <div style={{ padding: "0 16px 14px" }}>
                    <div style={{ padding: "9px 16px", borderRadius: 10, background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, textAlign: "center" }}>Voir le webinaire →</div>
                  </div>
                </a>
              );
            })}
          </div>
        </>
      )}

      {/* Formations */}
      <h2 style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: C.text, marginBottom: 14 }}>
        Formations ({formations.length})
      </h2>
      {formations.length === 0 ? (
        <div style={{ padding: "20px 24px", background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight }}>
          <p style={{ color: C.textTer, fontSize: 13 }}>Aucune formation publiée pour l&apos;instant.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(280px,100%),1fr))", gap: 14 }}>
          {formations.map(f => <FormationCard key={f.id} f={f} mob={mob} />)}
        </div>
      )}
    </div>
  );
}
