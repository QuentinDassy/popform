"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { C, fetchFormations, fetchAvis, fetchInscriptions, fetchFavoris, toggleFavori, type Formation, type Avis } from "@/lib/data";
import { FormationCard, StarRow } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase-data";

export default function ComptePage() {
  const [tab, setTab] = useState("inscriptions");
  const [search, setSearch] = useState("");
  const mob = useIsMobile();
  const { user, profile } = useAuth();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [inscriptionIds, setInscriptionIds] = useState<number[]>([]);
  const [favoriIds, setFavoriIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile edit
  const [editProfile, setEditProfile] = useState(false);
  const [pName, setPName] = useState("");
  const [pSaving, setPSaving] = useState(false);
  const [pMsg, setPMsg] = useState("");

  // Password change
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
    if (!user) { setLoading(false); return }
    setPName(profile?.full_name || "");
    Promise.all([fetchFormations(), fetchAvis(), fetchInscriptions(user.id), fetchFavoris(user.id)]).then(([f, a, ins, favs]) => {
      setFormations(f); setAvis(a);
      setInscriptionIds(ins.filter(i => i.status === "inscrit").map(i => i.formation_id));
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
    setTimeout(() => { setPMsg(""); setEditProfile(false) }, 1500);
  };

  const handleChangePw = async () => {
    if (!pwValid) return;
    setPwSaving(true); setPwMsg("");
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setPwMsg("Erreur: " + error.message) } else { setPwMsg("✓ Mot de passe mis à jour"); setNewPw(""); setTimeout(() => { setPwMsg(""); setShowPwChange(false) }, 2000) }
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

      {/* Profile / Password section */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => { setEditProfile(!editProfile); setShowPwChange(false) }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: editProfile ? C.accentBg : C.surface, color: editProfile ? C.accent : C.textSec, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>✏️ Modifier le profil</button>
        <button onClick={() => { setShowPwChange(!showPwChange); setEditProfile(false) }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: showPwChange ? C.accentBg : C.surface, color: showPwChange ? C.accent : C.textSec, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>🔐 Changer le mot de passe</button>
      </div>

      {editProfile && (
        <div style={{ padding: 16, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4 }}>Nom complet</label>
          <input value={pName} onChange={e => setPName(e.target.value)} style={{ ...inputStyle, maxWidth: 300 }} />
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
          {newPw && <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>{pwChecks.map(c => <span key={c.label} style={{ fontSize: 10, color: c.ok ? C.green : C.textTer }}>{c.ok ? "✓" : "○"} {c.label}</span>)}</div>}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <button onClick={handleChangePw} disabled={pwSaving || !pwValid} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: pwSaving || !pwValid ? 0.5 : 1 }}>Mettre à jour</button>
            {pwMsg && <span style={{ fontSize: 12, color: pwMsg.startsWith("✓") ? C.green : C.pink }}>{pwMsg}</span>}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, padding: 4, background: C.bgAlt, borderRadius: 12, width: "fit-content", flexWrap: "wrap" }}>
        <button onClick={() => { setTab("inscriptions"); setSearch("") }} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "inscriptions" ? C.accentBg : "transparent", color: tab === "inscriptions" ? C.accent : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "inscriptions" ? 700 : 500, cursor: "pointer" }}>📋 Inscriptions ({inscF.length})</button>
        <button onClick={() => setTab("calendrier")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "calendrier" ? C.accentBg : "transparent", color: tab === "calendrier" ? C.accent : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "calendrier" ? 700 : 500, cursor: "pointer" }}>📅 Calendrier</button>
        <button onClick={() => setTab("avis")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "avis" ? "rgba(232,123,53,0.1)" : "transparent", color: tab === "avis" ? "#E87B35" : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "avis" ? 700 : 500, cursor: "pointer" }}>⭐ Avis ({myAvis.length})</button>
        <button onClick={() => setTab("favoris")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "favoris" ? C.pinkBg : "transparent", color: tab === "favoris" ? C.pink : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "favoris" ? 700 : 500, cursor: "pointer" }}>❤️ Favoris ({favF.length})</button>
      </div>

      {/* Calendrier tab */}
      {tab === "calendrier" && (() => {
        const allSessions = inscF.flatMap(f => (f.sessions || []).map((s, i) => ({ ...s, titre: f.titre, fId: f.id, domaine: f.domaine, key: f.id + "-" + i })));
        const months: Record<string, typeof allSessions> = {};
        allSessions.forEach(s => {
          // Try to extract month from dates string like "15-16 mars 2026"
          const match = s.dates.match(/(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s*(\d{4})/i);
          const key = match ? `${match[1]} ${match[2]}` : "À planifier";
          if (!months[key]) months[key] = [];
          months[key].push(s);
        });
        const sortedMonths = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]));
        return (
          <div style={{ paddingBottom: 40 }}>
            {allSessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                <p>Aucune session planifiée. Inscrivez-vous à des formations !</p>
              </div>
            ) : (
              sortedMonths.map(([month, sessions]) => (
                <div key={month} style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 10, textTransform: "capitalize" }}>📅 {month}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {sessions.map(s => (
                      <Link key={s.key} href={`/formation/${s.fId}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <div style={{ display: "flex", gap: mob ? 8 : 14, alignItems: "center", padding: mob ? "10px 12px" : "12px 16px", background: C.surface, borderRadius: 12, border: "1px solid " + C.borderLight, cursor: "pointer", flexWrap: "wrap" }}>
                          <span style={{ padding: "4px 10px", borderRadius: 8, background: C.accentBg, color: C.accent, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{s.dates}</span>
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.titre}</div>
                            <div style={{ fontSize: 11, color: C.textTer }}>📍 {s.lieu}{s.adresse ? " — " + s.adresse : ""}</div>
                          </div>
                          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: C.greenBg, color: C.green, fontWeight: 600 }}>{s.domaine}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })()}

      {/* Favoris tab */}
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

      {/* Avis tab */}
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

      {/* Inscriptions tab */}
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
          {(() => { const filtered = search ? inscF.filter(f => f.titre.toLowerCase().includes(search.toLowerCase())) : inscF; return filtered.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Aucune inscription.</div> :
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 10, paddingBottom: 40 }}>
              {filtered.map(f => (
                <div key={f.id} style={{ position: "relative" }}>
                  <FormationCard f={f} mob={mob} />
                  <button onClick={async () => { if (!confirm("Se désinscrire de cette formation ?")) return; await supabase.from("inscriptions").delete().eq("user_id", user.id).eq("formation_id", f.id); setInscriptionIds(prev => prev.filter(id => id !== f.id)) }} style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.95)", border: "1px solid " + C.border, color: C.pink, fontSize: 10, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>✕ Se désinscrire</button>
                </div>
              ))}
            </div>
          })()}
        </div>
      )}
    </div>
  );
}
