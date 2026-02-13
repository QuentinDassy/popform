"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { C, FORMATIONS, getDC, getAllCities } from "@/lib/data";
import { FormationCard, CityCard } from "@/components/ui";

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

// Fix: use proper imports

function SectionRow({ title, emoji, desc, formations }: { title: string; emoji: string; desc: string; formations: typeof FORMATIONS }) {
  const sr = useRef<HTMLDivElement>(null);
  if (!formations.length) return null;
  return (
    <section style={{ padding: "0 0 36px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>{emoji}</span>
          <div><h2 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{title}</h2>{desc && <p style={{ fontSize: 13, color: C.textTer }}>{desc}</p>}</div>
        </div>
      </div>
      <div ref={sr} style={{ display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory", padding: "0 40px 8px", maxWidth: 1240, margin: "0 auto", scrollbarWidth: "none" }}>
        {formations.map(f => (
          <div key={f.id} style={{ minWidth: 330, maxWidth: 330, scrollSnapAlign: "start" }}>
            <FormationCard f={f} compact />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const typed = useTyping(["langage oral", "dyspraxie", "EBP", "Marseille", "bégaiement", "cognition", "Paris"]);
  const [nlEmail, setNlEmail] = useState("");
  const [nlSent, setNlSent] = useState(false);

  const newF = FORMATIONS.filter(f => f.isNew).sort((a, b) => b.dateAjout.localeCompare(a.dateAjout));
  const langOral = FORMATIONS.filter(f => f.domaine === "Langage oral");
  const neuro = FORMATIONS.filter(f => f.domaine === "Neurologie");
  const topCities = getAllCities().slice(0, 6);

  return (
    <>
      {/* HERO */}
      <section style={{ position: "relative", padding: "70px 40px 50px", overflow: "hidden", background: C.gradientHero }}>
        <div style={{ position: "absolute", top: -100, left: -60, width: 400, height: 400, background: "radial-gradient(circle, rgba(212,43,43,0.08), transparent 70%)", animation: "float 6s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "relative", textAlign: "center", maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", padding: "6px 16px", borderRadius: 99, background: C.yellowBg, border: "1px solid rgba(245,183,49,0.2)", marginBottom: 18, fontSize: 13, color: C.yellowDark, fontWeight: 600 }}>🍿 La formation continue, version blockbuster</div>
          <h1 style={{ fontSize: "clamp(28px,6vw,50px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 14, color: C.text }}>
            Votre prochaine formation<br />
            <span style={{ background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite" }}>est à l&apos;affiche</span>
          </h1>
          <p style={{ fontSize: "clamp(13px,2vw,16px)", color: C.textSec, maxWidth: 480, margin: "0 auto 30px", lineHeight: 1.65 }}>
            Consultez le programme et trouvez le scénario qui fera décoller votre pratique.
          </p>
          <Link href="/catalogue" style={{ textDecoration: "none" }}>
            <div style={{ maxWidth: 540, margin: "0 auto", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 5px 5px 18px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: 14, boxShadow: "0 6px 30px rgba(212,43,43,0.06)" }}>
                <span style={{ color: C.textTer }}>🔍</span>
                <div style={{ flex: 1, color: C.textTer, fontSize: 14, textAlign: "left", padding: "10px 0" }}>{typed}<span style={{ animation: "pulse 1s ease infinite", color: C.accent }}>|</span></div>
                <div style={{ padding: "11px 22px", borderRadius: 10, background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>Rechercher</div>
              </div>
            </div>
          </Link>
          <div style={{ display: "flex", justifyContent: "center", gap: 36, marginTop: 36 }}>
            {[{ v: "250+", l: "formations" }, { v: "45", l: "organismes" }, { v: "4.7★", l: "note moyenne" }].map(s => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 800, color: C.text }}>{s.v}</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domain pills */}
      <section style={{ padding: "28px 40px 44px", maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
          {[{ n: "Langage oral", e: "🗣️" }, { n: "Neurologie", e: "🧠" }, { n: "OMF", e: "🦷" }, { n: "Cognition mathématique", e: "🔢" }, { n: "Pratique professionnelle", e: "📊" }, { n: "Langage écrit", e: "📖" }].map(d => {
            const dc = getDC(d.n);
            return (
              <Link key={d.n} href="/catalogue" style={{ textDecoration: "none" }}>
                <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 10, border: "1.5px solid " + dc.color + "20", background: dc.bg, color: dc.color, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{d.e} {d.n}</button>
              </Link>
            );
          })}
        </div>
      </section>

      <SectionRow title="À l'affiche" emoji="🎬" desc="Les dernières sorties" formations={newF} />
      <SectionRow title="Langage oral" emoji="🗣️" desc="Les classiques" formations={langOral} />
      <SectionRow title="Neurologie" emoji="🧠" desc="Les thrillers du cerveau" formations={neuro} />

      {/* Cities */}
      <section style={{ padding: "0 0 44px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>📍</span>
              <div><h2 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Par ville</h2><p style={{ fontSize: 13, color: C.textTer }}>Trouvez près de chez vous</p></div>
            </div>
            <Link href="/villes" style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>Voir tout →</Link>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "0 40px 6px", maxWidth: 1240, margin: "0 auto", scrollbarWidth: "none" }}>
          {topCities.map(([c, n]) => <CityCard key={c} city={c} count={n} />)}
        </div>
      </section>

      <div style={{ textAlign: "center", padding: "0 40px 44px" }}>
        <Link href="/catalogue"><button style={{ padding: "12px 30px", borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Voir tout le programme ({FORMATIONS.length}) →</button></Link>
      </div>

      {/* Newsletter */}
      <section style={{ padding: "0 40px 44px", maxWidth: 620, margin: "0 auto" }}>
        <div style={{ padding: "36px", borderRadius: 20, background: C.gradientBg, border: "1px solid " + C.borderLight, textAlign: "center" }}>
          <div style={{ fontSize: 22 }}>🍿</div>
          <h2 style={{ fontSize: 21, fontWeight: 800, marginTop: 10, marginBottom: 6, color: C.text }}>Ne ratez aucune avant-première</h2>
          <p style={{ fontSize: 13.5, color: C.textTer, marginBottom: 18 }}>Les nouvelles formations, chaque semaine.</p>
          {nlSent ? (
            <div style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>✓ Place réservée !</div>
          ) : (
            <div style={{ display: "flex", gap: 8, maxWidth: 380, margin: "0 auto" }}>
              <input placeholder="votre@email.fr" type="email" value={nlEmail} onChange={e => setNlEmail(e.target.value)} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none" }} />
              <button onClick={() => { if (nlEmail) setNlSent(true) }} style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>S&apos;abonner</button>
            </div>
          )}
        </div>
      </section>

      {/* Footer is in layout */}
    </>
  );
}
