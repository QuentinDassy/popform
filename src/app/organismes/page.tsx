"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { C, fetchOrganismes, fetchFormations, isFormationPast, type Organisme, type Formation } from "@/lib/data";
import { useIsMobile } from "@/lib/hooks";

const MAX_DESC = 150;

function OrgCard({ o, count, mob }: { o: Organisme; count: number; mob: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const long = (o.description || "").length > MAX_DESC;
  const desc = long && !expanded ? o.description!.slice(0, MAX_DESC) + "…" : (o.description || "");
  return (
    <Link href={`/organisme/${o.id}`} style={{ textDecoration: "none", color: "inherit", height: "100%", display: "block" }}>
      <div style={{ padding: mob ? 14 : 18, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, cursor: "pointer", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 800, flexShrink: 0, overflow: "hidden" }}>
            {o.logo && o.logo.startsWith("http") ? <img src={o.logo} alt={o.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (o.logo || o.nom?.slice(0, 2))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.nom}</div>
            <div style={{ fontSize: 11, color: C.textTer }}>{count} formation{count > 1 ? "s" : ""}</div>
          </div>
        </div>
        {desc && (
          <p style={{ fontSize: 12, color: C.textTer, lineHeight: 1.5, margin: 0, flex: 1 }}>
            {desc}
            {long && (
              <span
                onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(v => !v); }}
                style={{ color: C.accent, fontWeight: 600, marginLeft: 4, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {expanded ? " Réduire" : " En savoir plus"}
              </span>
            )}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function OrganismesPage() {
  const mob = useIsMobile();
  const [orgs, setOrgs] = useState<Organisme[]>([]);
  const [allFormations, setAllFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const load = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [o, fo] = await Promise.all([fetchOrganismes(), fetchFormations()]);
      // Sort: user-linked first, then deduplicate
      const sorted = [...o].sort((a, b) => {
        if (a.user_id && !b.user_id) return -1;
        if (!a.user_id && b.user_id) return 1;
        return 0;
      });
      const seen = new Set<string>();
      const unique = sorted.filter(org => {
        if (org.hidden) return false;
        const nameKey = org.nom?.toLowerCase().trim();
        const userKey = org.user_id;
        if (userKey && seen.has("u:" + userKey)) return false;
        if (nameKey && seen.has("n:" + nameKey)) return false;
        if (userKey) seen.add("u:" + userKey);
        if (nameKey) seen.add("n:" + nameKey);
        return true;
      });
      setOrgs(unique);
      setAllFormations(fo);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute formation counts per organisme
  const activeFormations = allFormations.filter(f => f.status === "publiee" && !isFormationPast(f));

  const orgCounts: Record<number, number> = {};
  for (const row of activeFormations) {
    const ids = new Set<number>();
    if ((row as any).organisme_id) ids.add((row as any).organisme_id);
    if ((row as any).organisme_ids?.length) ((row as any).organisme_ids as number[]).forEach(id => ids.add(id));
    ids.forEach(orgId => {
      orgCounts[orgId] = (orgCounts[orgId] || 0) + 1;
    });
  }

  // Quand deux organismes ont le même nom (user-linked vs legacy), fusionner les compteurs
  const nameToMaxId: Record<string, number> = {};
  for (const o of orgs) {
    const key = o.nom?.toLowerCase().trim();
    if (!key) continue;
    if (o.user_id && !(key in nameToMaxId)) nameToMaxId[key] = o.id;
  }
  const mergedCounts: Record<number, number> = { ...orgCounts };
  for (const o of orgs) {
    const key = o.nom?.toLowerCase().trim();
    if (!key || !nameToMaxId[key] || nameToMaxId[key] === o.id) continue;
    // Cet organisme a le même nom qu'un user-linked → transfère son compte vers le user-linked
    const targetId = nameToMaxId[key];
    mergedCounts[targetId] = (mergedCounts[targetId] || 0) + (orgCounts[o.id] || 0);
  }

  const filteredOrgs = [...orgs].sort((a, b) => (mergedCounts[b.id] || 0) - (mergedCounts[a.id] || 0));

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <div style={{ display: "flex", alignItems: mob ? "flex-start" : "center", justifyContent: "space-between", flexDirection: mob ? "column" : "row", gap: 8, marginTop: 6 }}>
          <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, margin: 0 }}>🏢 Organismes</h1>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(300px,100%),1fr))", gap: 12, paddingBottom: 40, alignItems: "stretch" }}>
        {filteredOrgs.map(o => <OrgCard key={o.id} o={o} count={mergedCounts[o.id] || 0} mob={mob} />)}
      </div>
    </div>
  );
}
