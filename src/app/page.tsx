"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, getDC, getAllCitiesFromFormations, fetchFormations, fetchDomainesAccueil, fetchDomainesFiltres, fetchFavoris, toggleFavori, REGIONS_CITIES, FRENCH_REGIONS, DOM_REGIONS_LIST, type Formation, type DomaineAdmin } from "@/lib/data";
import { FormationCard, CityCard } from "@/components/ui";
import FranceMap from "@/components/FranceMap";
import { useIsMobile } from "@/lib/hooks";
import { supabase } from "@/lib/supabase-data";
import { useAuth } from "@/lib/auth-context";

function useTyping(words: string[]) {
  const [d, setD] = useState("");
  const [wi, setWi] = useState(0);
  const [ci, setCi] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const w = words[wi]; let t: NodeJS.Timeout;
    if (!del && ci < w.length) t = setTimeout(() => { setD(w.slice(0, ci + 1)); setCi(ci + 1) }, 80);
    else if (!del && ci === w.length) t = setTimeout(() => setDel(true), 2000);
    else if (del && ci > 0) t = setTimeout(() => { setD(w.slice(0, ci - 1)); setCi(ci - 1) }, 40);
    else { setDel(false); setWi((wi + 1) % words.length) }
    return () => clearTimeout(t);
  }, [ci, del, wi, words]);
  return d;
}

const MODALITES = ["Présentiel", "Visio", "Mixte", "E-learning"];
const PRISES = ["DPC", "FIF-PL"];
const POPULATIONS = ["Nourrisson/bébé", "Enfant", "Adolescent", "Adulte", "Senior"];

// Domaine emoji mapping (fallback if emoji not set in admin)
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
  flex: 1, minWidth: mob ? 0 : 120,
});

function SectionGrid({ title, formations, mob, max, link, favoriIds, onToggleFav, alt }: { title: string; formations: Formation[]; mob: boolean; max?: number; link?: string; favoriIds?: number[]; onToggleFav?: (id: number) => void; alt?: boolean }) {
  const show = formations.slice(0, max || (mob ? 4 : 8));
  return (
    <div style={{ background: alt ? "#FFF8EC" : "#FFFFFF", borderTop: mob ? "5px solid #F0E4CC" : "1px solid #F0E4CC" }}>
    <section style={{ padding: mob ? "20px 16px 16px" : "36px 40px 20px", maxWidth: 1240, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mob ? 12 : 16 }}>
        <h2 style={{ fontSize: mob ? 18 : 24, fontWeight: 800, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
          {mob && <span style={{ display: "inline-block", width: 4, height: 20, borderRadius: 3, background: C.gradient, flexShrink: 0 }} />}
          {title}
        </h2>
        <Link href={link || "/catalogue"} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>Voir tout →</Link>
      </div>
      {show.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(300px,100%),1fr))", gap: mob ? 12 : 16 }}>
          {show.map(f => <FormationCard key={f.id} f={f} mob={mob} favori={favoriIds?.includes(f.id)} onToggleFav={onToggleFav ? () => onToggleFav(f.id) : undefined} />)}
        </div>
      ) : (
        <p style={{ textAlign: "center", color: C.textTer, fontSize: 13, padding: "20px 0" }}>Prochainement…</p>
      )}
    </section>
    </div>
  );
}

