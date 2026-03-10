"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { C, getDC, fetchFormations, fetchDomainesFiltres, fetchFavoris, toggleFavori, REGIONS_CITIES, type Formation, type DomaineAdmin } from "@/lib/data";
import { supabase } from "@/lib/supabase-data";
import { FormationCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";

const MODALITES = ["Présentiel", "Visio", "Mixte", "E-learning"];
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
  flex: 1, minWidth: mob ? 0 : 100, boxSizing: "border-box" as const,
});

function CatalogueContent() {
  const searchParams = useSearchParams();
  // Supports both new comma-separated params (domaines=A,B) and legacy single params (domaine=X)
  const readParam = (plural: string, singular: string) => {
    const multi = searchParams.get(plural);
    if (multi) return multi.split(",").filter(Boolean);
    const single = searchParams.get(singular);
    return single ? [single] : [];
  };
  const qParam = searchParams.get("q") || "";
  const organismeParam = searchParams.get("organisme") || "";
  const regionParam = searchParams.get("region") || "";
  const [search, setSearch] = useState(qParam);
  const [selRegion, setSelRegion] = useState(regionParam);
  const [sort, setSort] = useState("pertinence");
  const [selDomaines, setSelDomaines] = useState<string[]>(() => readParam("domaines", "domaine"));
  const [selModalites, setSelModalites] = useState<string[]>(() => readParam("modalites", "modalite"));
  const [selPrises, setSelPrises] = useState<string[]>(() => readParam("prises", "prise"));
  const [selPops, setSelPops] = useState<string[]>(() => readParam("pops", "pop"));
  const [selVilles, setSelVilles] = useState<string[]>(() => readParam("villes", "ville"));
  const addF = (arr: string[], val: string, set: (v: string[]) => void) => { if (val && !arr.includes(val)) set([...arr, val]); };
  const remF = (arr: string[], val: string, set: (v: string[]) => void) => set(arr.filter(x => x !== val));
  const mob = useIsMobile();
  const { user } = useAuth();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminVilles, setAdminVilles] = useState<string[]>([]);
  const [domainesFiltres, setDomainesFiltres] = useState<DomaineAdmin[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [favoriIds, setFavoriIds] = useState<number[]>([]);

  useEffect(() => {
    Promise.race([fetchFormations(), new Promise<Formation[]>(resolve => setTimeout(() => resolve([]), 10000))]).then(d => { setFormations(d); setLoading(false); });
    supabase.from("villes_admin").select("nom").order("nom").then(({ data }: { data: { nom: string }[] | null }) => {
      if (data && data.length > 0) setAdminVilles(data.map(v => v.nom));
    }).catch(() => {});
    fetchDomainesFiltres().then(d => { setDomainesFiltres(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) { setFavoriIds([]); return; }
    fetchFavoris(user.id).then(favs => setFavoriIds(favs.map(fv => fv.formation_id))).catch(() => {});
  }, [user]);

  const handleToggleFav = async (formationId: number) => {
    if (!user) return;
    const added = await toggleFavori(user.id, formationId);
    setFavoriIds(prev => added ? [...prev, formationId] : prev.filter(id => id !== formationId));
  };

  const cities = adminVilles;
  const hasActiveFilters = selDomaines.length > 0 || selModalites.length > 0 || selPrises.length > 0 || selPops.length > 0 || selVilles.length > 0 || !!selRegion;

  const normV = (s: string) => s.toLowerCase().replace(/-/g, " ").trim();
  let filtered = formations.filter(f => {
    if (search) {
      const q = search.toLowerCase();
      if (![f.titre, f.sous_titre || "", f.domaine, ...(f.mots_cles || []), ...(f.populations || []), ...(f.sessions || []).map(s => s.lieu)].some(s => s.toLowerCase().includes(q))) return false;
    }
    if (selVilles.length > 0) {
      const hasVisio = selVilles.includes("Visio");
      const matchesVille = (f.sessions || []).some(s => selVilles.some(v => {
        if (v === "Visio") return false;
        if (normV(s.lieu).includes(normV(v))) return true;
        const parties = (s as any).session_parties as Array<{lieu:string; ville?:string}> | null;
        return parties ? parties.some(p => normV(p.lieu || p.ville || "").includes(normV(v))) : false;
      }));
      const matchesVisio = hasVisio && (f.modalite === "Visio" || (f.sessions || []).some(s => s.lieu.toLowerCase().includes("visio")));
      if (!matchesVille && !matchesVisio) return false;
    }
    if (selDomaines.length > 0) {
      const fDomaines: string[] = (f as any).domaines?.length > 0 ? (f as any).domaines : [f.domaine];
      if (!selDomaines.some(d => fDomaines.includes(d))) return false;
    }
    if (selModalites.length > 0 && !selModalites.includes(f.modalite)) return false;
    if (selPrises.length > 0 && !selPrises.every(p => (f.prise_en_charge || []).includes(p))) return false;
    if (selPops.length > 0 && !selPops.every(p => (f.populations || []).includes(p))) return false;
    if (selRegion) {
      const regionCities = REGIONS_CITIES[selRegion] || [];
      const matches = (f.sessions || []).some(s =>
        regionCities.some(c => normV(s.lieu).includes(normV(c)))
      );
      if (!matches) return false;
    }
    if (organismeParam) {
      const orgId = Number(organismeParam);
      const matchesOrg = f.organisme_id === orgId || (f.formateur && (f.formateur as any).organisme_id === orgId);
      if (!matchesOrg) return false;
    }
    return true;
  });

  if (sort === "prix-asc") filtered = [...filtered].sort((a, b) => a.prix - b.prix);
  else if (sort === "prix-desc") filtered = [...filtered].sort((a, b) => b.prix - a.prix);
  else if (sort === "note") filtered = [...filtered].sort((a, b) => b.note - a.note);
  else if (sort === "recent") filtered = [...filtered].sort((a, b) => b.date_ajout.localeCompare(a.date_ajout));

  const clearAll = () => { setSelDomaines([]); setSelModalites([]); setSelPrises([]); setSelPops([]); setSelVilles([]); setSelRegion(""); };

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      {/* Header */}
      <div style={{ padding: "18px 0 10px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>
          {organismeParam ? `Formations de cet organisme` : selRegion ? `Formations en ${selRegion}` : selVilles.length === 1 ? `Formations à ${selVilles[0]}` : selDomaines.length === 1 ? selDomaines[0] : "Toutes les formations"} 🎬
        </h1>
        {organismeParam && <Link href="/organismes" style={{ fontSize: 12, color: C.textTer, textDecoration: "none" }}>← Retour aux organismes</Link>}
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", gap: mob ? 6 : 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: mob ? "100%" : 280, display: "flex", alignItems: "center", gap: 8, padding: mob ? "0 12px" : "0 16px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: 14, height: mob ? 44 : 50, boxShadow: "0 2px 10px rgba(212,43,43,0.04)", boxSizing: "border-box" }}>
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", fontSize: 14, order: 1 }}>✕</button>}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une formation, un mot-clé, une ville..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: mob ? 13 : 14, fontFamily: "inherit", order: 2 }} />
          <span style={{ color: C.textTer, fontSize: 16, order: 3 }}>🔍</span>
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...sel(mob), flex: "none", width: mob ? "100%" : "auto", minWidth: 140, boxSizing: "border-box" }}>
          <option value="pertinence">Pertinence</option>
          <option value="recent">Plus récentes</option>
          <option value="note">Mieux notées</option>
          <option value="prix-asc">Prix croissant</option>
          <option value="prix-desc">Prix décroissant</option>
        </select>
      </div>

      {/* Filters */}
      {mob ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: hasActiveFilters ? 8 : 16 }}>
            <button onClick={() => setShowFilterPanel(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 16px", borderRadius: 12, border: "1.5px solid " + (hasActiveFilters ? C.accent : C.border), background: hasActiveFilters ? C.accentBg : C.surface, color: hasActiveFilters ? C.accent : C.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <span>Filtres</span>
              {hasActiveFilters && <span style={{ padding: "1px 7px", borderRadius: 99, background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700 }}>{selDomaines.length + selModalites.length + selPrises.length + selPops.length + selVilles.length}</span>}
            </button>
            {hasActiveFilters && <button onClick={clearAll} style={{ padding: "11px 14px", borderRadius: 12, border: "1.5px solid " + C.accent + "33", background: C.accentBg, color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✕</button>}
          </div>

          {/* Bottom sheet overlay */}
          {showFilterPanel && (
            <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div onClick={() => setShowFilterPanel(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
              <div style={{ position: "relative", background: C.surface, borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", maxHeight: "80vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Filtres</span>
                  <button onClick={() => setShowFilterPanel(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textTer }}>✕</button>
                </div>

                {[
                  { label: "Domaine", options: (domainesFiltres.length > 0 ? domainesFiltres : [...new Set(formations.map(f => f.domaine))].map(d => ({ nom: d, emoji: DOMAINE_EMOJIS[d] || "📚" }))).map(d => d.nom), sel: selDomaines, set: setSelDomaines },
                  { label: "Modalité", options: MODALITES, sel: selModalites, set: setSelModalites },
                  { label: "Prise en charge", options: PRISES, sel: selPrises, set: setSelPrises },
                  { label: "Population", options: POPULATIONS, sel: selPops, set: setSelPops },
                  { label: "Ville", options: cities, sel: selVilles, set: setSelVilles },
                ].map(({ label, options, sel: selected, set }) => (
                  <div key={label} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {options.map(opt => {
                        const active = selected.includes(opt);
                        return (
                          <button key={opt} onClick={() => active ? remF(selected, opt, set) : addF(selected, opt, set)} style={{ padding: "7px 14px", borderRadius: 99, border: "1.5px solid " + (active ? C.accent : C.border), background: active ? C.accentBg : C.surface, color: active ? C.accent : C.textSec, fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Région</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {Object.keys(REGIONS_CITIES).map(r => (
                      <button key={r} onClick={() => setSelRegion(selRegion === r ? "" : r)} style={{ padding: "7px 14px", borderRadius: 99, border: "1.5px solid " + (selRegion === r ? C.accent : C.border), background: selRegion === r ? C.accentBg : C.surface, color: selRegion === r ? C.accent : C.textSec, fontSize: 12, fontWeight: selRegion === r ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>{r}</button>
                    ))}
                  </div>
                </div>

                <button onClick={() => { clearAll(); setShowFilterPanel(false); }} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>Réinitialiser les filtres</button>
                <button onClick={() => setShowFilterPanel(false)} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 10 }}>Voir les {filtered.length} résultats</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: "flex", gap: 8, marginBottom: hasActiveFilters ? 8 : 16, flexWrap: "wrap" }}>
          <select value="" onChange={e => addF(selDomaines, e.target.value, setSelDomaines)} style={sel(false)}>
            <option value="">Domaine</option>
            {(domainesFiltres.length > 0 ? domainesFiltres :
              [...new Set(formations.map(f => f.domaine))].map(d => ({ id: 0, nom: d, emoji: DOMAINE_EMOJIS[d] || "📚", afficher_sur_accueil: true, ordre_affichage: 0, afficher_dans_filtres: true }))
            ).filter(d => !selDomaines.includes(d.nom)).map(d => <option key={d.nom} value={d.nom}>{d.nom}</option>)}
          </select>
          <select value="" onChange={e => addF(selModalites, e.target.value, setSelModalites)} style={sel(false)}>
            <option value="">Modalité</option>
            {MODALITES.filter(m => !selModalites.includes(m)).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value="" onChange={e => addF(selPrises, e.target.value, setSelPrises)} style={sel(false)}>
            <option value="">Prise en charge</option>
            {PRISES.filter(p => !selPrises.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value="" onChange={e => addF(selPops, e.target.value, setSelPops)} style={sel(false)}>
            <option value="">Population</option>
            {POPULATIONS.filter(p => !selPops.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value="" onChange={e => addF(selVilles, e.target.value, setSelVilles)} style={sel(false)}>
            <option value="">Ville</option>
            {cities.filter(v => !selVilles.includes(v)).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={selRegion} onChange={e => setSelRegion(e.target.value)} style={sel(false)}>
            <option value="">Région</option>
            {Object.keys(REGIONS_CITIES).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {hasActiveFilters && (
            <button onClick={clearAll} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid " + C.accent + "33", background: C.accentBg, color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✕ Effacer</button>
          )}
        </div>
      )}

      {/* Active filter tags */}
      {hasActiveFilters && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
          {selDomaines.map(d => <span key={d} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: getDC(d).bg, color: getDC(d).color }}>{d} <span onClick={() => remF(selDomaines, d, setSelDomaines)} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>)}
          {selModalites.map(m => <span key={m} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.blueBg, color: C.blue }}>{m} <span onClick={() => remF(selModalites, m, setSelModalites)} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>)}
          {selPrises.map(p => <span key={p} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.greenBg, color: C.green }}>{p} <span onClick={() => remF(selPrises, p, setSelPrises)} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>)}
          {selPops.map(p => <span key={p} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "rgba(232,123,53,0.08)", color: "#E87B35" }}>{p} <span onClick={() => remF(selPops, p, setSelPops)} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>)}
          {selVilles.map(v => <span key={v} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.accentBg, color: C.accent }}>📍 {v} <span onClick={() => remF(selVilles, v, setSelVilles)} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>)}
          {selRegion && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.blueBg, color: C.blue }}>🗺️ {selRegion} <span onClick={() => setSelRegion("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
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
          {filtered.map(f => <FormationCard key={f.id} f={f} mob={mob} favori={favoriIds.includes(f.id)} onToggleFav={user ? () => handleToggleFav(f.id) : undefined} />)}
        </div>
      )}
    </div>
  );
}

export default function CataloguePage() {
  return (<Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Chargement...</div>}><CatalogueContent /></Suspense>);
}
