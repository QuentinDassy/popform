"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C, fetchOrganismes, fetchFormations, type Organisme, type Formation } from "@/lib/data";
import { useIsMobile } from "@/lib/hooks";

export default function OrganismesPage() {
  const mob = useIsMobile();
  const [orgs, setOrgs] = useState<Organisme[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([fetchOrganismes(), fetchFormations()]).then(([o, f]) => { setOrgs(o); setFormations(f); setLoading(false) }) }, []);
  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>🏢 Organismes</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 12, paddingBottom: 40 }}>
        {orgs.map(o => { const count = formations.filter(f => f.organisme_id === o.id).length; return (
          <Link key={o.id} href={`/catalogue`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ padding: mob ? 14 : 18, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 800, flexShrink: 0 }}>{o.logo}</div>
                <div><div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{o.nom}</div><div style={{ fontSize: 11, color: C.textTer }}>{count} formation{count > 1 ? "s" : ""}</div></div>
              </div>
              {o.description && <p style={{ fontSize: 12, color: C.textTer, lineHeight: 1.5 }}>{o.description}</p>}
            </div>
          </Link>
        ); })}
      </div>
    </div>
  );
}
