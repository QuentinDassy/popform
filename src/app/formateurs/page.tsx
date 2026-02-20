"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C, fetchFormateurs, fetchFormations, fmtTitle, type Formation } from "@/lib/data";
import { FormationCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";

export default function FormateursPage() {
  const mob = useIsMobile();
  const [fmts, setFmts] = useState<any[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => { Promise.all([fetchFormateurs(), fetchFormations()]).then(([f, fo]) => {
    // Deduplicate: one formateur per nom (case-insensitive) or user_id
    const seen = new Set<string>();
    const unique = f.filter((fmt: any) => {
      const nameKey = fmt.nom?.toLowerCase().trim();
      const userKey = fmt.user_id;
      const idKey = String(fmt.id);
      
      // Si on a déjà vu ce nom, c'est un doublon
      if (nameKey && seen.has(nameKey)) return false;
      // Si on a déjà vu ce user_id, c'est un doublon
      if (userKey && seen.has(userKey)) return false;
      
      if (nameKey) seen.add(nameKey);
      if (userKey) seen.add(userKey);
      seen.add(idKey);
      return true;
    });
    setFmts(unique);
    setFormations(fo);
    setLoading(false);
  }); }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  const filtered = search.trim()
    ? fmts.filter(f => f.nom.toLowerCase().includes(search.toLowerCase()) || (f.bio || "").toLowerCase().includes(search.toLowerCase()))
    : fmts;

  const selected = fmts.find(f => f.id === selectedId);
  const selectedFormations = formations.filter(f => f.formateur_id === selectedId && f.status === "publiee");

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>🎤 Formateur·rice·s</h1>
        <p style={{ fontSize: 13, color: C.textTer, marginTop: 2 }}>{fmts.length} formateur·rice·s</p>
      </div>

      {/* Barre de recherche */}
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

      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : selectedId ? "340px 1fr" : "1fr", gap: 16, paddingBottom: 40 }}>
        {/* ── Liste en ligne (grille) ── */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: selectedId ? "1fr" : mob ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
            {filtered.map(f => {
              const count = formations.filter(x => x.formateur_id === f.id).length;
              const isSelected = selectedId === f.id;
              return (
                <div key={f.id} onClick={() => setSelectedId(isSelected ? null : f.id)}
                  style={{ padding: mob ? 12 : 14, background: isSelected ? C.accentBg : C.surface, borderRadius: 12, border: "1.5px solid " + (isSelected ? C.accent + "55" : C.borderLight), cursor: "pointer", transition: "all 0.2s", display: "flex", gap: 10, alignItems: "center" }}>
                  {/* Avatar */}
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: C.gradientSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 800, flexShrink: 0 }}>
                    {f.nom.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? C.accent : C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.nom}</div>
                    <div style={{ fontSize: 11, color: C.textTer }}>{fmtTitle(f)} · {count} formation{count > 1 ? "s" : ""}{f.organisme ? " · " + f.organisme.nom : ""}</div>
                  </div>
                  <span style={{ fontSize: 11, color: isSelected ? C.accent : C.textTer, flexShrink: 0 }}>{isSelected ? "▲" : "▶"}</span>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Aucun formateur·rice trouvé·e.</div>
          )}
        </div>

        {/* ── Panneau détail formateur sélectionné ── */}
        {selectedId && selected && (
          <div style={{ position: mob ? "static" : "sticky", top: 80, alignSelf: "start" }}>
            <div style={{ padding: mob ? 16 : 24, background: C.surface, borderRadius: 16, border: "1px solid " + C.borderLight, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 28, background: C.gradientSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", fontWeight: 800, flexShrink: 0 }}>
                  {selected.nom.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{selected.nom}</div>
                  <div style={{ fontSize: 12, color: C.textTer }}>{fmtTitle(selected)}{selected.organisme ? " · " + selected.organisme.nom : ""}</div>
                </div>
              </div>
              {selected.bio && <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, borderTop: "1px solid " + C.borderLight, paddingTop: 12 }}>{selected.bio}</p>}
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>Formations ({selectedFormations.length})</h3>
            {selectedFormations.length === 0 ? (
              <p style={{ color: C.textTer, fontSize: 13 }}>Aucune formation publiée pour l&apos;instant.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
                {selectedFormations.map(f => <FormationCard key={f.id} f={f} mob={mob} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
