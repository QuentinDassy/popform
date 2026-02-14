"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C, fetchFormateurs, fetchFormations, fmtTitle, type Formation } from "@/lib/data";
import { useIsMobile } from "@/lib/hooks";

export default function FormateursPage() {
  const mob = useIsMobile();
  const [fmts, setFmts] = useState<any[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([fetchFormateurs(), fetchFormations()]).then(([f, fo]) => { setFmts(f); setFormations(fo); setLoading(false) }) }, []);
  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>🎤 Formateur·rice·s</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 12, paddingBottom: 40 }}>
        {fmts.map(f => { const count = formations.filter(x => x.formateur_id === f.id).length; return (
          <Link key={f.id} href={`/catalogue`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ padding: mob ? 14 : 18, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: C.gradientSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 800, flexShrink: 0 }}>{f.nom.split(" ").map((n: string) => n[0]).join("")}</div>
                <div><div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{f.nom}</div><div style={{ fontSize: 11, color: C.textTer }}>{fmtTitle(f)} · {count} formation{count > 1 ? "s" : ""}</div></div>
              </div>
              {f.organisme && <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, background: C.greenBg, color: C.green, fontWeight: 600 }}>🏢 {f.organisme.nom}</span>}
              {f.bio && <p style={{ fontSize: 12, color: C.textTer, lineHeight: 1.5, marginTop: 4 }}>{f.bio}</p>}
            </div>
          </Link>
        ); })}
      </div>
    </div>
  );
}
