"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, getAllCitiesFromFormations, fetchFormations, type Formation } from "@/lib/data";
import { FormationCard, CityCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase } from "@/lib/supabase-data";

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

const DOMAINES = ["Langage oral", "Langage écrit", "Neurologie", "OMF", "Cognition mathématique", "Pratique professionnelle"];
const MODALITES = ["Présentiel", "Distanciel", "Visio", "Mixte"];
const PRISES = ["DPC", "FIF-PL", "OPCO"];

const sel = (mob: boolean): React.CSSProperties => ({
  padding: mob ? "9px 28px 9px 12px" : "10px 32px 10px 14px",
  borderRadius: 10, border: "1.5px solid " + C.border,
  background: C.surface, color: C.text, fontSize: mob ? 11 : 13, fontFamily: "inherit",
  outline: "none", cursor: "pointer", appearance: "none" as const,
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6' fill='%23A48C6A'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
  flex: 1, minWidth: mob ? 0 : 120,
});

function SectionGrid({ title, formations, mob, max, link }: { title: string; formations: Formation[]; mob: boolean; max?: number; link?: string }) {
  const show = formations.slice(0, max || (mob ? 4 : 8));
  return (
    <section style={{ padding: mob ? "24px 16px 8px" : "32px 40px 16px", maxWidth: 1240, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mob ? 12 : 16 }}>
        <h2 style={{ fontSize: mob ? 18 : 24, fontWeight: 800, color: C.text }}>{title}</h2>
        <Link href={link || "/catalogue"} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>Voir tout →</Link>
      </div>
      {show.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: mob ? 12 : 16 }}>
          {show.map(f => <FormationCard key={f.id} f={f} mob={mob} />)}
        </div>
      ) : (
        <p style={{ textAlign: "center", color: C.textTer, fontSize: 13, padding: "20px 0" }}>Prochainement…</p>
      )}
    </section>
  );
}

