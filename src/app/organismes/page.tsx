"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { C, fetchOrganismes, type Organisme } from "@/lib/data";
import { supabase } from "@/lib/supabase-data";
import { useIsMobile } from "@/lib/hooks";

export default function OrganismesPage() {
  const mob = useIsMobile();
  const [orgs, setOrgs] = useState<Organisme[]>([]);
  const [orgCounts, setOrgCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const load = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [o] = await Promise.all([fetchOrganismes()]);
      // Sort: user-linked first, then deduplicate
      const sorted = [...o].sort((a, b) => {
        if (a.user_id && !b.user_id) return -1;
        if (!a.user_id && b.user_id) return 1;
        return 0;
      });
      const seen = new Set<string>();
      const unique = sorted.filter(org => {
        const nameKey = org.nom?.toLowerCase().trim();
        const userKey = org.user_id;
        if (userKey && seen.has("u:" + userKey)) return false;
        if (nameKey && seen.has("n:" + nameKey)) return false;
        if (userKey) seen.add("u:" + userKey);
        if (nameKey) seen.add("n:" + nameKey);
        return true;
      });
      // Fetch formation counts (all non-refused)
      const { data: allOrgFormations } = await supabase
        .from("formations")
        .select("organisme_id, formateur_id, status")
        .neq("status", "refusee");
      // Also fetch formateurs to get their organisme_id
      const { data: fmts } = await supabase.from("formateurs").select("id, organisme_id");
      const fmtOrgMap: Record<number, number> = {};
      for (const f of fmts || []) {
        if (f.organisme_id) fmtOrgMap[f.id] = f.organisme_id;
      }
      const counts: Record<number, number> = {};
      for (const row of allOrgFormations || []) {
        const orgId = row.organisme_id || (row.formateur_id ? fmtOrgMap[row.formateur_id] : null);
        if (orgId) counts[orgId] = (counts[orgId] || 0) + 1;
      }
      setOrgs(unique);
      setOrgCounts(counts);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>🏢 Organismes</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 12, paddingBottom: 40 }}>
        {orgs.map(o => { const count = orgCounts[o.id] || 0; return (
          <Link key={o.id} href={`/catalogue?organisme=${o.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ padding: mob ? 14 : 18, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 800, flexShrink: 0, overflow: "hidden" }}>
                  {o.logo && o.logo.startsWith("http") ? <img src={o.logo} alt={o.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (o.logo || o.nom?.slice(0,2))}
                </div>
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
