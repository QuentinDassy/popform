"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { C, fetchFormateurs, fetchFormations, fmtTitle, isFormationPast, type Formation } from "@/lib/data";
import { supabase } from "@/lib/supabase-data";
import { FormationCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";

function FormateursContent() {
  const mob = useIsMobile();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const [fmts, setFmts] = useState<any[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [fmtCounts, setFmtCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(idParam ? Number(idParam) : null);
  const [search, setSearch] = useState("");
  const loadingRef = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [f, fo] = await Promise.all([fetchFormateurs(), fetchFormations()]);
      const seen = new Set<string>();
      const unique = f.filter((fmt: any) => {
        if (fmt.hidden) return false;
        const nameKey = fmt.nom?.toLowerCase().trim();
        if (nameKey && seen.has(nameKey)) return false;
        if (nameKey) seen.add(nameKey);
        return true;
      });
      const { data: allFmtFormations } = await supabase
        .from("formations")
        .select("formateur_id, formateur_ids, status")
        .neq("status", "refusee");
      const counts: Record<number, number> = {};
      for (const row of allFmtFormations || []) {
        const ids: number[] = (row.formateur_ids?.length ? row.formateur_ids : (row.formateur_id != null ? [row.formateur_id] : []));
        for (const id of ids) counts[id] = (counts[id] || 0) + 1;
      }
      setFmts(unique);
      setFormations(fo);
      setFmtCounts(counts);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedId != null) setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 60);
  }, [selectedId]);

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  const filtered = search.trim()
    ? fmts.filter(f => f.nom.toLowerCase().includes(search.toLowerCase()) || (f.bio || "").toLowerCase().includes(search.toLowerCase()))
    : fmts;

  const selected = fmts.find(f => f.id === selectedId);
  const selectedFormations = formations.filter(fo =>
    fo.status === "publiee" &&
    !isFormationPast(fo) &&
    (fo.formateur_id === selectedId || ((fo as any).formateur_ids || []).includes(selectedId))
  );

  // ─── DETAIL VIEW ───
  if (selectedId && selected) {
    return (
      <div ref={topRef} style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px 40px" : "0 40px 60px" }}>
        {/* Back */}
        <div style={{ padding: "16px 0 20px" }}>
          <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textTer, fontSize: 13, padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
            ← Retour aux formateurs
          </button>
        </div>

        {/* Profile card */}
        <div style={{ background: C.surface, borderRadius: 18, border: "1.5px solid " + C.borderLight, padding: mob ? 20 : 36, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: mob ? 16 : 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{ width: mob ? 88 : 110, height: mob ? 88 : 110, borderRadius: mob ? 44 : 55, background: C.gradientSoft, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: mob ? 26 : 34, color: "#fff", fontWeight: 800 }}>
              {selected.photo_url
                ? <img src={selected.photo_url} alt={selected.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : selected.nom.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: mob ? 20 : 26, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>{selected.nom}</h1>
              <div style={{ fontSize: 13, color: C.textTer }}>
                {fmtTitle(selected)}
              </div>
              <div style={{ fontSize: 12, color: C.textTer, marginTop: 4 }}>
                {fmtCounts[selected.id] || 0} formation{(fmtCounts[selected.id] || 0) > 1 ? "s" : ""}
              </div>
            </div>
          </div>
          {selected.bio && (
            <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.75, marginTop: 20, paddingTop: 20, borderTop: "1px solid " + C.borderLight, marginBottom: 0 }}>
              {selected.bio}
            </p>
          )}
        </div>

        {/* Formations */}
        <h2 style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: C.text, marginBottom: 14 }}>
          Formations ({selectedFormations.length})
        </h2>
        {selectedFormations.length === 0 ? (
          <p style={{ color: C.textTer, fontSize: 13 }}>Aucune formation publiée pour l&apos;instant.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(280px,100%),1fr))", gap: 14 }}>
            {selectedFormations.map(f => <FormationCard key={f.id} f={f} mob={mob} />)}
          </div>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      {/* Header */}
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>🎤 Formateur·rice·s</h1>
        <p style={{ fontSize: 13, color: C.textTer, marginTop: 2 }}>{fmts.length} formateur·rice·s</p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: 12, height: 42, maxWidth: 400 }}>
          <span style={{ color: C.textTer, fontSize: 16 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un formateur·rice..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 13 }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.textTer, fontSize: 14 }}>✕</button>}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 10, paddingBottom: 40 }}>
        {filtered.map(f => {
          const count = fmtCounts[f.id] || 0;
          return (
            <div key={f.id} onClick={() => setSelectedId(f.id)}
              style={{ padding: 14, background: C.surface, borderRadius: 14, border: "1.5px solid " + C.borderLight, cursor: "pointer", transition: "all 0.15s", display: "flex", gap: 14, alignItems: "center" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.accent + "55"; (e.currentTarget as HTMLDivElement).style.background = C.accentBg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.borderLight; (e.currentTarget as HTMLDivElement).style.background = C.surface; }}>
              {/* Avatar */}
              <div style={{ width: 56, height: 56, borderRadius: 28, background: C.gradientSoft, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 800 }}>
                {f.photo_url ? <img src={f.photo_url} alt={f.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : f.nom.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nom}</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmtTitle(f)} · {count} formation{count > 1 ? "s" : ""}</div>
                {f.bio && <div style={{ fontSize: 11, color: C.textSec, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.bio}</div>}
              </div>
              <span style={{ fontSize: 12, color: C.textTer, flexShrink: 0 }}>›</span>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Aucun formateur·rice trouvé·e.</div>
      )}
    </div>
  );
}

export default function FormateursPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: 80 }}>🍿 Chargement...</div>}>
      <FormateursContent />
    </Suspense>
  );
}
