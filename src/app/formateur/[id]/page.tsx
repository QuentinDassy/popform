"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { C, fetchFormateurs, fetchFormations, fmtTitle, isFormationPast, type Formation } from "@/lib/data";
import { FormationCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";

export default function FormateurPage() {
  const mob = useIsMobile();
  const { id } = useParams<{ id: string }>();
  const fmtId = Number(id);

  const [fmt, setFmt] = useState<any>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchFormateurs(), fetchFormations()]).then(([fmts, fos]) => {
      const found = fmts.find((f: any) => f.id === fmtId);
      setFmt(found || null);
      const fmtFormations = fos.filter((fo: Formation) =>
        fo.status === "publiee" &&
        !isFormationPast(fo) &&
        (fo.formateur_id === fmtId || ((fo as any).formateur_ids || []).includes(fmtId))
      );
      setFormations(fmtFormations);
      setLoading(false);
    });
  }, [fmtId]);

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  if (!fmt) return (
    <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🤷</div>
      <p>Formateur·rice introuvable.</p>
      <Link href="/formateurs" style={{ color: C.accent, fontSize: 13 }}>← Retour aux formateurs</Link>
    </div>
  );

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px 40px" : "0 40px 60px" }}>
      {/* Back */}
      <div style={{ padding: "16px 0 20px" }}>
        <Link href="/formateurs" style={{ color: C.textTer, fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
          ← Retour aux formateurs
        </Link>
      </div>

      {/* Profile card */}
      <div style={{ background: C.surface, borderRadius: 18, border: "1.5px solid " + C.borderLight, padding: mob ? 20 : 36, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: mob ? 16 : 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ width: mob ? 88 : 110, height: mob ? 88 : 110, borderRadius: mob ? 44 : 55, background: C.gradientSoft, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: mob ? 26 : 34, color: "#fff", fontWeight: 800 }}>
            {fmt.photo_url
              ? <img src={fmt.photo_url} alt={fmt.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : fmt.nom.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: mob ? 20 : 26, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>{fmt.nom}</h1>
            <div style={{ fontSize: 13, color: C.textTer }}>{fmtTitle(fmt)}</div>
            <div style={{ fontSize: 12, color: C.textTer, marginTop: 4 }}>
              {formations.length} formation{formations.length > 1 ? "s" : ""} publiée{formations.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>
        {fmt.bio && (
          <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.75, marginTop: 20, paddingTop: 20, borderTop: "1px solid " + C.borderLight, marginBottom: 0 }}>
            {fmt.bio}
          </p>
        )}
      </div>

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
