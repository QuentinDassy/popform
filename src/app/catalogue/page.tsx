"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { C, fetchFormations, type Formation } from "@/lib/data";
import { FormationCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";

function CatalogueContent() {
  const searchParams = useSearchParams();
  const villeParam = searchParams.get("ville") || "";
  const domaineParam = searchParams.get("domaine") || "";
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("pertinence");
  const [ville, setVille] = useState(villeParam);
  const [domaine, setDomaine] = useState(domaineParam);
  const mob = useIsMobile();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFormations().then(d => { setFormations(d); setLoading(false) }) }, []);

  let filtered = formations.filter(f => {
    if (search) { const q = search.toLowerCase(); if (![f.titre, f.sous_titre || "", f.domaine, ...(f.mots_cles || []), ...(f.populations || []), ...(f.sessions || []).map(s => s.lieu)].some(s => s.toLowerCase().includes(q))) return false }
    if (ville && !(f.sessions || []).some(s => s.lieu.toLowerCase().includes(ville.toLowerCase()))) return false;
    if (domaine && f.domaine !== domaine) return false;
    return true;
  });
  if (sort === "prix-asc") filtered = [...filtered].sort((a, b) => a.prix - b.prix);
  else if (sort === "prix-desc") filtered = [...filtered].sort((a, b) => b.prix - a.prix);
  else if (sort === "note") filtered = [...filtered].sort((a, b) => b.note - a.note);
  else if (sort === "recent") filtered = [...filtered].sort((a, b) => b.date_ajout.localeCompare(a.date_ajout));

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>{ville ? `Formations à ${ville}` : domaine ? domaine : "Toutes les formations"}</h1>
        <p style={{ fontSize: mob ? 12 : 13, color: C.textTer, marginTop: 3 }}>{filtered.length} formation{filtered.length > 1 ? "s" : ""}</p>
      </div>
      <div style={{ display: "flex", gap: mob ? 6 : 10, marginBottom: mob ? 12 : 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: mob ? "100%" : 200, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: 12, height: mob ? 38 : 44 }}>
          <span style={{ color: C.textTer }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Domaine, mot-clé, ville..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: mob ? 12 : 13 }} />
        </div>
        {ville && <button onClick={() => setVille("")} style={{ padding: "6px 12px", borderRadius: 9, background: C.accentBg, border: "1px solid " + C.accent + "22", color: C.accent, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>📍 {ville} ✕</button>}
        {domaine && <button onClick={() => setDomaine("")} style={{ padding: "6px 12px", borderRadius: 9, background: C.accentBg, border: "1px solid " + C.accent + "22", color: C.accent, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>🏷 {domaine} ✕</button>}
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: "6px 10px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, cursor: "pointer", outline: "none" }}>
          <option value="pertinence">Pertinence</option><option value="recent">Récentes</option><option value="note">Mieux notées</option><option value="prix-asc">Prix ↑</option><option value="prix-desc">Prix ↓</option>
        </select>
      </div>
      {filtered.length === 0 ? <div style={{ textAlign: "center", padding: 50, color: C.textTer }}>🍿 Aucune formation</div> :
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: mob ? 10 : 16, paddingBottom: 40 }}>
          {filtered.map(f => <FormationCard key={f.id} f={f} mob={mob} />)}
        </div>}
    </div>
  );
}

export default function CataloguePage() {
  return (<Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Chargement...</div>}><CatalogueContent /></Suspense>);
}
