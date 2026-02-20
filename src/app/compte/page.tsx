"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { C, fetchFormations, fetchAvis, fetchInscriptions, fetchFavoris, toggleFavori, type Formation, type Avis } from "@/lib/data";
import { FormationCard, StarRow } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase-data";

type InscRow = { formation_id: number; session_id?: number | null };

export default function ComptePage() {
  const [tab, setTab] = useState("inscriptions");
  const [search, setSearch] = useState("");
  const mob = useIsMobile();
  const { user, profile } = useAuth();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [inscs, setInscs] = useState<InscRow[]>([]);
  const [inscriptionIds, setInscriptionIds] = useState<number[]>([]);
  const [favoriIds, setFavoriIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProfile, setEditProfile] = useState(false);
  const [pName, setPName] = useState("");
  const [pSaving, setPSaving] = useState(false);
  const [pMsg, setPMsg] = useState("");
  const [newsletterOpt, setNewsletterOpt] = useState(false);
  const [showPwChange, setShowPwChange] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  const pwChecks = useMemo(() => [
    { label: "8 caractères", ok: newPw.length >= 8 },
    { label: "Majuscule", ok: /[A-Z]/.test(newPw) },
    { label: "Minuscule", ok: /[a-z]/.test(newPw) },
    { label: "Chiffre", ok: /[0-9]/.test(newPw) },
    { label: "Spécial", ok: /[^A-Za-z0-9]/.test(newPw) },
  ], [newPw]);
  const pwValid = pwChecks.every(c => c.ok);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setPName(profile?.full_name || "");
    setNewsletterOpt(profile?.newsletter_opt ?? false);
    Promise.all([fetchFormations(), fetchAvis(), fetchInscriptions(user.id), fetchFavoris(user.id)]).then(([f, a, ins, favs]) => {
      setFormations(f); setAvis(a);
      const active = ins.filter(i => i.status === "inscrit");
      setInscs(active.map(i => ({ formation_id: i.formation_id, session_id: (i as any).session_id ?? null })));
      setInscriptionIds(active.map(i => i.formation_id));
      setFavoriIds(favs.map(fv => fv.formation_id));
      setLoading(false);
    });
  }, [user, profile]);

  const handleToggleFav = async (formationId: number) => {
    if (!user) return;
    const added = await toggleFavori(user.id, formationId);
    setFavoriIds(prev => added ? [...prev, formationId] : prev.filter(id => id !== formationId));
  };

  const handleSaveProfile = async () => {
    if (!user || !pName.trim()) return;
    setPSaving(true); setPMsg("");
    await supabase.from("profiles").update({ full_name: pName.trim() }).eq("id", user.id);
    setPMsg("✓ Nom mis à jour"); setPSaving(false);
    setTimeout(() => { setPMsg(""); setEditProfile(false); }, 1500);
  };

  const handleChangePw = async () => {
    if (!pwValid) return;
    setPwSaving(true); setPwMsg("");
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setPwMsg("Erreur: " + error.message); } else { setPwMsg("✓ Mot de passe mis à jour"); setNewPw(""); setTimeout(() => { setPwMsg(""); setShowPwChange(false); }, 2000); }
    setPwSaving(false);
  };

  if (!user) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>Connectez-vous pour accéder à votre compte.</div>;
  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  const inscF = formations.filter(f => inscriptionIds.includes(f.id));
  const favF = formations.filter(f => favoriIds.includes(f.id));
  const myAvis = avis.filter(a => a.user_id === user.id);

  const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>Mon compte 🍿</h1>
        <p style={{ fontSize: 13, color: C.textTer }}>{profile?.full_name} · {user.email}</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => { setEditProfile(!editProfile); setShowPwChange(false); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: editProfile ? C.accentBg : C.surface, color: editProfile ? C.accent : C.textSec, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>✏️ Modifier le profil</button>
        <button onClick={() => { setShowPwChange(!showPwChange); setEditProfile(false); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: showPwChange ? C.accentBg : C.surface, color: showPwChange ? C.accent : C.textSec, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>🔐 Changer le mot de passe</button>
      </div>

      {editProfile && (
        <div style={{ padding: 16, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4 }}>Nom complet</label>
          <input value={pName} onChange={e => setPName(e.target.value)} style={{ ...inputStyle, maxWidth: 300 }} />

          <div style={{ marginTop: 14, padding: "12px 14px", background: C.bgAlt, borderRadius: 10, border: "1px solid " + C.borderLight }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>🍿 Newsletter PopForm</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>Nouvelles formations, actus et séances à ne pas rater</div>
              </div>
              <button onClick={async () => {
                const newVal = !newsletterOpt;
                setNewsletterOpt(newVal);
                await supabase.from("profiles").update({ newsletter_opt: newVal }).eq("id", user?.id || "");
                setPMsg(newVal ? "✓ Newsletter activée !" : "Newsletter désactivée");
                setTimeout(() => setPMsg(""), 2000);
              }} style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: newsletterOpt ? C.green : C.border, cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3, left: newsletterOpt ? 23 : 3, transition: "left 0.2s" }} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <button onClick={handleSaveProfile} disabled={pSaving} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: pSaving ? 0.5 : 1 }}>Enregistrer</button>
            {pMsg && <span style={{ fontSize: 12, color: C.green }}>{pMsg}</span>}
          </div>
        </div>
      )}

      {showPwChange && (
        <div style={{ padding: 16, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4 }}>Nouveau mot de passe</label>
          <div style={{ position: "relative", maxWidth: 300 }}>
            <input type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChangePw()} style={{ ...inputStyle, paddingRight: 40 }} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: C.textTer }} tabIndex={-1}>{showPw ? "🙈" : "👁️"}</button>
          </div>
          {newPw && <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>{pwChecks.map(c => <span key={c.label} style={{ fontSize: 10, color: c.ok ? C.green : C.textTer }}>{c.ok ? "✓" : "○"}{c.label}</span>)}</div>}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <button onClick={handleChangePw} disabled={pwSaving || !pwValid} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: pwSaving || !pwValid ? 0.5 : 1 }}>Mettre à jour</button>
            {pwMsg && <span style={{ fontSize: 12, color: pwMsg.startsWith("✓") ? C.green : C.pink }}>{pwMsg}</span>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 18, padding: 4, background: C.bgAlt, borderRadius: 12, width: "fit-content", flexWrap: "wrap" }}>
        <button onClick={() => { setTab("inscriptions"); setSearch(""); }} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "inscriptions" ? C.accentBg : "transparent", color: tab === "inscriptions" ? C.accent : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "inscriptions" ? 700 : 500, cursor: "pointer" }}>📋 Inscriptions ({inscF.length})</button>
        <button onClick={() => setTab("calendrier")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "calendrier" ? "rgba(46,124,230,0.1)" : "transparent", color: tab === "calendrier" ? "#2E7CE6" : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "calendrier" ? 700 : 500, cursor: "pointer" }}>📅 Calendrier</button>
        <button onClick={() => setTab("avis")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "avis" ? "rgba(232,123,53,0.1)" : "transparent", color: tab === "avis" ? "#E87B35" : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "avis" ? 700 : 500, cursor: "pointer" }}>⭐ Avis ({myAvis.length})</button>
        <button onClick={() => setTab("favoris")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "favoris" ? C.pinkBg : "transparent", color: tab === "favoris" ? C.pink : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "favoris" ? 700 : 500, cursor: "pointer" }}>❤️ Favoris ({favF.length})</button>
      </div>

      {tab === "favoris" && (
        <div>
          {favF.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>❤️</div>
              <p>Aucun favori. Explorez le <Link href="/catalogue" style={{ color: C.accent, fontWeight: 600 }}>catalogue</Link> !</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 10, paddingBottom: 40 }}>
              {favF.map(f => (
                <div key={f.id} style={{ position: "relative" }}>
                  <FormationCard f={f} mob={mob} />
                  <button onClick={() => handleToggleFav(f.id)} style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>❤️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "avis" && (
        <div>
          {myAvis.length === 0
            ? <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Vous n&apos;avez pas encore laissé d&apos;avis.</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 40 }}>
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
            </div>
          }
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
          {(() => {
            const filtered = search ? inscF.filter(f => f.titre.toLowerCase().includes(search.toLowerCase())) : inscF;
            return filtered.length === 0
              ? <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Aucune inscription.</div>
              : <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 10, paddingBottom: 40 }}>
                {filtered.map(f => (
                  <div key={f.id} style={{ position: "relative" }}>
                    <FormationCard f={f} mob={mob} />
                    <button onClick={async () => {
                      if (!confirm("Se désinscrire de cette formation ?")) return;
                      await supabase.from("inscriptions").delete().eq("user_id", user.id).eq("formation_id", f.id);
                      setInscriptionIds(prev => prev.filter(id => id !== f.id));
                      setInscs(prev => prev.filter(i => i.formation_id !== f.id));
                    }} style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.95)", border: "1px solid " + C.border, color: C.pink, fontSize: 10, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>✕ Se désinscrire</button>
                  </div>
                ))}
              </div>;
          })()}
        </div>
      )}

      {tab === "calendrier" && (
        <div>
          {inscF.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              <p>Aucune inscription à afficher dans le calendrier.</p>
            </div>
          ) : (
            <div style={{ paddingBottom: 40 }}>
              {(() => {
                // Regrouper les formations par date
                const events: { date: string; formations: Formation[] }[] = [];
                inscF.forEach(f => {
                  (f.sessions || []).forEach(s => {
                    if (s.dates) {
                      const dateKey = s.dates.split(" → ")[0] || s.dates;
                      const existing = events.find(e => e.date === dateKey);
                      if (existing) {
                        if (!existing.formations.find(ff => ff.id === f.id)) {
                          existing.formations.push(f);
                        }
                      } else {
                        events.push({ date: dateKey, formations: [f] });
                      }
                    }
                  });
                });
                events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                const mois = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
                const jours = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
                
                return events.map((event, i) => {
                  const date = new Date(event.date);
                  const jour = jours[date.getDay()];
                  const jourNum = date.getDate();
                  const moisNom = mois[date.getMonth()];
                  const annee = date.getFullYear();
                  const isPast = date < new Date();
                  
                  return (
                    <div key={i} style={{ display: "flex", gap: 16, marginBottom: 20, opacity: isPast ? 0.6 : 1 }}>
                      {/* Date */}
                      <div style={{ flexShrink: 0, width: 70, textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: C.textTer, textTransform: "uppercase" }}>{jour}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: isPast ? C.textTer : C.accent, lineHeight: 1 }}>{jourNum}</div>
                        <div style={{ fontSize: 11, color: C.textTer }}>{moisNom} {annee}</div>
                      </div>
                      {/* Formations */}
                      <div style={{ flex: 1 }}>
                        {event.formations.map(f => (
                          <Link key={f.id} href={`/formation/${f.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                            <div style={{ padding: 14, background: C.surface, borderRadius: 12, border: "1.5px solid " + C.border, marginBottom: 8, cursor: "pointer", transition: "all 0.2s" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{f.titre}</div>
                                  <div style={{ fontSize: 12, color: C.textSec }}>{f.domaine} · {f.duree}</div>
                                </div>
                                <span style={{ fontSize: 18 }}>→</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