export default function HomePage() {
  const mob = useIsMobile();
  const router = useRouter();
  const typed = useTyping(["langage oral", "dyspraxie", "EBP", "Marseille", "bégaiement", "cognition", "Paris"]);
  const [nlEmail, setNlEmail] = useState("");
  const [nlSent, setNlSent] = useState(false);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [webinaires, setWebinaires] = useState<any[]>([]);
  const [adminVilles, setAdminVilles] = useState<{ nom: string; image: string }[]>([]);
  const [heroSearch, setHeroSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selDomaine, setSelDomaine] = useState("");
  const [selModalite, setSelModalite] = useState("");
  const [selPrise, setSelPrise] = useState("");
  const [selVille, setSelVille] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<Formation[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const handleSearch = () => {
    setShowSuggestions(false);
    const p = new URLSearchParams();
    if (heroSearch) p.set("q", heroSearch);
    if (selDomaine) p.set("domaine", selDomaine);
    if (selModalite) p.set("modalite", selModalite);
    if (selPrise) p.set("prise", selPrise);
    if (selVille) p.set("ville", selVille);
    router.push("/catalogue?" + p.toString());
  };

  const handleSearchInput = (val: string) => {
    setHeroSearch(val);
    if (val.length >= 2 && formations.length > 0) {
      const norm = normalize(val);
      const matches = formations.filter(f =>
        normalize(f.titre).includes(norm) ||
        normalize(f.domaine).includes(norm) ||
        (f.mots_cles || []).some((m: string) => normalize(m).includes(norm)) ||
        (f.sessions || []).some(s => normalize(s.lieu).includes(norm))
      ).slice(0, 6);
      setSearchSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
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
    }
  }, []);

  useEffect(() => {
    if (!redirecting) {
      fetchFormations().then(d => {
        setFormations(d);
        setLoading(false);
      }).catch(() => setLoading(false));
      // Load webinaires publiés
      supabase.from("webinaires").select("*").eq("status", "publie").order("date_heure", { ascending: true }).then(({ data: wbs }) => {
        if (wbs) setWebinaires(wbs);
      }).catch(() => {});
      // Load admin villes separately (non-blocking)
      supabase.from("domaines").select("*").eq("type", "ville").order("nom").then(({ data: villes }) => {
        if (villes) setAdminVilles(villes.map((v: Record<string, string>) => ({ nom: v.nom, image: v.image || "" })));
      }).catch(() => {});
    }
  }, [redirecting]);

  const formationCities = getAllCitiesFromFormations(formations);
  // If admin configured villes, use those; otherwise fall back to formation cities
  const displayCities: { name: string; count: number; image?: string }[] = adminVilles.length > 0
    ? adminVilles.map(v => {
        const found = formationCities.find(([c]) => c === v.nom);
        return { name: v.nom, count: found ? found[1] : 0, image: v.image || undefined };
      })
    : formationCities.slice(0, 8).map(([c, n]) => ({ name: c, count: n }));
  const topCities = displayCities.slice(0, 8);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const newF = formations
    .filter(f => f.date_ajout >= thirtyDaysAgo || f.affiche_order)
    .sort((a, b) => (a.affiche_order ?? 999) - (b.affiche_order ?? 999) || b.date_ajout.localeCompare(a.date_ajout));
  const popularF = [...formations].sort((a, b) => b.note - a.note).slice(0, 8);
  const langOral = formations.filter(f => f.domaine === "Langage oral");
  const neuro = formations.filter(f => f.domaine === "Neurologie");
  const visioF = formations.filter(f => f.modalite === "Visio" || f.modalite === "Distanciel" || (f.sessions || []).some(s => s.lieu === "Visio"));
  const hasFilters = selDomaine || selModalite || selPrise || selVille;

  if (loading || redirecting) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  return (
    <>
      {/* ===== HERO ===== */}
      <section style={{ position: "relative", padding: mob ? "36px 16px 32px" : "70px 40px 56px", overflow: "visible", background: C.gradientHero }}>
        <div style={{ position: "absolute", top: -100, left: -60, width: 400, height: 400, background: "radial-gradient(circle, rgba(212,43,43,0.08), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, right: -40, width: 350, height: 350, background: "radial-gradient(circle, rgba(245,183,49,0.06), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", textAlign: "center", maxWidth: 740, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(24px,5.5vw,46px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 12, color: C.text }}>
            Toutes les formations pour orthophonistes,<br />
            <span style={{ background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>au même endroit.</span>
          </h1>
          <p style={{ fontSize: "clamp(12px,2vw,15px)", color: C.textSec, maxWidth: 460, margin: "0 auto 28px", lineHeight: 1.6 }}>Trouvez la meilleure formation près de chez vous.</p>

          {/* Search bar — bigger */}
          <div onClick={() => !searchFocused && document.getElementById("hero-search")?.focus()} style={{ maxWidth: mob ? "100%" : 600, margin: "0 auto", cursor: "text" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: mob ? "5px 5px 5px 14px" : "6px 6px 6px 20px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: mob ? 12 : 16, boxShadow: "0 8px 36px rgba(212,43,43,0.07)", position: "relative" }}>
              <span style={{ color: C.textTer, fontSize: mob ? 16 : 18 }}>🔍</span>
              <div style={{ flex: 1, position: "relative", padding: mob ? "9px 0" : "12px 0" }}>
                <input id="hero-search" value={heroSearch} onChange={e => handleSearchInput(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="" style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: mob ? 13 : 16, fontFamily: "inherit" }} />
                {!heroSearch && !searchFocused && <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", color: C.textTer, fontSize: mob ? 13 : 16, pointerEvents: "none" }}>{typed}<span style={{ color: C.accent }}>|</span></div>}
              </div>
              <div onClick={handleSearch} style={{ padding: mob ? "10px 16px" : "13px 26px", borderRadius: mob ? 9 : 12, background: C.gradient, color: "#fff", fontSize: mob ? 12 : 14, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer" }}>Rechercher</div>
            </div>
            {/* Autocomplete suggestions */}
            {showSuggestions && (
              <div style={{ position: "absolute", left: 0, right: 0, marginTop: 4, background: C.surface, border: "1.5px solid " + C.border, borderRadius: 14, boxShadow: "0 8px 32px rgba(45,27,6,0.12)", zIndex: 100, overflow: "hidden", maxWidth: mob ? "calc(100% - 32px)" : 600, marginLeft: "auto", marginRight: "auto" }}>
                {searchSuggestions.map(f => (
                  <div key={f.id} onMouseDown={() => { router.push("/formation/" + f.id); setShowSuggestions(false) }} style={{ padding: "10px 16px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid " + C.borderLight }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: C.accentBg, color: C.accent, fontWeight: 600, flexShrink: 0 }}>{f.domaine}</span>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600, flex: 1 }}>{f.titre}</span>
                    {(f.sessions || []).length > 0 && <span style={{ fontSize: 11, color: C.textTer }}>📍 {f.sessions[0].lieu}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filter selects — 4 filters including Ville */}
          <div style={{ display: "flex", gap: mob ? 6 : 8, marginTop: mob ? 14 : 18, maxWidth: 600, marginLeft: "auto", marginRight: "auto", flexWrap: "wrap" }}>
            <select value={selDomaine} onChange={e => setSelDomaine(e.target.value)} style={sel(mob)}>
              <option value="">Domaine</option>
              {DOMAINES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={selModalite} onChange={e => setSelModalite(e.target.value)} style={sel(mob)}>
              <option value="">Modalité</option>
              {MODALITES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={selPrise} onChange={e => setSelPrise(e.target.value)} style={sel(mob)}>
              <option value="">Prise en charge</option>
              {PRISES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={selVille} onChange={e => setSelVille(e.target.value)} style={sel(mob)}>
              <option value="">Ville</option>
              <option value="Visio">💻 En visio</option>
              {formationCities.map(([c]) => <option key={c} value={c}>{c}</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setSelDomaine(""); setSelModalite(""); setSelPrise(""); setSelVille("") }} style={{ padding: mob ? "9px 12px" : "10px 16px", borderRadius: 10, border: "1.5px solid " + C.accent + "33", background: C.accentBg, color: C.accent, fontSize: mob ? 11 : 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
            )}
            {/* Bouton loupe pour lancer la recherche avec filtres seuls */}
            <button onClick={handleSearch} title="Lancer la recherche avec les filtres" style={{ padding: mob ? "9px 12px" : "10px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.gradient, color: "#fff", fontSize: mob ? 13 : 16, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>🔍</button>
          </div>
        </div>
      </section>

      {/* ===== VILLES ===== */}
      <section style={{ padding: mob ? "24px 16px 16px" : "36px 40px 24px", maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mob ? 12 : 16 }}>
          <h2 style={{ fontSize: mob ? 18 : 24, fontWeight: 800, color: C.text }}>📍 Formations par ville</h2>
          <Link href="/villes" style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>Toutes les villes →</Link>
        </div>
        {topCities.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(4, 1fr)", gap: mob ? 8 : 14 }}>
            {topCities.map(c => <CityCard key={c.name} city={c.name} count={c.count} mob={mob} image={c.image} />)}
          </div>
        ) : (
          <p style={{ textAlign: "center", color: C.textTer, fontSize: 13, padding: "20px 0" }}>Les villes seront affichées dès que des sessions seront ajoutées.</p>
        )}
      </section>

      {/* ===== SECTIONS ===== */}
      <SectionGrid title="🎬 Les nouveautés à l'affiche" formations={newF.length > 0 ? newF : formations} mob={mob} max={6} link="/catalogue?sort=recent" />
      <SectionGrid title="⭐ Les mieux notées" formations={popularF} mob={mob} />
      {langOral.length > 0 && <SectionGrid title="🗣️ Langage oral" formations={langOral} mob={mob} max={4} />}
      {neuro.length > 0 && <SectionGrid title="🧠 Neurologie" formations={neuro} mob={mob} max={4} />}
      {visioF.length > 0 && <SectionGrid title="💻 En visio" formations={visioF} mob={mob} max={4} link="/catalogue?modalite=Visio" />}

      {/* Section webinaires */}
      {webinaires.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text }}>📡 Webinaires à venir</h2>
            <Link href="/webinaires" style={{ fontSize: 13, color: C.accent, textDecoration: "none", fontWeight: 600 }}>Voir tous →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
            {webinaires.slice(0, 4).map(w => {
              const d = new Date(w.date_heure);
              const now = new Date();
              const isFuture = d > now;
              return (
                <div key={w.id} style={{ padding: mob ? 14 : 18, background: "linear-gradient(135deg, #7C3AED08, #7C3AED18)", borderRadius: 14, border: "1.5px solid #7C3AED33" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: "#7C3AED", color: "#fff", fontSize: 10, fontWeight: 700 }}>📡 WEBINAIRE</span>
                    {isFuture && <span style={{ padding: "3px 8px", borderRadius: 6, background: C.greenBg, color: C.green, fontSize: 10, fontWeight: 700 }}>À venir</span>}
                  </div>
                  <div style={{ fontSize: mob ? 14 : 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{w.titre}</div>
                  <div style={{ fontSize: 12, color: C.textTer, marginBottom: 8 }}>📅 {d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                  {w.description && <p style={{ fontSize: 12, color: C.textSec, lineHeight: 1.5, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{w.description}</p>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: w.prix === 0 ? C.green : C.text }}>{w.prix === 0 ? "Gratuit" : w.prix + "€"}</span>
                    <Link href="/webinaires" style={{ padding: "6px 14px", borderRadius: 8, background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Voir →</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== CTA ===== */}
      <div style={{ textAlign: "center", padding: mob ? "24px 16px 28px" : "36px 40px 44px" }}>
        <Link href="/catalogue"><button style={{ padding: mob ? "12px 24px" : "14px 36px", borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: mob ? 13 : 15, fontWeight: 700, cursor: "pointer", width: mob ? "100%" : "auto", fontFamily: "inherit" }}>Voir tout le programme ({formations.length} formations) →</button></Link>
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
              <button onClick={() => { if (nlEmail) setNlSent(true) }} style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>S&apos;abonner</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
