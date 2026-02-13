"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { C, FORMATIONS } from "@/lib/data";
import { FormationCard } from "@/components/ui";
import { Suspense } from "react";

function CatalogueContent() {
  const searchParams = useSearchParams();
  const villeParam = searchParams.get("ville") || "";
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("pertinence");
  const [ville, setVille] = useState(villeParam);

  let filtered = FORMATIONS.filter(f => {
    if (search) {
      const q = search.toLowerCase();
      if (![f.titre, f.sousTitre || "", f.domaine, ...(f.motsCles || []), ...(f.populations || []), ...f.sessions.map(s => s.lieu)].some(s => s.toLowerCase().includes(q))) return false;
    }
    if (ville && !f.sessions.some(s => s.lieu.toLowerCase().includes(ville.toLowerCase()))) return false;
    return true;
  });

  if (sort === "prix-asc") filtered = [...filtered].sort((a, b) => a.prix - b.prix);
  else if (sort === "prix-desc") filtered = [...filtered].sort((a, b) => b.prix - a.prix);
  else if (sort === "note") filtered = [...filtered].sort((a, b) => b.note - a.note);
  else if (sort === "recent") filtered = [...filtered].sort((a, b) => b.dateAjout.localeCompare(a.dateAjout));

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginTop: 6 }}>{ville ? `Formations à ${ville}` : "Toutes les formations"}</h1>
        <p style={{ fontSize: 13, color: C.textTer, marginTop: 3 }}>{filtered.length} formation{filtered.length > 1 ? "s" : ""}</p>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: 12, height: 44 }}>
          <span style={{ color: C.textTer }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Domaine, mot-clé, ville, population..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 13 }} />
        </div>
        {ville && <button onClick={() => setVille("")} style={{ padding: "6px 12px", borderRadius: 9, background: C.accentBg, border: "1px solid " + C.accent + "22", color: C.accent, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>📍 {ville} ✕</button>}
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: "6px 10px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, cursor: "pointer", outline: "none" }}>
          <option value="pertinence">Pertinence</option>
          <option value="recent">Récentes</option>
          <option value="note">Mieux notées</option>
          <option value="prix-asc">Prix ↑</option>
          <option value="prix-desc">Prix ↓</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: C.textTer }}>🍿 Aucune formation trouvée</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16, paddingBottom: 40 }}>
          {filtered.map(f => <FormationCard key={f.id} f={f} />)}
        </div>
      )}
    </div>
  );
}

export default function CataloguePage() {
  return (<Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: C.textTer }}>Chargement...</div>}><CatalogueContent /></Suspense>);
}
