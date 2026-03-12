"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { C, fetchFormateurs, fetchFormations, fmtTitle, type Formation } from "@/lib/data";
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
  const detailRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [f, fo] = await Promise.all([fetchFormateurs(), fetchFormations()]);

      const seen = new Set<string>();
      const unique = f.filter((fmt: any) => {
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

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId != null && detailRef.current) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }, [selectedId]);

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  const filtered = search.trim()
    ? fmts.filter(f => f.nom.toLowerCase().includes(search.toLowerCase()) || (f.bio || "").toLowerCase().includes(search.toLowerCase()))
    : fmts;

  const selected = fmts.find(f => f.id === selectedId);
  const selectedFormations = formations.filter(fo =>
    fo.status === "publiee" &&
    (fo.formateur_id === selectedId || ((fo as any).formateur_ids || []).includes(selectedId))
  );

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
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un formateur·rice..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 13 }}
          />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.textTer, fontSize: 14 }}>✕</button>}
        </div>
      </div>

      {/* Grid of cards */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, marginBottom: selectedId ? 16 : 0 }}>
        {filtered.map(f => {
          const count = fmtCounts[f.id] || 0;
          const isSelected = selectedId === f.id;
          return (
            <div key={f.id} onClick={() => setSelectedId(isSelected ? null : f.id)}
              style={{ padding: 14, background: isSelected ? C.accentBg : C.surface, borderRadius: 14, border: "1.5px solid " + (isSelected ? C.accent + "55" : C.borderLight), cursor: "pointer", transition: "all 0.15s", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: 30, background: C.gradientSoft, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", fontWeight: 800 }}>
                {f.photo_url ? <img src={f.photo_url} alt={f.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : f.nom.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? C.accent : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nom}</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>{fmtTitle(f)} · {count} formation{count > 1 ? "s" : ""}{f.organisme ? " · " + f.organisme.nom : ""}</div>
                {f.bio && <div style={{ fontSize: 11, color: C.textSec, marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{f.bio}</div>}
              </div>
              <span style={{ fontSize: 10, color: isSelected ? C.accent : C.textTer, flexShrink: 0 }}>{isSelected ? "▼" : "▶"}</span>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Aucun formateur·rice trouvé·e.</div>
      )}

      {/* Detail panel — full width, below the grid */}
      {selectedId && selected && (
        <div ref={detailRef} style={{ marginTop: 8, marginBottom: 40, scrollMarginTop: 80 }}>
          {/* Profile card */}
          <div style={{ background: C.surface, borderRadius: 16, border: "1.5px solid " + C.accent + "33", padding: mob ? 16 : 24, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", minWidth: 0 }}>
                <div style={{ width: 88, height: 88, borderRadius: 44, background: C.gradientSoft, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff", fontWeight: 800 }}>
                  {selected.photo_url ? <img src={selected.photo_url} alt={selected.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : selected.nom.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: mob ? 16 : 20, fontWeight: 800, color: C.text }}>{selected.nom}</div>
                  <div style={{ fontSize: 12, color: C.textTer, marginTop: 2 }}>{fmtTitle(selected)}{selected.organisme ? " · " + selected.organisme.nom : ""}</div>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} style={{ flexShrink: 0, background: "none", border: "1.5px solid " + C.border, borderRadius: 8, cursor: "pointer", color: C.textTer, fontSize: 12, padding: "5px 10px", fontFamily: "inherit" }}>✕ Fermer</button>
            </div>
            {selected.bio && (
              <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.7, borderTop: "1px solid " + C.borderLight, paddingTop: 12, marginTop: 14, marginBottom: 0 }}>{selected.bio}</p>
            )}
          </div>

          {/* Formations */}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Formations ({selectedFormations.length})</h3>
          {selectedFormations.length === 0 ? (
            <p style={{ color: C.textTer, fontSize: 13, paddingBottom: 20 }}>Aucune formation publiée pour l&apos;instant.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {selectedFormations.map(f => <FormationCard key={f.id} f={f} mob={mob} />)}
            </div>
          )}
        </div>
      )}

      {!selectedId && <div style={{ paddingBottom: 40 }} />}
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
