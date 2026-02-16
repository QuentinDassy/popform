"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, getDC, getAllCitiesFromFormations, fetchFormations, type Formation } from "@/lib/data";
import { FormationCard, CityCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";

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
const MODALITES = ["Présentiel", "Distanciel", "Mixte"];
const PRISES = ["DPC", "FIF-PL", "OPCO"];

const selectStyle = (mob: boolean): React.CSSProperties => ({
  padding: mob ? "8px 10px" : "9px 14px", borderRadius: 10, border: "1.5px solid " + C.border,
  background: C.surface, color: C.text, fontSize: mob ? 11 : 12, fontFamily: "inherit",
  outline: "none", cursor: "pointer", appearance: "none" as const,
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6' fill='%23A48C6A'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
  paddingRight: 28, minWidth: 0, flex: 1,
});

export default function HomePage() {
  const mob = useIsMobile();
  const router = useRouter();
  const typed = useTyping(["langage oral", "dyspraxie", "EBP", "Marseille", "bégaiement", "cognition", "Paris"]);
  const [nlEmail, setNlEmail] = useState("");
  const [nlSent, setNlSent] = useState(false);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroSearch, setHeroSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Filters
  const [selDomaine, setSelDomaine] = useState("");
  const [selModalite, setSelModalite] = useState("");
  const [selPrise, setSelPrise] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (heroSearch) params.set("q", heroSearch);
    else if (typed) params.set("q", typed);
    if (selDomaine) params.set("domaine", selDomaine);
    if (selModalite) params.set("modalite", selModalite);
    if (selPrise) params.set("prise", selPrise);
    router.push("/catalogue?" + params.toString());
  };

  useEffect(() => { fetchFormations().then(d => { setFormations(d); setLoading(false) }) }, []);

  const newF = formations.filter(f => f.is_new).sort((a, b) => b.date_ajout.localeCompare(a.date_ajout));
  const langOral = formations.filter(f => f.domaine === "Langage oral");
  const neuro = formations.filter(f => f.domaine === "Neurologie");
  const topCities = getAllCitiesFromFormations(formations).slice(0, 8);
  const popularF = [...formations].sort((a, b) => b.note - a.note).slice(0, 8);

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  return (
    <>
      {/* ===== HERO ===== */}
      <section style={{ position: "relative", padding: mob ? "32px 16px 28px" : "60px 40px 44px", overflow: "hidden", background: C.gradientHero }}>
        <div style={{ position: "absolute", top: -100, left: -60, width: 400, height: 400, background: "radial-gradient(circle, rgba(212,43,43,0.08), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", textAlign: "center", maxWidth: 700, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(24px,5.5vw,44px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 12, color: C.text }}>
            Toutes les formations pour orthophonistes,<br />
            <span style={{ background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>au même endroit.</span>
          </h1>
          <p style={{ fontSize: "clamp(12px,2vw,15px)", color: C.textSec, maxWidth: 460, margin: "0 auto 24px", lineHeight: 1.6 }}>Trouvez la meilleure formation près de chez vous.</p>

          {/* Search bar */}
          <div onClick={() => !searchFocused && document.getElementById("hero-search")?.focus()} style={{ maxWidth: mob ? "100%" : 540, margin: "0 auto", cursor: "text" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: mob ? "4px 4px 4px 12px" : "5px 5px 5px 18px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: mob ? 11 : 14, boxShadow: "0 6px 30px rgba(212,43,43,0.06)" }}>
              <span style={{ color: C.textTer }}>🔍</span>
              <div style={{ flex: 1, position: "relative", padding: mob ? "7px 0" : "10px 0" }}>
                <input id="hero-search" value={heroSearch} onChange={e => setHeroSearch(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="" style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: mob ? 12 : 14, fontFamily: "inherit" }} />
                {!heroSearch && !searchFocused && <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", color: C.textTer, fontSize: mob ? 12 : 14, pointerEvents: "none" }}>{typed}<span style={{ color: C.accent }}>|</span></div>}
              </div>
              <div onClick={handleSearch} style={{ padding: mob ? "8px 14px" : "11px 22px", borderRadius: mob ? 8 : 10, background: C.gradient, color: "#fff", fontSize: mob ? 11 : 13, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer" }}>Rechercher</div>
            </div>
          </div>

          {/* Filter dropdowns */}
          <div style={{ display: "flex", gap: mob ? 6 : 8, marginTop: mob ? 12 : 16, maxWidth: 540, margin: mob ? "12px auto 0" : "16px auto 0", flexWrap: "wrap", justifyContent: "center" }}>
            <select value={selDomaine} onChange={e => setSelDomaine(e.target.value)} style={selectStyle(mob)}>
              <option value="">Domaine</option>
              {DOMAINES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={selModalite} onChange={e => setSelModalite(e.target.value)} style={selectStyle(mob)}>
              <option value="">Modalité</option>
              {MODALITES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={selPrise} onChange={e => setSelPrise(e.target.value)} style={selectStyle(mob)}>
              <option value="">Prise en charge</option>
              {PRISES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {(selDomaine || selModalite || selPrise) && (
              <button onClick={() => { setSelDomaine(""); setSelModalite(""); setSelPrise("") }} style={{ padding: mob ? "8px 10px" : "9px 14px", borderRadius: 10, border: "1.5px solid " + C.accent + "33", background: C.accentBg, color: C.accent, fontSize: mob ? 11 : 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✕ Effacer</button>
            )}
          </div>
        </div>
      </section>

      {/* ===== VILLES (like escapegame.fr main grid) ===== */}
      <section style={{ padding: mob ? "24px 16px 16px" : "36px 40px 24px", maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mob ? 12 : 16 }}>
          <h2 style={{ fontSize: mob ? 18 : 24, fontWeight: 800, color: C.text }}>📍 Formations par ville</h2>
          <Link href="/villes" style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>Toutes les villes →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: mob ? 8 : 14 }}>
          {topCities.map(([city, count]) => (
            <CityCard key={city} city={city} count={count} mob={mob} />
          ))}
        </div>
      </section>

      {/* ===== À L'AFFICHE (grid) ===== */}
      {newF.length > 0 && (
        <section style={{ padding: mob ? "16px 16px 8px" : "24px 40px 16px", maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mob ? 12 : 16 }}>
            <h2 style={{ fontSize: mob ? 18 : 24, fontWeight: 800, color: C.text }}>🎬 À l&apos;affiche</h2>
            <Link href="/catalogue" style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>Voir tout →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: mob ? 12 : 16 }}>
            {newF.slice(0, mob ? 4 : 8).map(f => <FormationCard key={f.id} f={f} mob={mob} />)}
          </div>
        </section>
      )}

      {/* ===== LES PLUS POPULAIRES (grid, like "salles les plus populaires" on escapegame.fr) ===== */}
      {popularF.length > 0 && (
        <section style={{ padding: mob ? "24px 16px 8px" : "32px 40px 16px", maxWidth: 1240, margin: "0 auto" }}>
          <h2 style={{ fontSize: mob ? 18 : 24, fontWeight: 800, color: C.text, marginBottom: mob ? 12 : 16 }}>⭐ Les mieux notées</h2>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: mob ? 12 : 16 }}>
            {popularF.slice(0, mob ? 4 : 8).map(f => <FormationCard key={f.id} f={f} compact mob={mob} />)}
          </div>
        </section>
      )}

      {/* ===== PAR DOMAINE (grid sections) ===== */}
      {[
        { title: "🗣️ Langage oral", data: langOral },
        { title: "🧠 Neurologie", data: neuro },
      ].map(sec => sec.data.length > 0 && (
        <section key={sec.title} style={{ padding: mob ? "24px 16px 8px" : "32px 40px 16px", maxWidth: 1240, margin: "0 auto" }}>
          <h2 style={{ fontSize: mob ? 18 : 24, fontWeight: 800, color: C.text, marginBottom: mob ? 12 : 16 }}>{sec.title}</h2>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: mob ? 12 : 16 }}>
            {sec.data.slice(0, mob ? 3 : 4).map(f => <FormationCard key={f.id} f={f} compact mob={mob} />)}
          </div>
        </section>
      ))}

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