export default function HomePage() {
  const mob = useIsMobile();
  const router = useRouter();
  const { user } = useAuth();
  const [favoriIds, setFavoriIds] = useState<number[]>([]);
  const typed = useTyping(["langage oral", "dyspraxie", "EBP", "Marseille", "bégaiement", "cognition", "Paris"]);
  const [nlEmail, setNlEmail] = useState("");
  const [nlSent, setNlSent] = useState(false);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [webinaires, setWebinaires] = useState<any[]>([]);
  const [congres, setCongres] = useState<any[]>([]);
  const [adminVilles, setAdminVilles] = useState<{ nom: string; image: string }[]>([]);
  const [domainesAccueil, setDomainesAccueil] = useState<DomaineAdmin[]>([]);
  const [domainesFiltres, setDomainesFiltres] = useState<DomaineAdmin[]>([]);
  const [heroSearch, setHeroSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selDomaines, setSelDomaines] = useState<string[]>([]);
  const [selModalites, setSelModalites] = useState<string[]>([]);
  const [selPrises, setSelPrises] = useState<string[]>([]);
  const [selPops, setSelPops] = useState<string[]>([]);
  const [selVilles, setSelVilles] = useState<string[]>([]);
  const [selRegion, setSelRegion] = useState<string>("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [featTab, setFeatTab] = useState<"ortho" | "pro">("ortho");
  const addF = (arr: string[], val: string, set: (v: string[]) => void) => { if (val && !arr.includes(val)) set([...arr, val]); };
  const remF = (arr: string[], val: string, set: (v: string[]) => void) => set(arr.filter(x => x !== val));
  const [searchSuggestions, setSearchSuggestions] = useState<Formation[]>([]);
  const [searchTotalFormations, setSearchTotalFormations] = useState(0);
  const [searchFmtResults, setSearchFmtResults] = useState<{id: number, nom: string}[]>([]);
  const [searchVilleResults, setSearchVilleResults] = useState<string[]>([]);
  const [searchDomaineResults, setSearchDomaineResults] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allFormateurs, setAllFormateurs] = useState<{id: number, nom: string}[]>([]);

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const randomSample = <T,>(arr: T[], n: number): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy.slice(0, n);
  };

  const handleSearch = () => {
    setShowSuggestions(false);
    const p = new URLSearchParams();
    if (heroSearch) p.set("q", heroSearch);
    if (selDomaines.length > 0) p.set("domaines", selDomaines.join(","));
    if (selModalites.length > 0) p.set("modalites", selModalites.join(","));
    if (selPrises.length > 0) p.set("prises", selPrises.join(","));
    if (selPops.length > 0) p.set("pops", selPops.join(","));
    if (selVilles.length > 0) p.set("villes", selVilles.join(","));
    if (selRegion) p.set("region", selRegion);
    router.push("/catalogue?" + p.toString());
  };

  const handleSearchInput = (val: string) => {
    setHeroSearch(val);
    if (val.length >= 2) {
      const q = normalize(val);
      const allFormationsMatch = formations.filter(f =>
        normalize(f.titre).includes(q) ||
        normalize(f.domaine).includes(q) ||
        (f.mots_cles || []).some((m: string) => normalize(m).includes(q)) ||
        (f.sessions || []).some(s => normalize(s.lieu).includes(q))
      );
      const matchedFormations = allFormationsMatch.slice(0, 10);
      setSearchTotalFormations(allFormationsMatch.length);
      const matchedFmts = allFormateurs.filter(f => normalize(f.nom).includes(q)).slice(0, 3);
      const matchedVilles = adminVilles.filter(v => normalize(v.nom).includes(q)).slice(0, 3).map(v => v.nom);
      const matchedDomaines = (domainesFiltres.length > 0 ? domainesFiltres.map(d => d.nom) : [...new Set(formations.map(f => f.domaine))]).filter(d => normalize(d).includes(q)).slice(0, 3);
      setSearchSuggestions(matchedFormations);
      setSearchFmtResults(matchedFmts);
      setSearchVilleResults(matchedVilles);
      setSearchDomaineResults(matchedDomaines);
      setShowSuggestions(matchedFormations.length > 0 || matchedFmts.length > 0 || matchedVilles.length > 0 || matchedDomaines.length > 0);
    } else {
      setSearchSuggestions([]);
      setSearchFmtResults([]);
      setSearchVilleResults([]);
      setSearchDomaineResults([]);
      setShowSuggestions(false);
    }
  };

  // Detect auth code in URL (email confirm or password reset) and redirect
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setRedirecting(true);
      window.location.href = "/auth/callback?code=" + code + "&type=" + (params.get("type") || "");
      // Unblock if redirect doesn't happen within 3s
      setTimeout(() => setRedirecting(false), 3000);
    }
  }, []);

  useEffect(() => {
    if (!redirecting) {
      // Load all data in parallel with timeout
      const loadData = async () => {
        try {
          // Load formations (most important) — 10s safety timeout
          const formationsData = await Promise.race([
            fetchFormations(),
            new Promise<Formation[]>(resolve => setTimeout(() => resolve([]), 10000)),
          ]);
          const shuffled = [...formationsData]; for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
          setFormations(shuffled);
        } catch (e) {
          console.error("Error loading formations:", e);
        } finally {
          setLoading(false); // Always stop loading
        }
        
        // Load other data (non-blocking)
        try {
          const domainesData = await fetchDomainesAccueil();
          setDomainesAccueil(domainesData);
        } catch (e) {
          console.log("domaines_admin table may not exist yet");
        }
        
        try {
          const filtresData = await fetchDomainesFiltres();
          setDomainesFiltres(filtresData);
        } catch (e) {
          console.log("domaines_admin table may not exist yet");
        }
        
        try {
          const { data: wbs } = await supabase.from("webinaires").select("*").eq("status", "publie").order("date_heure", { ascending: true });
          if (wbs) setWebinaires(wbs);
        } catch (e) {}
        
        try {
          const { data: cgs } = await supabase.from("congres").select("*, organisme:organismes(nom), speakers:congres_speakers(nom,titre_intervention)").eq("status", "publie").order("date", { ascending: true });
          if (cgs) setCongres(cgs.filter((c: any) => new Date(c.date) >= new Date()));
        } catch (e) {}
        
        try {
          const { data: villes } = await supabase.from("villes_admin").select("*").order("nom");
          if (villes) setAdminVilles(villes.map((v: Record<string, string>) => ({ nom: v.nom, image: v.image || "" })));
        } catch (e) {}

        try {
          const { data: fmts } = await supabase.from("formateurs").select("id, nom");
          if (fmts) setAllFormateurs(fmts);
        } catch (e) {}
      };
      
      loadData();
    }
  }, [redirecting]);

  useEffect(() => {
    if (!user) { setFavoriIds([]); return; }
    fetchFavoris(user.id).then(favs => setFavoriIds(favs.map(fv => fv.formation_id))).catch(() => {});
  }, [user]);

  const handleToggleFav = async (formationId: number) => {
    if (!user) return;
    const added = await toggleFavori(user.id, formationId);
    setFavoriIds(prev => added ? [...prev, formationId] : prev.filter(id => id !== formationId));
  };

  const formationCities = getAllCitiesFromFormations(formations);
  // If admin configured villes, use those; otherwise fall back to formation cities
  const normCity = (s: string) => s.toLowerCase().replace(/-/g, " ").trim();
  const displayCities: { name: string; count: number; image?: string }[] = adminVilles.length > 0
    ? adminVilles.map(v => {
        const nv = normCity(v.nom);
        const count = formationCities
          .filter(([c]) => { const nc = normCity(c); return nc === nv || nc.startsWith(nv + " "); })
          .reduce((sum, [, n]) => sum + n, 0);
        return { name: v.nom, count, image: v.image || undefined };
      })
    : formationCities.slice(0, 8).map(([c, n]) => ({ name: c, count: n }));
  const topCities = [...displayCities].sort((a, b) => b.count - a.count).slice(0, 6);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const newF = formations.filter(f => f.is_new);
  const popularF = [...formations].sort((a, b) => b.note - a.note).slice(0, 8);
  const visioF = formations.filter(f => f.modalite === "Visio" || (f.sessions || []).some(s => s.lieu === "Visio"));
  const hasFilters = selDomaines.length > 0 || selModalites.length > 0 || selPrises.length > 0 || selPops.length > 0 || selVilles.length > 0 || !!selRegion;
  const clearAll = () => { setSelDomaines([]); setSelModalites([]); setSelPrises([]); setSelPops([]); setSelVilles([]); setSelRegion(""); };

  if (redirecting) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  return (
    <>
      {/* ===== HERO ===== */}
      <section style={{ position: "relative", padding: mob ? "36px 16px 32px" : "70px 40px 56px", background: C.gradientHero }}>
        <div style={{ position: "absolute", top: -100, left: -60, width: 400, height: 400, background: "radial-gradient(circle, rgba(212,43,43,0.08), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, right: -40, width: 350, height: 350, background: "radial-gradient(circle, rgba(245,183,49,0.06), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", textAlign: "center", maxWidth: 740, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(24px,5.5vw,46px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 12, color: C.text }}>
            Toutes les formations pour orthophonistes,<br />
            <span style={{ background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>au même endroit.</span>
          </h1>
          <p style={{ fontSize: "clamp(12px,2vw,15px)", color: C.textSec, maxWidth: 460, margin: "0 auto 28px", lineHeight: 1.6 }}>Trouvez la formation qu&apos;il vous faut parmi <strong style={{ color: C.accent }}>{formations.length > 0 ? formations.length : "…"}</strong> formations.</p>

          {/* Search bar — bigger */}
          <div onClick={() => !searchFocused && document.getElementById("hero-search")?.focus()} style={{ maxWidth: mob ? "100%" : 600, margin: "0 auto", cursor: "text" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: mob ? "5px 5px 5px 14px" : "6px 6px 6px 20px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: mob ? 12 : 16, boxShadow: "0 8px 36px rgba(212,43,43,0.07)", position: "relative" }}>
              <span style={{ color: C.textTer, fontSize: mob ? 16 : 18 }}>🔍</span>
              <div style={{ flex: 1, position: "relative", padding: mob ? "9px 0" : "12px 0" }}>
                <input id="hero-search" value={heroSearch} onChange={e => handleSearchInput(e.target.value)} onFocus={() => { setSearchFocused(true); if (!heroSearch) { const sugVilles = randomSample(adminVilles.map(v => v.nom), 3); const domNames = domainesFiltres.length > 0 ? domainesFiltres.map(d => d.nom) : [...new Set(formations.map(f => f.domaine))]; const sugDomaines = randomSample(domNames, 3); const sugFmts = randomSample(allFormateurs, 2); setSearchVilleResults(sugVilles); setSearchDomaineResults(sugDomaines); setSearchFmtResults(sugFmts); setSearchSuggestions([]); setShowSuggestions(sugVilles.length > 0 || sugDomaines.length > 0 || sugFmts.length > 0); } }} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="" style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: 16, fontFamily: "inherit" }} />
                {!heroSearch && !searchFocused && <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", color: C.textTer, fontSize: mob ? 13 : 16, pointerEvents: "none" }}>{typed}<span style={{ color: C.accent }}>|</span></div>}
              </div>
              <div onClick={handleSearch} style={{ padding: mob ? "10px 16px" : "13px 26px", borderRadius: mob ? 9 : 12, background: C.gradient, color: "#fff", fontSize: mob ? 12 : 14, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer" }}>Rechercher</div>
            </div>
            {/* Autocomplete suggestions */}
            {showSuggestions && (
              <div style={{ position: "absolute", left: 0, right: 0, marginTop: 6, background: C.surface, border: "1.5px solid " + C.border, borderRadius: 14, boxShadow: "0 8px 32px rgba(45,27,6,0.12)", zIndex: 100, maxWidth: mob ? "100%" : 600, marginLeft: "auto", marginRight: "auto", maxHeight: 400, overflowY: "auto" }}>
                {searchFmtResults.length > 0 && (
                  <>
                    <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: 0.5 }}>Formateurs</div>
                    {searchFmtResults.map(f => (
                      <div key={f.id} onMouseDown={() => { router.push("/formateurs?id=" + f.id); setShowSuggestions(false); }} style={{ padding: "9px 16px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid " + C.borderLight + "66" }}>
                        <span style={{ fontSize: 15 }}>🎤</span>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{f.nom}</span>
                      </div>
                    ))}
                  </>
                )}
                {searchVilleResults.length > 0 && (
                  <>
                    <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: 0.5 }}>Villes</div>
                    {searchVilleResults.map(v => (
                      <div key={v} onMouseDown={() => { router.push("/catalogue?villes=" + encodeURIComponent(v)); setShowSuggestions(false); }} style={{ padding: "9px 16px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid " + C.borderLight + "66" }}>
                        <span style={{ fontSize: 15 }}>📍</span>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </>
                )}
                {searchDomaineResults.length > 0 && (
                  <>
                    <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: 0.5 }}>Domaines</div>
                    {searchDomaineResults.map(d => (
                      <div key={d} onMouseDown={() => { router.push("/catalogue?domaines=" + encodeURIComponent(d)); setShowSuggestions(false); }} style={{ padding: "9px 16px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid " + C.borderLight + "66" }}>
                        <span style={{ fontSize: 15 }}>📚</span>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{d}</span>
                      </div>
                    ))}
                  </>
                )}
                {searchSuggestions.length > 0 && (
                  <>
                    <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: 0.5 }}>Formations</div>
                    {searchSuggestions.map(f => (
                      <div key={f.id} onMouseDown={() => { router.push("/formation/" + f.id); setShowSuggestions(false); }} style={{ padding: "9px 16px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid " + C.borderLight + "66" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: C.accentBg, color: C.accent, fontWeight: 600, flexShrink: 0 }}>{f.domaine}</span>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 600, flex: 1 }}>{f.titre}</span>
                        {(f.sessions || []).length > 0 && <span style={{ fontSize: 11, color: C.textTer, flexShrink: 0 }}>📍 {f.sessions?.[0]?.lieu}</span>}
                      </div>
                    ))}
                    {searchTotalFormations > 10 && (
                      <div onMouseDown={() => { handleSearch(); }} style={{ padding: "8px 16px", cursor: "pointer", fontSize: 12, color: C.accent, fontWeight: 700, borderTop: "1px solid " + C.borderLight }}>
                        Voir toutes les formations ({searchTotalFormations}) →
                      </div>
                    )}
                  </>
                )}
                {heroSearch.length >= 2 && (
                  <div onMouseDown={() => { handleSearch(); }} style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid " + C.borderLight }}>
                    <span style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>Voir tous les résultats dans le catalogue →</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter selects — multi-select cumulative */}
          {mob ? (
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowFilterPanel(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 16px", borderRadius: 12, border: "1.5px solid " + (hasFilters ? C.accent : C.border), background: hasFilters ? C.accentBg : C.surface, color: hasFilters ? C.accent : C.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <span>Filtres</span>
                {hasFilters && <span style={{ padding: "1px 7px", borderRadius: 99, background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700 }}>{selDomaines.length + selModalites.length + selPrises.length + selPops.length + selVilles.length + (selRegion ? 1 : 0)}</span>}
              </button>
              <button onClick={handleSearch} style={{ padding: "11px 16px", borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>🔍</button>
              {hasFilters && <button onClick={clearAll} style={{ padding: "11px 14px", borderRadius: 12, border: "1.5px solid " + C.accent + "33", background: C.accentBg, color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✕</button>}

              {showFilterPanel && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div onClick={() => setShowFilterPanel(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
                  <div style={{ position: "relative", background: C.surface, borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", maxHeight: "80vh", overflowY: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Filtres</span>
                      <button onClick={() => setShowFilterPanel(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textTer }}>✕</button>
                    </div>
                    {[
                      { label: "Domaine", options: (domainesFiltres.length > 0 ? domainesFiltres : [...new Set(formations.map(f => f.domaine))].map(d => ({ nom: d }))).map(d => d.nom), sel: selDomaines, set: setSelDomaines },
                      { label: "Modalité", options: MODALITES, sel: selModalites, set: setSelModalites },
                      { label: "Prise en charge", options: PRISES, sel: selPrises, set: setSelPrises },
                      { label: "Population", options: POPULATIONS, sel: selPops, set: setSelPops },
                      { label: "Ville", options: adminVilles.map(v => v.nom), sel: selVilles, set: setSelVilles },
                      { label: "Région", options: [...FRENCH_REGIONS.filter(r => !DOM_REGIONS_LIST.includes(r)), ...DOM_REGIONS_LIST, "Belgique"], sel: selRegion ? [selRegion] : [], set: (v: string[]) => setSelRegion(v[v.length - 1] || "") },
                    ].map(({ label, options, sel: selected, set }) => (
                      <div key={label} style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {options.map(opt => {
                            const active = selected.includes(opt);
                            return <button key={opt} onClick={() => active ? remF(selected, opt, set) : addF(selected, opt, set)} style={{ padding: "7px 14px", borderRadius: 99, border: "1.5px solid " + (active ? C.accent : C.border), background: active ? C.accentBg : C.surface, color: active ? C.accent : C.textSec, fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>{opt}</button>;
                          })}
                        </div>
                      </div>
                    ))}
                    <button onClick={() => { clearAll(); setShowFilterPanel(false); }} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>Réinitialiser</button>
                    <button onClick={() => { setShowFilterPanel(false); handleSearch(); }} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 10 }}>Rechercher</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 18, maxWidth: 600, marginLeft: "auto", marginRight: "auto", flexWrap: "wrap" }}>
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
                {adminVilles.filter(v => !selVilles.includes(v.nom)).map(v => <option key={v.nom} value={v.nom}>{v.nom}</option>)}
              </select>
              <select value={selRegion} onChange={e => setSelRegion(e.target.value)} style={sel(false)}>
                <option value="">Région</option>
                <optgroup label="France métropolitaine">
                  {FRENCH_REGIONS.filter(r => !DOM_REGIONS_LIST.includes(r)).map(r => <option key={r} value={r}>{r}</option>)}
                </optgroup>
                <optgroup label="DROM">
                  {DOM_REGIONS_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                </optgroup>
                <optgroup label="─────────────">
                  <option value="Belgique">Belgique</option>
                </optgroup>
              </select>
              {hasFilters && <button onClick={clearAll} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid " + C.accent + "33", background: C.accentBg, color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✕</button>}
              <button onClick={handleSearch} title="Lancer la recherche avec les filtres" style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.gradient, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>🔍</button>
            </div>
          )}
          {/* Tags filtres actifs */}
          {hasFilters && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10, justifyContent: "center" }}>
              {selRegion && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.accentBg, color: C.accent }}>🗺️ {selRegion} <span onClick={() => setSelRegion("")} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>}
              {selDomaines.map(d => <span key={d} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: getDC(d).bg, color: getDC(d).color }}>{d} <span onClick={() => remF(selDomaines, d, setSelDomaines)} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>)}
              {selModalites.map(m => <span key={m} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.blueBg, color: C.blue }}>{m} <span onClick={() => remF(selModalites, m, setSelModalites)} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>)}
              {selPrises.map(p => <span key={p} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.greenBg, color: C.green }}>{p} <span onClick={() => remF(selPrises, p, setSelPrises)} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>)}
              {selPops.map(p => <span key={p} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "rgba(232,123,53,0.08)", color: "#E87B35" }}>{p} <span onClick={() => remF(selPops, p, setSelPops)} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>)}
              {selVilles.map(v => <span key={v} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.accentBg, color: C.accent }}>📍 {v} <span onClick={() => remF(selVilles, v, setSelVilles)} style={{ cursor: "pointer", marginLeft: 4 }}>✕</span></span>)}
            </div>
          )}
        </div>
      </section>


      {/* ===== FONCTIONNALITÉS ===== */}
      <section style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "24px 16px 32px" : "36px 40px 48px" }}>
        {/* Toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: mob ? 14 : 18, background: C.bgAlt, borderRadius: 12, padding: 4, width: "fit-content" }}>
          {([["ortho", "👩‍⚕️ Orthophonistes"], ["pro", "🏢 Formateurs & organismes"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFeatTab(key)} style={{ padding: mob ? "7px 14px" : "8px 18px", borderRadius: 9, border: "none", background: featTab === key ? C.surface : "transparent", color: featTab === key ? C.text : C.textSec, fontSize: mob ? 12 : 13, fontWeight: featTab === key ? 700 : 500, cursor: "pointer", boxShadow: featTab === key ? "0 1px 4px rgba(45,27,6,0.08)" : "none", transition: "all 0.15s", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {label}
            </button>
          ))}
        </div>
        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: mob ? 10 : 16 }}>
          {(featTab === "ortho" ? [
            { icon: "❤️", title: "Favoris", desc: "Sauvegardez les formations qui vous intéressent en un clic" },
            { icon: "📋", title: "Mes inscriptions", desc: "Retrouvez toutes vos formations au même endroit, sans chercher" },
            { icon: "📅", title: "Calendrier", desc: "Visualisez vos sessions à venir sur un calendrier personnel" },
            { icon: "⭐", title: "Avis vérifiés", desc: "Déposez et consultez des retours d'expérience honnêtes" },
          ] : [
            { icon: "📣", title: "Visibilité", desc: "Touchez des milliers d'orthophonistes qui cherchent activement à se former" },
            { icon: "🔍", title: "Référencement", desc: "Vos formations apparaissent dans les recherches par domaine, ville et modalité" },
            { icon: "🗂️", title: "Gestion simple", desc: "Créez et modifiez vos formations en quelques minutes depuis votre dashboard" },
            { icon: "👥", title: "Vos formateurs", desc: "Centralisez tous vos formateurs et leurs formations au sein d'un seul espace" },
          ]).map(({ icon, title, desc }) => (
            <div key={title} style={{ background: C.surface, border: "1.5px solid " + C.borderLight, borderRadius: 16, padding: mob ? "16px 14px" : "20px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: mob ? 24 : 28 }}>{icon}</span>
              <div style={{ fontSize: mob ? 13 : 14, fontWeight: 800, color: C.text }}>{title}</div>
              <div style={{ fontSize: mob ? 11 : 12, color: C.textSec, lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SECTIONS ===== */}
      {!loading && domainesAccueil.length > 0 ? (
        domainesAccueil.map((domaine, di) => {
          const domaineFormations = formations.filter(f => f.domaine === domaine.nom);
          return (
            <SectionGrid
              key={domaine.id}
              title={domaine.nom}
              formations={domaineFormations}
              mob={mob}
              max={3}
              link={`/catalogue?domaine=${encodeURIComponent(domaine.nom)}`}
              favoriIds={favoriIds}
              onToggleFav={user ? handleToggleFav : undefined}
              alt={di % 2 === 0}
            />
          );
        })
      ) : !loading ? (
        <>
          {formations.filter(f => f.domaine === "Langage oral").length > 0 && (
            <SectionGrid title="Langage oral" formations={formations.filter(f => f.domaine === "Langage oral")} mob={mob} max={3} favoriIds={favoriIds} onToggleFav={user ? handleToggleFav : undefined} alt />
          )}
          {formations.filter(f => f.domaine === "Neurologie").length > 0 && (
            <SectionGrid title="Neurologie" formations={formations.filter(f => f.domaine === "Neurologie")} mob={mob} max={3} favoriIds={favoriIds} onToggleFav={user ? handleToggleFav : undefined} />
          )}
        </>
      ) : null}
      {!loading && visioF.length > 0 && <SectionGrid title="En visio" formations={visioF} mob={mob} max={3} link="/catalogue?modalite=Visio" favoriIds={favoriIds} onToggleFav={user ? handleToggleFav : undefined} alt />}

      {/* ===== VILLES ===== */}
      {topCities.length > 0 && (
        <div style={{ borderTop: "1px solid #F0E4CC" }}>
        <section style={{ padding: mob ? "28px 16px 28px" : "36px 40px 40px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: mob ? 14 : 20 }}>
            <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text }}>Par ville 📍</h2>
            <Link href="/villes" style={{ fontSize: 13, color: C.textTer, textDecoration: "none", fontWeight: 600 }}>Voir toutes les villes →</Link>
          </div>
          {mob ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {topCities.map(c => (
                <CityCard key={c.name} city={c.name} count={c.count} mob image={c.image} />
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, 1fr)" }}>
              {topCities.map(c => (
                <div key={c.name} style={{ height: 170 }}>
                  <CityCard city={c.name} count={c.count} image={c.image} />
                </div>
              ))}
            </div>
          )}
        </section>
        </div>
      )}

      {/* ===== CARTE REGIONS ===== */}
      <div style={{ borderTop: "1px solid #F0E4CC", background: "#FFF8EC" }}>
      <section style={{ padding: mob ? "28px 16px 32px" : "36px 40px 44px", maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: mob ? 14 : 20 }}>
          <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text }}>Par région 🗺️</h2>
          <Link href="/villes" style={{ fontSize: 13, color: C.textTer, textDecoration: "none", fontWeight: 600 }}>Voir la carte →</Link>
        </div>
        <div style={{ maxWidth: mob ? "100%" : 540, margin: "0 auto" }}>
          <FranceMap formations={formations} />
        </div>
      </section>
      </div>

