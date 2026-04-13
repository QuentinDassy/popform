"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, fetchFormations, fetchAvis, fetchInscriptions, fetchFavoris, toggleFavori, fetchFormationsFaites, toggleFormationFaite, addAvis, fetchDomainesFiltres, type Formation, type Avis } from "@/lib/data";
import { FormationCard, StarRow } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase-data";

type InscRow = { formation_id: number; session_id?: number | null };

export default function ComptePage() {
  const router = useRouter();
  const [tab, setTab] = useState("inscriptions");
  const [search, setSearch] = useState("");
  const mob = useIsMobile();
  const { user, profile } = useAuth();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [inscs, setInscs] = useState<InscRow[]>([]);
  const [inscriptionIds, setInscriptionIds] = useState<number[]>([]);
  const [favoriIds, setFavoriIds] = useState<number[]>([]);
  const [webInscs, setWebInscs] = useState<any[]>([]);
  const [faitsIds, setFaitsIds] = useState<number[]>([]);
  const [avisFormId, setAvisFormId] = useState<number | null>(null);
  const [avisNote, setAvisNote] = useState(5);
  const [avisTexte, setAvisTexte] = useState("");
  const [avisSubContenu, setAvisSubContenu] = useState(5);
  const [avisSubOrganisation, setAvisSubOrganisation] = useState(5);
  const [avisSubSupports, setAvisSubSupports] = useState(5);
  const [avisSubPertinence, setAvisSubPertinence] = useState(5);
  const [avisSubmitting, setAvisSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editProfile, setEditProfile] = useState(false);
  const [pName, setPName] = useState("");
  const [pSaving, setPSaving] = useState(false);
  const [pMsg, setPMsg] = useState("");
  const [newsletterOpt, setNewsletterOpt] = useState(false);
  const [showPwChange, setShowPwChange] = useState(false);
  const [isResetFlow, setIsResetFlow] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reset") === "1") {
      setShowPwChange(true);
      setIsResetFlow(true);
    }
  }, []);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [sessionParties, setSessionParties] = useState<{ session_id: number; jours: string | null; date_debut: string | null; date_fin: string | null }[]>([]);
  // Alertes
  type AlerteRow = { id: number; type: string; valeur: string };
  const [alertes, setAlertes] = useState<AlerteRow[]>([]);
  const [alertOrg, setAlertOrg] = useState("");
  const [alertFmt, setAlertFmt] = useState("");
  const [alertDom, setAlertDom] = useState("");
  const [alertKw, setAlertKw] = useState("");
  const [orgsForAlert, setOrgsForAlert] = useState<{ id: number; nom: string }[]>([]);
  const [fmtsForAlert, setFmtsForAlert] = useState<{ id: number; nom: string }[]>([]);
  const [domsForAlert, setDomsForAlert] = useState<string[]>([]);
  const [alertMsg, setAlertMsg] = useState("");

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
    Promise.all([fetchFormations(), fetchAvis(), fetchInscriptions(user.id), fetchFavoris(user.id)]).then(async ([f, a, ins, favs]) => {
      setFormations(f); setAvis(a);
      const active = ins.filter(i => i.status === "inscrit");
      const inscRows = active.map(i => ({ formation_id: i.formation_id, session_id: (i as any).session_id ?? null }));
      setInscs(inscRows);
      setInscriptionIds(active.map(i => i.formation_id));
      setFavoriIds(favs.map(fv => fv.formation_id));
      const { data: webInscData } = await supabase.from("webinaire_inscriptions").select("*, webinaire:webinaires(*)").eq("user_id", user.id);
      setWebInscs(webInscData || []);
      const faits = await fetchFormationsFaites(user.id);
      setFaitsIds(faits);

      // Fetch session_parties to get ALL dates (incl. middle dates lost in the denormalized `dates` string)
      const sessionIds = inscRows.filter(i => i.session_id != null).map(i => i.session_id as number);
      if (sessionIds.length > 0) {
        const { data: parties } = await supabase
          .from("session_parties")
          .select("session_id, jours, date_debut, date_fin")
          .in("session_id", sessionIds);
        setSessionParties(parties || []);
      }

      setLoading(false);
    });
  }, [user, profile]);

  // Load alertes + options when user is available
  useEffect(() => {
    if (!user) return;
    supabase.from("alertes_email").select("id, type, valeur").eq("user_id", user.id).then(({ data: d }: { data: AlerteRow[] | null }) => setAlertes(d || []));
    supabase.from("organismes").select("id, nom").order("nom").then(({ data: d }: { data: { id: number; nom: string }[] | null }) => setOrgsForAlert(d || []));
    supabase.from("formateurs").select("id, nom").order("nom").then(({ data: d }: { data: { id: number; nom: string }[] | null }) => setFmtsForAlert(d || []));
    fetchDomainesFiltres().then(doms => setDomsForAlert(doms.map(d => d.nom))).catch(() => {});
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const addAlerte = async (type: string, valeur: string) => {
    if (!user || !valeur.trim()) return;
    if (alertes.some(a => a.type === type && a.valeur === valeur)) return;
    const { data, error } = await supabase.from("alertes_email").insert({ user_id: user.id, type, valeur: valeur.trim() }).select().single();
    if (!error && data) {
      setAlertes(prev => [...prev, data as AlerteRow]);
      setAlertMsg("✓ Alerte ajoutée !");
      setTimeout(() => setAlertMsg(""), 2000);
    }
  };

  const removeAlerte = async (id: number) => {
    await supabase.from("alertes_email").delete().eq("id", id);
    setAlertes(prev => prev.filter(a => a.id !== id));
  };

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
    if (!isResetFlow && !currentPw) { setPwMsg("Veuillez saisir votre mot de passe actuel."); return; }
    setPwSaving(true); setPwMsg("");
    if (!isResetFlow) {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: user!.email!, password: currentPw });
      if (authErr) { setPwMsg("Mot de passe actuel incorrect."); setPwSaving(false); return; }
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setPwMsg("Erreur: " + error.message); } else { setPwMsg("✓ Mot de passe mis à jour"); setCurrentPw(""); setNewPw(""); setTimeout(() => { setPwMsg(""); setShowPwChange(false); }, 2000); }
    setPwSaving(false);
  };

  if (!user) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>Connectez-vous pour accéder à votre compte.</div>;
  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  const inscF = formations.filter(f => inscriptionIds.includes(f.id));
  const favF = formations.filter(f => favoriIds.includes(f.id));
  const faitsF = formations.filter(f => faitsIds.includes(f.id));
  const myAvis = avis.filter(a => a.user_id === user.id);

  const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>Mon compte 🍿</h1>
        <p style={{ fontSize: 13, color: C.textTer }}>{profile?.full_name} · {user.email}</p>
      </div>

      {/* Quick-actions */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(140px, 1fr))", gap: mob ? 8 : 10, marginBottom: 20 }}>
        {[
          { icon: "🔍", label: "Trouver une formation", color: C.accent, bg: C.accentBg, action: () => router.push("/catalogue") },
          { icon: "📅", label: "Mon calendrier", color: C.blue, bg: C.blueBg, action: () => setTab("calendrier") },
          { icon: "⭐", label: "Donner un avis", color: C.yellowDark, bg: C.yellowBg, action: () => setTab("faites") },
          { icon: "❤️", label: "Mes favoris", color: C.pink, bg: C.pinkBg, action: () => setTab("favoris") },
          { icon: "🔔", label: "Mes alertes", color: C.blue, bg: C.blueBg, action: () => setTab("alertes") },
        ].map(item => (
          <button key={item.label} onClick={item.action} style={{ padding: mob ? "12px 8px" : "14px 12px", borderRadius: 14, border: "1.5px solid " + item.bg, background: item.bg, color: item.color, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
            <span style={{ fontSize: mob ? 20 : 24 }}>{item.icon}</span>
            <span style={{ fontSize: mob ? 10 : 11, fontWeight: 700, lineHeight: 1.3 }}>{item.label}</span>
          </button>
        ))}
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
          {!isResetFlow && (
            <>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4 }}>Mot de passe actuel</label>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} style={{ ...inputStyle, maxWidth: 300, marginBottom: 12 }} autoComplete="current-password" />
            </>
          )}
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4 }}>Nouveau mot de passe</label>
          <div style={{ position: "relative", maxWidth: 300 }}>
            <input type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChangePw()} style={{ ...inputStyle, paddingRight: 40 }} autoComplete="new-password" />
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
        <button onClick={() => { setTab("inscriptions"); setSearch(""); }} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "inscriptions" ? C.accentBg : "transparent", color: tab === "inscriptions" ? C.accent : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "inscriptions" ? 700 : 500, cursor: "pointer" }}>📋 Inscriptions ({inscF.length + webInscs.length})</button>
        <button onClick={() => setTab("calendrier")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "calendrier" ? "rgba(46,124,230,0.1)" : "transparent", color: tab === "calendrier" ? "#2E7CE6" : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "calendrier" ? 700 : 500, cursor: "pointer" }}>📅 Calendrier</button>
        <button onClick={() => setTab("avis")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "avis" ? "rgba(232,123,53,0.1)" : "transparent", color: tab === "avis" ? "#E87B35" : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "avis" ? 700 : 500, cursor: "pointer" }}>⭐ Avis ({myAvis.length})</button>
        <button onClick={() => setTab("favoris")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "favoris" ? C.pinkBg : "transparent", color: tab === "favoris" ? C.pink : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "favoris" ? 700 : 500, cursor: "pointer" }}>❤️ Favoris ({favF.length})</button>
        <button onClick={() => setTab("faites")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "faites" ? C.greenBg : "transparent", color: tab === "faites" ? C.green : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "faites" ? 700 : 500, cursor: "pointer" }}>✅ Faites ({faitsF.length})</button>
        <button onClick={() => setTab("alertes")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "alertes" ? C.blueBg : "transparent", color: tab === "alertes" ? C.blue : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "alertes" ? 700 : 500, cursor: "pointer" }}>🔔 Alertes ({alertes.length})</button>
      </div>

      {tab === "favoris" && (
        <div>
          {favF.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>❤️</div>
              <p>Aucun favori. Explorez le <Link href="/catalogue" style={{ color: C.accent, fontWeight: 600 }}>catalogue</Link> !</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(240px,100%),1fr))", gap: 10, paddingBottom: 40 }}>
              {favF.map(f => (
                <div key={f.id} style={{ position: "relative" }}>
                  <FormationCard f={f} mob={mob} compact />
                  <button onClick={() => handleToggleFav(f.id)} style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>❤️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "faites" && (
        <div>
          {faitsF.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <p>Aucune formation marquée comme effectuée.<br />
                <span style={{ fontSize: 12 }}>Sur la page d&apos;une formation, cliquez sur &quot;Marquer faite&quot;.</span>
              </p>
            </div>
          ) : (
            <>
              <div style={{ padding: "14px 18px", background: C.yellowBg, borderRadius: 12, border: "1px solid " + C.yellow + "55", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>⭐</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.yellowDark, marginBottom: 2 }}>Partagez votre expérience !</div>
                  <div style={{ fontSize: 12, color: C.textSec }}>Votre avis aide la communauté d&apos;orthophonistes à choisir les meilleures formations.</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(240px,100%),1fr))", gap: 10, paddingBottom: 40, alignItems: "start" }}>
                {faitsF.map(f => {
                  const hasAvis = myAvis.some(a => a.formation_id === f.id);
                  const isOpen = avisFormId === f.id;
                  return (
                    <div key={f.id} style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ position: "relative" }}>
                        <FormationCard f={f} mob={mob} compact />
                        <button onClick={async () => { await toggleFormationFaite(user!.id, f.id); setFaitsIds(prev => prev.filter(id => id !== f.id)); }} style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.95)", border: "1.5px solid " + C.green + "44", color: C.green, fontSize: 10, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>✅ Faite</button>
                      </div>
                      {!hasAvis && !isOpen && (
                        <button onClick={() => { setAvisFormId(f.id); setAvisNote(5); setAvisTexte(""); setAvisSubContenu(5); setAvisSubOrganisation(5); setAvisSubSupports(5); setAvisSubPertinence(5); }} style={{ marginTop: 6, padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.yellow + "55", background: C.yellowBg, color: C.yellowDark, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
                          ⭐ Donner mon avis sur cette formation
                        </button>
                      )}
                      {hasAvis && (
                        <div style={{ marginTop: 6, padding: "8px 14px", borderRadius: 10, background: C.greenBg, color: C.green, fontSize: 12, fontWeight: 700, textAlign: "center" }}>✓ Avis publié</div>
                      )}
                      {isOpen && (
                        <div style={{ marginTop: 6, padding: "14px 16px", background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Votre avis</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Note globale</span>
                            <div style={{ display: "flex", gap: 2 }}>{[1,2,3,4,5].map(i => (
                              <button key={i} type="button" onClick={() => setAvisNote(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, opacity: avisNote >= i ? 1 : 0.25, padding: 0 }}>⭐</button>
                            ))}</div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{avisNote}/5</span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSec, marginBottom: 8 }}>Détaillez votre expérience :</div>
                          {([
                            { label: "Contenu pédagogique", val: avisSubContenu, set: setAvisSubContenu },
                            { label: "Organisation", val: avisSubOrganisation, set: setAvisSubOrganisation },
                            { label: "Supports fournis", val: avisSubSupports, set: setAvisSubSupports },
                            { label: "Pertinence pratique", val: avisSubPertinence, set: setAvisSubPertinence },
                          ] as { label: string; val: number; set: (v: number) => void }[]).map(({ label, val, set }) => (
                            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 12, color: C.textSec, width: 140, flexShrink: 0 }}>{label}</span>
                              <div style={{ display: "flex", gap: 2 }}>{[1,2,3,4,5].map(i => (
                                <button key={i} type="button" onClick={() => set(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: val >= i ? 1 : 0.25, padding: 0 }}>⭐</button>
                              ))}</div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{val}/5</span>
                            </div>
                          ))}
                          <textarea value={avisTexte} onChange={e => setAvisTexte(e.target.value)} placeholder="Partagez votre expérience..." style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, resize: "vertical", marginTop: 12, boxSizing: "border-box", fontFamily: "inherit" }} />
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button onClick={async () => {
                              if (!user) return;
                              setAvisSubmitting(true);
                              await addAvis(f.id, user.id, profile?.full_name || "Anonyme", avisNote, avisTexte.trim(), { contenu: avisSubContenu, organisation: avisSubOrganisation, supports: avisSubSupports, pertinence: avisSubPertinence });
                              const fresh = await fetchAvis();
                              setAvis(fresh);
                              setAvisFormId(null);
                              setAvisSubmitting(false);
                            }} disabled={avisSubmitting} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: avisSubmitting ? 0.6 : 1 }}>
                              {avisSubmitting ? "⏳..." : "Publier"}
                            </button>
                            <button onClick={() => setAvisFormId(null)} style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>Annuler</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
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
            const fmtD = (iso: string) => {
              const d = new Date(iso + "T12:00:00");
              const m = ["jan.","fév.","mars","avr.","mai","juin","juil.","août","sep.","oct.","nov.","déc."];
              return d.getDate() + " " + m[d.getMonth()] + " " + d.getFullYear();
            };
            return filtered.length === 0
              ? <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Aucune inscription.</div>
              : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(240px,100%),1fr))", gap: 10, paddingBottom: 40, alignItems: "start" }}>
                {filtered.map(f => {
                  const inscRows = inscs.filter(i => i.formation_id === f.id);
                  // Une bande par session inscrite (gère 2 sessions de la même formation)
                  const strips = inscRows.map((inscRow, idx) => {
                    const session = inscRow.session_id != null ? (f.sessions || []).find(s => s.id === inscRow.session_id) : null;
                    const partyRows = session ? sessionParties.filter(p => p.session_id === session.id) : [];
                    const allDates: string[] = [];
                    partyRows.forEach(p => {
                      if (p.jours) {
                        p.jours.split(",").map(d => d.trim()).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).forEach(d => { if (!allDates.includes(d)) allDates.push(d); });
                      } else if (p.date_debut) {
                        if (!allDates.includes(p.date_debut)) allDates.push(p.date_debut);
                        if (p.date_fin && p.date_fin !== p.date_debut && !allDates.includes(p.date_fin)) allDates.push(p.date_fin);
                      }
                    });
                    if (allDates.length === 0 && session?.dates) {
                      (session.dates.match(/\d{4}-\d{2}-\d{2}/g) || []).forEach(d => allDates.push(d));
                    }
                    const dateStr = allDates.length === 0 ? null : allDates.length === 1 ? fmtD(allDates[0]) : fmtD(allDates[0]) + " → " + fmtD(allDates[allDates.length - 1]);
                    const lieu = session?.lieu;
                    const sessionIdx = session ? (f.sessions || []).findIndex(s => s.id === session.id) : -1;
                    if (!dateStr && !lieu) return null;
                    return (
                      <div key={idx} style={{ padding: "7px 12px", background: C.bgAlt, borderRadius: idx === inscRows.length - 1 ? "0 0 12px 12px" : 0, border: "1px solid " + C.borderLight, borderTop: "none", fontSize: 11, color: C.textSec, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        {inscRows.length > 1 && sessionIdx >= 0 && <span style={{ fontWeight: 700, color: C.textTer, minWidth: 60 }}>Session {sessionIdx + 1}</span>}
                        {dateStr && <span>📅 {dateStr}</span>}
                        {lieu && <span>📍 {lieu}</span>}
                      </div>
                    );
                  }).filter(Boolean);
                  return (
                    <div key={f.id} style={{ position: "relative" }}>
                      <FormationCard f={f} mob={mob} compact />
                      {strips}
                      <button onClick={async () => {
                        if (!confirm("Se désinscrire de cette formation ?")) return;
                        await supabase.from("inscriptions").delete().eq("user_id", user.id).eq("formation_id", f.id);
                        setInscriptionIds(prev => prev.filter(id => id !== f.id));
                        setInscs(prev => prev.filter(i => i.formation_id !== f.id));
                      }} style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.95)", border: "1px solid " + C.border, color: C.pink, fontSize: 10, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>✕ Se désinscrire</button>
                    </div>
                  );
                })}
              </div>;
          })()}

          {/* Webinaires inscrits */}
          {webInscs.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textSec, marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>💻 Mes webinaires</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 40 }}>
                {webInscs.map(wi => {
                  const w = wi.webinaire;
                  if (!w) return null;
                  const d = new Date(w.date_heure);
                  const isPast = d < new Date();
                  const fmtDate = (dt: Date) => {
                    const m = ["jan.","fév.","mars","avr.","mai","juin","juil.","août","sep.","oct.","nov.","déc."];
                    return dt.getDate() + " " + m[dt.getMonth()] + " " + dt.getFullYear() + " à " + String(dt.getHours()).padStart(2,"0") + "h" + String(dt.getMinutes()).padStart(2,"0");
                  };
                  return (
                    <div key={wi.id} style={{ padding: "14px 16px", background: C.surface, borderRadius: 14, border: "1.5px solid " + C.borderLight, display: "flex", flexDirection: mob ? "column" : "row", alignItems: mob ? "flex-start" : "center", gap: 12, justifyContent: "space-between" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isPast ? C.textTer : C.text, marginBottom: 4 }}>{w.titre}</div>
                        <div style={{ fontSize: 12, color: C.textTer }}>📅 {fmtDate(d)}{isPast ? " · Passé" : ""}</div>
                        {w.organisme?.nom && <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>{w.organisme.nom}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                        {!isPast && w.lien_url && (
                          <a href={w.lien_url} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 16px", borderRadius: 9, background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Rejoindre →</a>
                        )}
                        <button onClick={async () => {
                          if (!confirm("Se désinscrire de ce webinaire ?")) return;
                          await supabase.from("webinaire_inscriptions").delete().eq("id", wi.id);
                          setWebInscs(prev => prev.filter(x => x.id !== wi.id));
                        }} style={{ padding: "6px 12px", borderRadius: 8, background: "none", border: "1px solid " + C.border, color: C.pink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Se désinscrire</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "calendrier" && (
        <div>
          {inscF.length === 0 && webInscs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              <p>Aucune inscription à afficher dans le calendrier.</p>
            </div>
          ) : (
            <div style={{ paddingBottom: 40 }}>
              {(() => {
                type WebEntry = { id: number; titre: string; date_heure: string; lien_url?: string; organisme?: { nom: string } };
                type CalEvt = { date: string; entries: { formation: Formation; sessionId: number }[]; webEntries: WebEntry[] };
                const events: CalEvt[] = [];
                inscs.forEach(({ formation_id, session_id }) => {
                  const f = inscF.find(ff => ff.id === formation_id);
                  if (!f) return;
                  const allDates: string[] = [];
                  if (session_id != null) {
                    const partyRows = sessionParties.filter(p => p.session_id === session_id);
                    if (partyRows.length > 0) {
                      partyRows.forEach(p => {
                        if (p.jours) {
                          p.jours.split(",").map(d => d.trim()).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).forEach(d => { if (!allDates.includes(d)) allDates.push(d); });
                        } else if (p.date_debut) {
                          if (!allDates.includes(p.date_debut)) allDates.push(p.date_debut);
                          if (p.date_fin && p.date_fin !== p.date_debut && !allDates.includes(p.date_fin)) allDates.push(p.date_fin);
                        }
                      });
                    }
                    if (allDates.length === 0) {
                      const s = (f.sessions || []).find(ss => ss.id === session_id);
                      if (s?.dates) (s.dates.match(/\d{4}-\d{2}-\d{2}/g) || []).forEach(d => allDates.push(d));
                    }
                  } else {
                    (f.sessions || []).forEach(s => {
                      if (s.dates) (s.dates.match(/\d{4}-\d{2}-\d{2}/g) || []).forEach(d => { if (!allDates.includes(d)) allDates.push(d); });
                    });
                  }
                  const sid = session_id ?? -formation_id;
                  allDates.forEach(dateKey => {
                    let ev = events.find(e => e.date === dateKey);
                    if (!ev) { ev = { date: dateKey, entries: [], webEntries: [] }; events.push(ev); }
                    if (!ev.entries.find(e => e.sessionId === sid)) ev.entries.push({ formation: f, sessionId: sid });
                  });
                });
                // Ajouter les webinaires au calendrier
                webInscs.forEach(wi => {
                  const w = wi.webinaire;
                  if (!w?.date_heure) return;
                  const dateKey = w.date_heure.slice(0, 10);
                  let ev = events.find(e => e.date === dateKey);
                  if (!ev) { ev = { date: dateKey, entries: [], webEntries: [] }; events.push(ev); }
                  if (!ev.webEntries.find(e => e.id === w.id)) ev.webEntries.push(w);
                });
                events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
                const JOURS_SHORT = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
                const now = new Date();

                // Grouper par mois
                type MonthGroup = { key: string; label: string; events: CalEvt[] };
                const monthGroups: MonthGroup[] = [];
                events.forEach(evt => {
                  const d = new Date(evt.date + "T12:00:00");
                  const key = `${d.getFullYear()}-${d.getMonth()}`;
                  let g = monthGroups.find(g => g.key === key);
                  if (!g) { g = { key, label: `${MOIS[d.getMonth()]} ${d.getFullYear()}`, events: [] }; monthGroups.push(g); }
                  g.events.push(evt);
                });

                if (monthGroups.length === 0) return <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Aucune date à afficher.</div>;

                return monthGroups.map(group => (
                  <div key={group.key} style={{ marginBottom: 28 }}>
                    {/* Month header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.07em" }}>{group.label}</div>
                      <div style={{ flex: 1, height: 1, background: C.borderLight }} />
                    </div>
                    {/* Events */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {group.events.map((event, i) => {
                        const date = new Date(event.date + "T12:00:00");
                        const isPast = date < now;
                        const jourNom = JOURS_SHORT[date.getDay()];
                        const jourNum = date.getDate();
                        return (
                          <div key={i} style={{ opacity: isPast ? 0.5 : 1, display: "flex", flexDirection: "column", gap: 6 }}>
                            {event.entries.map(({ formation: f, sessionId }) => {
                              const session = (f.sessions || []).find(s => s.id === sessionId);
                              const sessionIdx = (f.sessions || []).findIndex(s => s.id === sessionId);
                              const lieu = session?.lieu;
                              return (
                                <Link key={sessionId} href={`/formation/${f.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                                  <div style={{ display: "flex", gap: 0, background: C.surface, borderRadius: 12, border: "1.5px solid " + (isPast ? C.borderLight : C.border), overflow: "hidden" }}>
                                    <div style={{ width: 56, flexShrink: 0, background: isPast ? C.bgAlt : C.accentBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0" }}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: isPast ? C.textTer : C.accent, textTransform: "uppercase" }}>{jourNom}</div>
                                      <div style={{ fontSize: 22, fontWeight: 800, color: isPast ? C.textTer : C.accent, lineHeight: 1.1 }}>{jourNum}</div>
                                    </div>
                                    <div style={{ flex: 1, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: mob ? 12 : 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.titre}</div>
                                        <div style={{ fontSize: 11, color: C.textTer, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                          <span>{f.domaine}</span>
                                          {sessionIdx >= 0 && <span>· Session {sessionIdx + 1}</span>}
                                          {lieu && !/visio/i.test(lieu) && <span>· 📍 {lieu}</span>}
                                          {lieu && /visio/i.test(lieu) && <span>· 💻 Visio</span>}
                                        </div>
                                      </div>
                                      <span style={{ fontSize: 14, color: C.textTer, flexShrink: 0 }}>→</span>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                            {event.webEntries.map(w => {
                              const wDate = new Date(w.date_heure);
                              const heure = String(wDate.getHours()).padStart(2, "0") + "h" + String(wDate.getMinutes()).padStart(2, "0");
                              return (
                                <div key={w.id} style={{ display: "flex", gap: 0, background: C.surface, borderRadius: 12, border: "1.5px solid " + (isPast ? C.borderLight : "#7C3AED44"), overflow: "hidden" }}>
                                  <div style={{ width: 56, flexShrink: 0, background: isPast ? C.bgAlt : "#F3EFFE", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0" }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: isPast ? C.textTer : "#7C3AED", textTransform: "uppercase" }}>{jourNom}</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: isPast ? C.textTer : "#7C3AED", lineHeight: 1.1 }}>{jourNum}</div>
                                  </div>
                                  <div style={{ flex: 1, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: mob ? 12 : 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.titre}</div>
                                      <div style={{ fontSize: 11, color: C.textTer, marginTop: 2, display: "flex", gap: 8 }}>
                                        <span>💻 Webinaire · {heure}</span>
                                        {w.organisme?.nom && <span>· {w.organisme.nom}</span>}
                                      </div>
                                    </div>
                                    {!isPast && w.lien_url ? (
                                      <a href={w.lien_url} target="_blank" rel="noopener noreferrer" style={{ padding: "5px 12px", borderRadius: 8, background: "#7C3AED", color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>Rejoindre</a>
                                    ) : <span style={{ fontSize: 14, color: C.textTer, flexShrink: 0 }}>→</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}
      {tab === "alertes" && (
        <div style={{ paddingBottom: 48 }}>
          <div style={{ padding: "14px 16px", background: C.blueBg, borderRadius: 12, border: "1px solid " + C.blue + "33", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginBottom: 2 }}>Alertes email</div>
              <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.5 }}>Recevez un email dès qu&apos;une nouvelle formation correspond à vos critères.</div>
            </div>
          </div>

          {alertMsg && <div style={{ fontSize: 12, color: C.green, fontWeight: 600, marginBottom: 12 }}>{alertMsg}</div>}

          {/* Existing alertes */}
          {alertes.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Mes alertes actives</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {alertes.map(a => {
                  const typeLabel: Record<string, string> = { organisme: "🏢 Organisme", formateur: "🎤 Formateur", domaine: "📚 Domaine", mots_cles: "🔍 Mot-clé" };
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: C.surface, border: "1.5px solid " + C.borderLight, borderRadius: 12, gap: 10 }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: 0.4 }}>{typeLabel[a.type] || a.type}</span>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 1 }}>{a.valeur}</div>
                      </div>
                      <button onClick={() => removeAlerte(a.id)} style={{ padding: "4px 10px", borderRadius: 8, border: "1.5px solid " + C.pink + "44", background: C.pinkBg, color: C.pink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Supprimer</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add alerte forms */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              {
                label: "Par organisme", type: "organisme", icon: "🏢",
                input: (
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={alertOrg} onChange={e => setAlertOrg(e.target.value)} style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                      <option value="">Choisir un organisme…</option>
                      {orgsForAlert.map(o => <option key={o.id} value={o.nom}>{o.nom}</option>)}
                    </select>
                    <button onClick={() => { addAlerte("organisme", alertOrg); setAlertOrg(""); }} disabled={!alertOrg} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: alertOrg ? C.gradient : C.bgAlt, color: alertOrg ? "#fff" : C.textTer, fontSize: 12, fontWeight: 700, cursor: alertOrg ? "pointer" : "default", flexShrink: 0 }}>+ Ajouter</button>
                  </div>
                )
              },
              {
                label: "Par formateur", type: "formateur", icon: "🎤",
                input: (
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={alertFmt} onChange={e => setAlertFmt(e.target.value)} style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                      <option value="">Choisir un formateur…</option>
                      {fmtsForAlert.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
                    </select>
                    <button onClick={() => { addAlerte("formateur", alertFmt); setAlertFmt(""); }} disabled={!alertFmt} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: alertFmt ? C.gradient : C.bgAlt, color: alertFmt ? "#fff" : C.textTer, fontSize: 12, fontWeight: 700, cursor: alertFmt ? "pointer" : "default", flexShrink: 0 }}>+ Ajouter</button>
                  </div>
                )
              },
              {
                label: "Par domaine", type: "domaine", icon: "📚",
                input: (
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={alertDom} onChange={e => setAlertDom(e.target.value)} style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                      <option value="">Choisir un domaine…</option>
                      {domsForAlert.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button onClick={() => { addAlerte("domaine", alertDom); setAlertDom(""); }} disabled={!alertDom} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: alertDom ? C.gradient : C.bgAlt, color: alertDom ? "#fff" : C.textTer, fontSize: 12, fontWeight: 700, cursor: alertDom ? "pointer" : "default", flexShrink: 0 }}>+ Ajouter</button>
                  </div>
                )
              },
              {
                label: "Par mot-clé", type: "mots_cles", icon: "🔍",
                input: (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={alertKw} onChange={e => setAlertKw(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && alertKw.trim()) { addAlerte("mots_cles", alertKw); setAlertKw(""); } }} placeholder="ex : bégaiement, dyslexie, EBP…" style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    <button onClick={() => { if (alertKw.trim()) { addAlerte("mots_cles", alertKw); setAlertKw(""); } }} disabled={!alertKw.trim()} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: alertKw.trim() ? C.gradient : C.bgAlt, color: alertKw.trim() ? "#fff" : C.textTer, fontSize: 12, fontWeight: 700, cursor: alertKw.trim() ? "pointer" : "default", flexShrink: 0 }}>+ Ajouter</button>
                  </div>
                )
              },
            ].map(({ label, type: _, icon, input }) => (
              <div key={label} style={{ padding: "16px 16px", background: C.surface, border: "1.5px solid " + C.borderLight, borderRadius: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textSec, marginBottom: 10 }}>{icon} {label}</div>
                {input}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
