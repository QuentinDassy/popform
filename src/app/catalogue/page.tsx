"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { C, getDC, fetchFormations, getAllCitiesFromFormations, type Formation } from "@/lib/data";
import { FormationCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";

const DOMAINES = ["Langage oral", "Langage écrit", "Neurologie", "OMF", "Cognition mathématique", "Pratique professionnelle"];
const MODALITES = ["Présentiel", "Distanciel", "Mixte"];
const PRISES = ["DPC", "FIF-PL", "OPCO"];
const POPULATIONS = ["Enfant", "Adolescent", "Adulte", "Senior"];

function FilterPill({ label, active, onClick, color, bg }: { label: string; active: boolean; onClick: () => void; color?: string; bg?: string }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 12px", borderRadius: 9, fontSize: 11.5, fontWeight: active ? 700 : 500,
      border: "1.5px solid " + (active ? (color || C.accent) + "44" : C.border),
      background: active ? (bg || C.accentBg) : C.surface,
      color: active ? (color || C.accent) : C.textTer,
      cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function CatalogueContent() {
  const searchParams = useSearchParams();
  const villeParam = searchParams.get("ville") || "";
  const domaineParam = searchParams.get("domaine") || "";
  const qParam = searchParams.get("q") || "";
  const modaliteParam = searchParams.get("modalite") || "";
  const priseParam = searchParams.get("prise") || "";
  const [search, setSearch] = useState(qParam);
  const [sort, setSort] = useState("pertinence");
  const [selDomaine, setSelDomaine] = useState(domaineParam);
  const [selModalite, setSelModalite] = useState(modaliteParam);
  const [selPrise, setSelPrise] = useState(priseParam);
  const [selPop, setSelPop] = useState("");
  const [selVille, setSelVille] = useState(villeParam);
  const [showFilters, setShowFilters] = useState(true);
  const mob = useIsMobile();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFormations().then(d => { setFormations(d); setLoading(false) }) }, []);

  const cities = useMemo(() => getAllCitiesFromFormations(formations).map(([c]) => c), [formations]);
  const hasActiveFilters = selDomaine || selModalite || selPrise || selPop || selVille;

  let filtered = formations.filter(f => {
    if (search) {
      const q = search.toLowerCase();
      if (![f.titre, f.sous_titre || "", f.domaine, ...(f.mots_cles || []), ...(f.populations || []), ...(f.sessions || []).map(s => s.lieu)].some(s => s.toLowerCase().includes(q))) return false;
    }
    if (selVille && !(f.sessions || []).some(s => s.lieu.toLowerCase().includes(selVille.toLowerCase()))) return false;
    if (selDomaine && f.domaine !== selDomaine) return false;
    if (selModalite && f.modalite !== selModalite) return false;
    if (selPrise && !(f.prise_en_charge || []).includes(selPrise)) return false;
    if (selPop && !(f.populations || []).includes(selPop)) return false;
    return true;
  });

  if (sort === "prix-asc") filtered = [...filtered].sort((a, b) => a.prix - b.prix);
  else if (sort === "prix-desc") filtered = [...filtered].sort((a, b) => b.prix - a.prix);
  else if (sort === "note") filtered = [...filtered].sort((a, b) => b.note - a.note);
  else if (sort === "recent") filtered = [...filtered].sort((a, b) => b.date_ajout.localeCompare(a.date_ajout));

  const clearAll = () => { setSelDomaine(""); setSelModalite(""); setSelPrise(""); setSelPop(""); setSelVille(""); };

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      {/* Header */}
      <div style={{ padding: "18px 0 10px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>
          {selVille ? `Formations à ${selVille}` : selDomaine || "Toutes les formations"} 🎬
        </h1>
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", gap: mob ? 6 : 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: mob ? "100%" : 280, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: 14, height: mob ? 42 : 48, boxShadow: "0 2px 10px rgba(212,43,43,0.04)" }}>
          <span style={{ color: C.textTer, fontSize: 16 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une formation, un mot-clé, une ville..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: mob ? 13 : 14 }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", fontSize: 14 }}>✕</button>}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer", outline: "none", height: mob ? 42 : 48 }}>
          <option value="pertinence">Pertinence</option>
          <option value="recent">Plus récentes</option>
          <option value="note">Mieux notées</option>
          <option value="prix-asc">Prix croissant</option>
          <option value="prix-desc">Prix décroissant</option>
        </select>
        <button onClick={() => setShowFilters(!showFilters)} style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: showFilters ? C.accentBg : C.surface, color: showFilters ? C.accent : C.textSec, fontSize: 12, fontWeight: 600, cursor: "pointer", height: mob ? 42 : 48, display: "flex", alignItems: "center", gap: 5 }}>
          🎛️ Filtres {hasActiveFilters && <span style={{ width: 8, height: 8, borderRadius: 4, background: C.accent, display: "inline-block" }} />}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div style={{ padding: mob ? "12px 14px" : "16px 20px", background: C.surface, border: "1px solid " + C.borderLight, borderRadius: 16, marginBottom: 16, boxShadow: "0 2px 10px rgba(212,43,43,0.03)" }}>
          {/* Domaine */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Domaine</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {DOMAINES.map(d => {
                const dc = getDC(d);
                return <FilterPill key={d} label={d} active={selDomaine === d} onClick={() => setSelDomaine(selDomaine === d ? "" : d)} color={dc.color} bg={dc.bg} />;
              })}
            </div>
          </div>

          {/* Row: Modalité + Prise en charge */}
          <div style={{ display: "flex", gap: mob ? 0 : 24, flexDirection: mob ? "column" : "row", marginBottom: 12 }}>
            <div style={{ flex: 1, marginBottom: mob ? 12 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Modalité</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {MODALITES.map(m => <FilterPill key={m} label={m} active={selModalite === m} onClick={() => setSelModalite(selModalite === m ? "" : m)} color={C.blue} bg={C.blueBg} />)}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Prise en charge</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {PRISES.map(p => <FilterPill key={p} label={p} active={selPrise === p} onClick={() => setSelPrise(selPrise === p ? "" : p)} color={C.green} bg={C.greenBg} />)}
              </div>
            </div>
          </div>

          {/* Row: Population + Ville */}
          <div style={{ display: "flex", gap: mob ? 0 : 24, flexDirection: mob ? "column" : "row" }}>
            <div style={{ flex: 1, marginBottom: mob ? 12 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Population</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {POPULATIONS.map(p => <FilterPill key={p} label={p} active={selPop === p} onClick={() => setSelPop(selPop === p ? "" : p)} color="#E87B35" bg="rgba(232,123,53,0.08)" />)}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Ville</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {cities.slice(0, 8).map(v => <FilterPill key={v} label={"📍 " + v} active={selVille === v} onClick={() => setSelVille(selVille === v ? "" : v)} color={C.accent} bg={C.accentBg} />)}
              </div>
            </div>
          </div>

          {/* Active filters + clear */}
          {hasActiveFilters && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid " + C.borderLight }}>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {selDomaine && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: getDC(selDomaine).bg, color: getDC(selDomaine).color }}>🏷 {selDomaine} <span onClick={() => setSelDomaine("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
                {selModalite && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.blueBg, color: C.blue }}>{selModalite} <span onClick={() => setSelModalite("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
                {selPrise && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.greenBg, color: C.green }}>{selPrise} <span onClick={() => setSelPrise("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
                {selPop && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "rgba(232,123,53,0.08)", color: "#E87B35" }}>{selPop} <span onClick={() => setSelPop("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
                {selVille && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.accentBg, color: C.accent }}>📍 {selVille} <span onClick={() => setSelVille("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
              </div>
              <button onClick={clearAll} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.textTer, fontSize: 11, cursor: "pointer" }}>Tout effacer</button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      <p style={{ fontSize: mob ? 12 : 13, color: C.textTer, marginBottom: 12 }}>{filtered.length} formation{filtered.length > 1 ? "s" : ""}{hasActiveFilters ? " (filtrées)" : ""}</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.textTer }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🍿</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucune formation trouvée</p>
          <p style={{ fontSize: 13 }}>Essayez de modifier vos filtres ou votre recherche.</p>
          {hasActiveFilters && <button onClick={clearAll} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Réinitialiser les filtres</button>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: mob ? 10 : 16, paddingBottom: 40 }}>
          {filtered.map(f => <FormationCard key={f.id} f={f} mob={mob} />)}
        </div>
      )}
    </div>
  );
}

export default function CataloguePage() {
  return (<Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Chargement...</div>}><CatalogueContent /></Suspense>);
}