{/* ===== CTA ===== */}
      <div style={{ textAlign: "center", padding: mob ? "24px 16px 28px" : "36px 40px 44px" }}>
        <Link href="/catalogue" style={{ textDecoration: "none" }}><div style={{ display: "inline-block", padding: mob ? "12px 24px" : "14px 36px", borderRadius: 12, background: C.gradient, color: "#fff", fontSize: mob ? 13 : 15, fontWeight: 700, cursor: "pointer", width: mob ? "100%" : "auto", boxSizing: "border-box" }}>Voir tout le programme ({formations.length} formations) →</div></Link>
      </div>

      {/* ===== NEWSLETTER ===== */}
      <section style={{ padding: mob ? "0 16px 32px" : "0 40px 44px", maxWidth: 620, margin: "0 auto" }}>
        <div style={{ padding: mob ? "24px 18px" : "36px", borderRadius: mob ? 14 : 20, background: C.gradientBg, border: "1px solid " + C.borderLight, textAlign: "center" }}>
          <div style={{ fontSize: 22 }}>🍿</div>
          <h2 style={{ fontSize: mob ? 17 : 21, fontWeight: 800, marginTop: 10, marginBottom: 6, color: C.text }}>Ne ratez aucune avant-première</h2>
          <p style={{ fontSize: mob ? 12 : 13.5, color: C.textTer, marginBottom: 18 }}>Les nouvelles formations, chaque semaine.</p>
          {nlSent ? (<div style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>✓ Place réservée !</div>) : (
            <div style={{ display: "flex", gap: 8, maxWidth: 380, margin: "0 auto", flexDirection: mob ? "column" : "row" }}>
              <input placeholder="votre@email.fr" type="email" value={nlEmail} onChange={e => setNlEmail(e.target.value)} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              <button onClick={async () => {
                if (!nlEmail.trim()) return;
                // Save to newsletter_subscribers table
                await supabase.from("newsletter_subscribers").upsert({ email: nlEmail.trim().toLowerCase() }, { onConflict: "email" }).catch(() => {});
                // Send confirmation email
                fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "newsletter_confirm", email: nlEmail.trim() }) }).catch(() => {});
                setNlSent(true);
              }} style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>S&apos;abonner</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
