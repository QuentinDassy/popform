"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C, fetchFormations, fetchAvis, fetchInscriptions, type Formation, type Avis } from "@/lib/data";
import { FormationCard, StarRow } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";

export default function ComptePage() {
  const [tab, setTab] = useState("inscriptions");
  const [search, setSearch] = useState("");
  const mob = useIsMobile();
  const { user } = useAuth();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [inscriptionIds, setInscriptionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return }
    Promise.all([fetchFormations(), fetchAvis(), fetchInscriptions(user.id)]).then(([f, a, ins]) => {
      setFormations(f); setAvis(a); setInscriptionIds(ins.filter(i => i.status === "inscrit").map(i => i.formation_id));
      setLoading(false);
    });
  }, [user]);

  if (!user) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>Connectez-vous pour accéder à votre compte.</div>;
  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  const inscF = formations.filter(f => inscriptionIds.includes(f.id));
  const myAvis = avis.filter(a => a.user_id === user.id);
  const list = tab === "inscriptions" ? inscF : [];
  const filtered = search ? list.filter(f => f.titre.toLowerCase().includes(search.toLowerCase())) : list;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>Mon compte 🍿</h1>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 18, padding: 4, background: C.bgAlt, borderRadius: 12, width: "fit-content", flexWrap: "wrap" }}>
        <button onClick={() => { setTab("inscriptions"); setSearch("") }} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "inscriptions" ? C.accentBg : "transparent", color: tab === "inscriptions" ? C.accent : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "inscriptions" ? 700 : 500, cursor: "pointer" }}>📋 Inscriptions ({inscF.length})</button>
        <button onClick={() => setTab("avis")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "avis" ? "rgba(232,123,53,0.1)" : "transparent", color: tab === "avis" ? "#E87B35" : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "avis" ? 700 : 500, cursor: "pointer" }}>⭐ Avis ({myAvis.length})</button>
        <button onClick={() => setTab("favoris")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "favoris" ? C.pinkBg : "transparent", color: tab === "favoris" ? C.pink : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "favoris" ? 700 : 500, cursor: "pointer" }}>❤️ Favoris</button>
      </div>

      {tab === "favoris" && <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Les favoris arrivent bientôt 🍿</div>}

      {tab === "avis" && (
        <div>
          {myAvis.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Vous n&apos;avez pas encore laissé d&apos;avis.</div> :
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 40 }}>
            {myAvis.map(a => { const formation = formations.find(ff => ff.id === a.formation_id); return (
              <Link key={a.id} href={`/formation/${a.formation_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ padding: mob ? 12 : 16, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontSize: mob ? 13 : 14, fontWeight: 700, color: C.text }}>{formation?.titre || "Formation"}</span>
                    <StarRow rating={a.note} />
                  </div>
                  <p style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.6 }}>{a.texte}</p>
                  <span style={{ fontSize: 10, color: C.textTer, marginTop: 4, display: "block" }}>{a.created_at?.slice(0, 10)}</span>
                </div>
              </Link>
            ); })}
          </div>}
        </div>
      )}

      {tab === "inscriptions" && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: 10, height: 38 }}>
              <span style={{ color: C.textTer }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 12 }} />
            </div>
          </div>
          {inscF.length > 0 && (
            <div style={{ marginBottom: 20, padding: mob ? 12 : 16, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>📅 Planning</div>
              {inscF.flatMap(f => (f.sessions || []).map((s, i) => ({ ...s, titre: f.titre, fId: f.id, key: f.id + "-" + i }))).sort((a, b) => a.dates.localeCompare(b.dates)).map(s => (
                <Link key={s.key} href={`/formation/${s.fId}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", gap: mob ? 6 : 10, alignItems: "center", padding: "8px 12px", background: C.gradientBg, borderRadius: 9, cursor: "pointer", border: "1px solid " + C.borderLight, marginBottom: 4, flexWrap: mob ? "wrap" : "nowrap" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 7, background: C.accentBg, color: C.accent, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{s.dates}</span>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text }}>{s.titre}</span>
                    <span style={{ fontSize: 10, color: C.textTer }}>📍 {s.lieu}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {filtered.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Aucune inscription.</div> :
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 10, paddingBottom: 40 }}>
              {filtered.map(f => <FormationCard key={f.id} f={f} mob={mob} />)}
            </div>}
        </div>
      )}
    </div>
  );
}
