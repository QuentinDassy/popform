"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { C, getDC, fetchFormations, fetchDomainesFiltres, getAllCitiesFromFormations, type Formation, type DomaineAdmin } from "@/lib/data";
import { supabase } from "@/lib/supabase-data";
import { FormationCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";

const MODALITES = ["Présentiel", "Visio", "Mixte"];
const PRISES = ["DPC", "FIF-PL"];
const POPULATIONS = ["Enfant", "Adolescent", "Adulte", "Senior"];

// Fallback emojis for domaines
const DOMAINE_EMOJIS: Record<string, string> = {
  "Langage oral": "🗣️",
  "Langage écrit": "📝",
  "Neurologie": "🧠",
  "OMF": "👄",
  "Cognition mathématique": "🔢",
  "Pratique professionnelle": "📚",
};

const sel = (mob: boolean): React.CSSProperties => ({
  padding: mob ? "9px 28px 9px 12px" : "10px 32px 10px 14px",
  borderRadius: 10, border: "1.5px solid " + C.border,
  background: C.surface, color: C.text, fontSize: mob ? 11 : 13, fontFamily: "inherit",
  outline: "none", cursor: "pointer", appearance: "none" as const,
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6' fill='%23A48C6A'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
  flex: 1, minWidth: mob ? 0 : 100,
});

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
  const mob = useIsMobile();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminVilles, setAdminVilles] = useState<string[]>([]);
  const [domainesFiltres, setDomainesFiltres] = useState<DomaineAdmin[]>([]);

  useEffect(() => {
    fetchFormations().then(d => { setFormations(d); setLoading(false); });
    supabase.from("villes_admin").select("nom").order("nom").then(({ data }: { data: { nom: string }[] | null }) => {
      if (data && data.length > 0) setAdminVilles(data.map(v => v.nom));
    }).catch(() => {});
    // Load domaines from admin
    fetchDomainesFiltres().then(d => {
      setDomainesFiltres(d);
    }).catch(() => {});
  }, []);

  const formationCities = useMemo(() => getAllCitiesFromFormations(formations).map(([c]) => c), [formations]);
  const cities = adminVilles; // Only show admin-defined villes
  const hasActiveFilters = selDomaine || selModalite || selPrise || selPop || selVille;

  let filtered = formations.filter(f => {
    if (search) {
      const q = search.toLowerCase();
      if (![f.titre, f.sous_titre || "", f.domaine, ...(f.mots_cles || []), ...(f.populations || []), ...(f.sessions || []).map(s => s.lieu)].some(s => s.toLowerCase().includes(q))) return false;
    }
    if (selVille) {
      const isVisioFilter = selVille.toLowerCase() === "visio";
      const matchesVille = (f.sessions || []).some(s => s.lieu.toLowerCase().includes(selVille.toLowerCase()));
      const matchesVisioModalite = isVisioFilter && f.modalite === "Visio";
      if (!matchesVille && !matchesVisioModalite) return false;
    }
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
      <div style={{ display: "flex", gap: mob ? 6 : 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: mob ? "100%" : 280, display: "flex", alignItems: "center", gap: 8, padding: mob ? "0 12px" : "0 16px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: 14, height: mob ? 44 : 50, boxShadow: "0 2px 10px rgba(212,43,43,0.04)" }}>
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", fontSize: 14, order: 1 }}>✕</button>}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une formation, un mot-clé, une ville..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: mob ? 13 : 14, fontFamily: "inherit", order: 2 }} />
          <span style={{ color: C.textTer, fontSize: 16, order: 3 }}>🔍</span>
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...sel(mob), flex: "none", width: mob ? "100%" : "auto", minWidth: 140 }}>
          <option value="pertinence">Pertinence</option>
          <option value="recent">Plus récentes</option>
          <option value="note">Mieux notées</option>
          <option value="prix-asc">Prix croissant</option>
          <option value="prix-desc">Prix décroissant</option>
        </select>
      </div>

      {/* Filters — same select system as homepage */}
      <div style={{ display: "flex", gap: mob ? 6 : 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={selDomaine} onChange={e => setSelDomaine(e.target.value)} style={sel(mob)}>
          <option value="">Domaine</option>
          {/* Use domaines from admin if available, fallback to formations domaines */}
          {(domainesFiltres.length > 0 ? domainesFiltres : 
            [...new Set(formations.map(f => f.domaine))].map(d => ({ id: 0, nom: d, emoji: DOMAINE_EMOJIS[d] || "📚", afficher_sur_accueil: true, ordre_affichage: 0, afficher_dans_filtres: true }))
          ).map(d => <option key={d.nom} value={d.nom}>{d.emoji} {d.nom}</option>)}
        </select>
        <select value={selModalite} onChange={e => setSelModalite(e.target.value)} style={sel(mob)}>
          <option value="">Modalité</option>
          {MODALITES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={selPrise} onChange={e => setSelPrise(e.target.value)} style={sel(mob)}>
          <option value="">Prise en charge</option>
          {PRISES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={selPop} onChange={e => setSelPop(e.target.value)} style={sel(mob)}>
          <option value="">Population</option>
          {POPULATIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={selVille} onChange={e => setSelVille(e.target.value)} style={sel(mob)}>
          <option value="">Ville</option>
          <option value="Visio">💻 En visio</option>
          {cities.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {hasActiveFilters && (
          <button onClick={clearAll} style={{ padding: mob ? "9px 12px" : "10px 16px", borderRadius: 10, border: "1.5px solid " + C.accent + "33", background: C.accentBg, color: C.accent, fontSize: mob ? 11 : 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✕ Effacer</button>
        )}
      </div>

      {/* Active filter tags */}
      {hasActiveFilters && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
          {selDomaine && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: getDC(selDomaine).bg, color: getDC(selDomaine).color }}>{selDomaine} <span onClick={() => setSelDomaine("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
          {selModalite && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.blueBg, color: C.blue }}>{selModalite} <span onClick={() => setSelModalite("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
          {selPrise && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.greenBg, color: C.green }}>{selPrise} <span onClick={() => setSelPrise("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
          {selPop && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "rgba(232,123,53,0.08)", color: "#E87B35" }}>{selPop} <span onClick={() => setSelPop("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
          {selVille && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.accentBg, color: C.accent }}>📍 {selVille} <span onClick={() => setSelVille("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
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
          {hasActiveFilters && <button onClick={clearAll} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Réinitialiser les filtres</button>}
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
