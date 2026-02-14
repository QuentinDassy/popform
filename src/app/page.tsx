"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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

function SectionRow({ title, emoji, desc, formations, mob }: { title: string; emoji: string; desc: string; formations: Formation[]; mob: boolean }) {
  const sr = useRef<HTMLDivElement>(null);
  if (!formations.length) return null;
  return (
    <section style={{ padding: "0 0 36px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: mob ? 10 : 16 }}>
          <span style={{ fontSize: mob ? 16 : 20 }}>{emoji}</span>
          <div><h2 style={{ fontSize: mob ? 17 : 22, fontWeight: 800, color: C.text }}>{title}</h2>{desc && <p style={{ fontSize: mob ? 11 : 13, color: C.textTer }}>{desc}</p>}</div>
        </div>
      </div>
      <div ref={sr} style={{ display: "flex", gap: mob ? 10 : 16, overflowX: "auto", scrollSnapType: "x mandatory", padding: mob ? "0 16px 8px" : "0 40px 8px", maxWidth: 1240, margin: "0 auto", scrollbarWidth: "none" }}>
        {formations.map(f => (
          <div key={f.id} style={{ minWidth: mob ? 240 : 330, maxWidth: mob ? 240 : 330, scrollSnapAlign: "start" }}>
            <FormationCard f={f} compact mob={mob} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const mob = useIsMobile();
  const typed = useTyping(["langage oral", "dyspraxie", "EBP", "Marseille", "bégaiement", "cognition", "Paris"]);
  const [nlEmail, setNlEmail] = useState("");
  const [nlSent, setNlSent] = useState(false);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFormations().then(d => { setFormations(d); setLoading(false) }) }, []);

  const newF = formations.filter(f => f.is_new).sort((a, b) => b.date_ajout.localeCompare(a.date_ajout));
  const langOral = formations.filter(f => f.domaine === "Langage oral");
  const neuro = formations.filter(f => f.domaine === "Neurologie");
  const topCities = getAllCitiesFromFormations(formations).slice(0, 6);

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  return (
    <>
      <section style={{ position: "relative", padding: mob ? "40px 16px 30px" : "70px 40px 50px", overflow: "hidden", background: C.gradientHero }}>
        <div style={{ position: "absolute", top: -100, left: -60, width: 400, height: 400, background: "radial-gradient(circle, rgba(212,43,43,0.08), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", textAlign: "center", maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", padding: "6px 16px", borderRadius: 99, background: C.yellowBg, border: "1px solid rgba(245,183,49,0.2)", marginBottom: 18, fontSize: mob ? 11 : 13, color: C.yellowDark, fontWeight: 600 }}>🍿 La formation continue, version blockbuster</div>
          <h1 style={{ fontSize: "clamp(28px,6vw,50px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 14, color: C.text }}>
            Votre prochaine formation<br />
            <span style={{ background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>est à l&apos;affiche</span>
          </h1>
          <p style={{ fontSize: "clamp(13px,2vw,16px)", color: C.textSec, maxWidth: 480, margin: "0 auto 30px", lineHeight: 1.65 }}>Consultez le programme et trouvez le scénario qui fera décoller votre pratique.</p>
          <Link href="/catalogue" style={{ textDecoration: "none" }}>
            <div style={{ maxWidth: mob ? "100%" : 540, margin: "0 auto", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: mob ? "4px 4px 4px 12px" : "5px 5px 5px 18px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: mob ? 11 : 14, boxShadow: "0 6px 30px rgba(212,43,43,0.06)" }}>
                <span style={{ color: C.textTer }}>🔍</span>
                <div style={{ flex: 1, color: C.textTer, fontSize: mob ? 12 : 14, textAlign: "left", padding: mob ? "7px 0" : "10px 0" }}>{typed}<span style={{ color: C.accent }}>|</span></div>
                <div style={{ padding: mob ? "8px 14px" : "11px 22px", borderRadius: mob ? 8 : 10, background: C.gradient, color: "#fff", fontSize: mob ? 11 : 13, fontWeight: 700, whiteSpace: "nowrap" }}>Rechercher</div>
              </div>
            </div>
          </Link>
          <div style={{ display: "flex", justifyContent: "center", gap: mob ? 20 : 36, marginTop: mob ? 20 : 36 }}>
            {[{ v: formations.length + "+", l: "formations" }, { v: "45", l: "organismes" }, { v: "4.7★", l: "note moyenne" }].map(s => (
              <div key={s.l} style={{ textAlign: "center" }}><div style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 800, color: C.text }}>{s.v}</div><div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>{s.l}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: mob ? "16px 16px 28px" : "28px 40px 44px", maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: mob ? 5 : 7, flexWrap: "wrap", justifyContent: "center" }}>
          {[{ n: "Langage oral", e: "🗣️" }, { n: "Neurologie", e: "🧠" }, { n: "OMF", e: "🦷" }, { n: "Cognition mathématique", e: "🔢" }, { n: "Pratique professionnelle", e: "📊" }, { n: "Langage écrit", e: "📖" }].map(d => {
            const dc = getDC(d.n);
            return (<Link key={d.n} href={`/catalogue?domaine=${encodeURIComponent(d.n)}`} style={{ textDecoration: "none" }}><button style={{ display: "flex", alignItems: "center", gap: 5, padding: mob ? "6px 10px" : "8px 16px", borderRadius: 10, border: "1.5px solid " + dc.color + "20", background: dc.bg, color: dc.color, fontSize: mob ? 10 : 12, fontWeight: 600, cursor: "pointer" }}>{d.e} {d.n}</button></Link>);
          })}
        </div>
      </section>

      <SectionRow title="À l'affiche" emoji="🎬" desc="Les dernières sorties" formations={newF} mob={mob} />
      <SectionRow title="Langage oral" emoji="🗣️" desc="Les classiques" formations={langOral} mob={mob} />
      <SectionRow title="Neurologie" emoji="🧠" desc="Les thrillers du cerveau" formations={neuro} mob={mob} />

      <section style={{ padding: "0 0 44px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mob ? 10 : 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: mob ? 16 : 20 }}>📍</span><div><h2 style={{ fontSize: mob ? 17 : 22, fontWeight: 800, color: C.text }}>Par ville</h2><p style={{ fontSize: mob ? 11 : 13, color: C.textTer }}>Trouvez près de chez vous</p></div></div>
            <Link href="/villes" style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>Voir tout →</Link>
          </div>
        </div>
        <div style={{ display: "flex", gap: mob ? 8 : 14, overflowX: "auto", padding: mob ? "0 16px 6px" : "0 40px 6px", maxWidth: 1240, margin: "0 auto", scrollbarWidth: "none" }}>
          {topCities.map(([c, n]) => <CityCard key={c} city={c} count={n} mob={mob} />)}
        </div>
      </section>

      <div style={{ textAlign: "center", padding: mob ? "0 16px 32px" : "0 40px 44px" }}>
        <Link href="/catalogue"><button style={{ padding: mob ? "10px 20px" : "12px 30px", borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: mob ? 12 : 14, fontWeight: 700, cursor: "pointer", width: mob ? "100%" : "auto" }}>Voir tout le programme ({formations.length}) →</button></Link>
      </div>

      <section style={{ padding: mob ? "0 16px 32px" : "0 40px 44px", maxWidth: 620, margin: "0 auto" }}>
        <div style={{ padding: mob ? "24px 18px" : "36px", borderRadius: mob ? 14 : 20, background: C.gradientBg, border: "1px solid " + C.borderLight, textAlign: "center" }}>
          <div style={{ fontSize: 22 }}>🍿</div>
          <h2 style={{ fontSize: mob ? 17 : 21, fontWeight: 800, marginTop: 10, marginBottom: 6, color: C.text }}>Ne ratez aucune avant-première</h2>
          <p style={{ fontSize: mob ? 12 : 13.5, color: C.textTer, marginBottom: 18 }}>Les nouvelles formations, chaque semaine.</p>
          {nlSent ? (<div style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>✓ Place réservée !</div>) : (
            <div style={{ display: "flex", gap: 8, maxWidth: 380, margin: "0 auto", flexDirection: mob ? "column" : "row" }}>
              <input placeholder="votre@email.fr" type="email" value={nlEmail} onChange={e => setNlEmail(e.target.value)} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none" }} />
              <button onClick={() => { if (nlEmail) setNlSent(true) }} style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>S&apos;abonner</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
