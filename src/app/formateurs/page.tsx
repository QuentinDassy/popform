"use client";
import Link from "next/link";
import { C, FORMATEURS, FORMATIONS, ORGANISMES, fmtTitle } from "@/lib/data";

export default function FormateursPage() {
  const sorted = [...FORMATEURS].sort((a, b) => a.nom.localeCompare(b.nom));
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginTop: 6 }}>🎤 Formateur·rice·s</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12, paddingBottom: 40 }}>
        {sorted.map(f => {
          const count = FORMATIONS.filter(x => x.formateurId === f.id).length;
          const org = ORGANISMES.find(o => o.id === f.organismeId);
          return (
            <Link key={f.id} href={`/catalogue?formateur=${f.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ padding: 18, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: C.gradientSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 800, flexShrink: 0 }}>{f.nom.split(" ").map(n => n[0]).join("")}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{f.nom}</div>
                    <div style={{ fontSize: 11, color: C.textTer }}>{fmtTitle(f.id)} · {count} formation{count > 1 ? "s" : ""}</div>
                  </div>
                </div>
                {org && <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, background: C.greenBg, color: C.green, fontWeight: 600 }}>🏢 {org.nom}</span>}
                {f.bio && <p style={{ fontSize: 12, color: C.textTer, lineHeight: 1.5, marginTop: 4 }}>{f.bio}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
