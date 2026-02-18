"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { C, fetchFormations, fetchAvis, fetchInscriptions, fetchFavoris, toggleFavori, type Formation, type Avis } from "@/lib/data";
import { FormationCard, StarRow } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase-data";

type InscRow = { formation_id: number; session_id?: number | null };

// ─── Composant calendrier ── hooks toujours au top level ──────────────
function CalendrierTab({ inscF, inscs, congresInscs, setCongresInscs, webInscs, setWebInscs, setInscs, setInscriptionIds, user, mob }: {
  inscF: Formation[]; inscs: InscRow[]; congresInscs: any[]; setCongresInscs: (v: any[]) => void; webInscs: any[];
  setWebInscs: (v: any[]) => void; setInscs: (fn: (prev: InscRow[]) => InscRow[]) => void;
  setInscriptionIds: (fn: (prev: number[]) => number[]) => void;
  user: any; mob: boolean;
}) {
  const { supabase: sb } = { supabase };
  const domColors: Record<string, string> = {
    "Langage oral": C.green, "Neurologie": C.blue, "Langage écrit": C.blue,
    "OMF": C.pink, "Cognition mathématique": C.orange, "Pratique professionnelle": C.accent,
  };

  // Parse a date string like "14-15 mai 2026" → Date for sorting
  const parseSessionDate = (dates: string): Date | null => {
    if (!dates) return null;
    const allMonths: Record<string, number> = {
      janvier: 0, fevrier: 1, "février": 1, mars: 2, avril: 3, mai: 4, juin: 5,
      juillet: 6, "août": 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, "décembre": 11, decembre: 11,
      jan: 0, "fév": 1, fev: 1, mar: 2, avr: 3, jul: 6, "aoû": 7, aou: 7, sep: 8, oct: 9, nov: 10, "déc": 11, dec: 11,
    };
    const monthPat = Object.keys(allMonths).sort((a,b) => b.length-a.length).join("|");
    // Match: day (possibly range like 14-15), month name, year
    const re = new RegExp(`(\\d{1,2})(?:[^\\d\\w]|\\s)*(?:\\d{1,2}[^\\d\\w])?\\s*(${monthPat})\\s*(\\d{4})`, "i");
    const m = dates.match(re);
    if (m) return new Date(parseInt(m[3]), allMonths[m[2].toLowerCase()], parseInt(m[1]));
    // Fallback: month + year only
    const re2 = new RegExp(`(${monthPat})\\s*(\\d{4})`, "i");
    const m2 = dates.match(re2);
    if (m2) return new Date(parseInt(m2[2]), allMonths[m2[1].toLowerCase()], 1);
    // Last resort: native Date.parse
    const p = Date.parse(dates);
    if (!isNaN(p)) return new Date(p);
    return null;
  };

  const allSessions = inscF.flatMap(f => {
    const inscriptions = inscs.filter(i => i.formation_id === f.id);
    const list = f.sessions || [];
    let filtered: typeof list;
    if (inscriptions.length === 0) { filtered = []; }
    else {
      const sessionIds = inscriptions.map(i => i.session_id).filter(id => id != null);
      filtered = sessionIds.length === 0 ? list : list.filter(s => sessionIds.includes(s.id));
    }
    return filtered.map((s, i) => ({ ...s, titre: f.titre, fId: f.id, domaine: f.domaine, key: f.id + "-" + s.id + "-" + i, type: "formation" as const, _sortDate: parseSessionDate(s.dates) }));
  });

  // All events unified for calendar
  type CalEvent = { key: string; type: "formation" | "congres" | "webinaire"; titre: string; _sortDate: Date | null; _monthKey: string; _data: any };

  const allEvents: CalEvent[] = [];

  allSessions.forEach(s => {
    const d = parseSessionDate(s.dates);
    let monthKey: string;
    if (d) {
      monthKey = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    } else {
      monthKey = "À planifier";
    }
    allEvents.push({ key: s.key, type: "formation", titre: s.titre, _sortDate: d, _monthKey: monthKey, _data: s });
  });

  // Congrès et webinaires désactivés pour la v1 — réactiver plus tard
  // congresInscs et webInscs conservés mais non affichés

  // Group by month, sort months chronologically
  const months: Record<string, CalEvent[]> = {};
  allEvents.forEach(ev => {
    if (!months[ev._monthKey]) months[ev._monthKey] = [];
    months[ev._monthKey].push(ev);
  });

  // Sort months: "À planifier" at end, others by date
  const sortedMonths = Object.entries(months).sort(([a], [b]) => {
    if (a === "À planifier") return 1;
    if (b === "À planifier") return -1;
    const da = new Date("01 " + a); const db = new Date("01 " + b);
    return da.getTime() - db.getTime();
  });

  // Sort events within each month by date
  sortedMonths.forEach(([, evts]) => evts.sort((a, b) => {
    if (!a._sortDate) return 1; if (!b._sortDate) return -1;
    return a._sortDate.getTime() - b._sortDate.getTime();
  }));

  const handleDesinscribeFormation = async (ev: CalEvent) => {
    if (!confirm("Se désinscrire de cette session ?")) return;
    const s = ev._data;
    if (s.id) {
      await supabase.from("inscriptions").delete().eq("user_id", user.id).eq("formation_id", s.fId).eq("session_id", s.id);
    } else {
      await supabase.from("inscriptions").delete().eq("user_id", user.id).eq("formation_id", s.fId);
    }
    setInscs(prev => {
      const remaining = prev.filter(i => !(i.formation_id === s.fId && (s.id ? i.session_id === s.id : true)));
      // If no more sessions for this formation, remove from inscriptionIds
      const stillHas = remaining.some(i => i.formation_id === s.fId);
      if (!stillHas) setInscriptionIds(prev2 => prev2.filter(id => id !== s.fId));
      return remaining;
    });
  };

  const handleDesinscribeCongres = async (ev: CalEvent) => {
    if (!confirm("Se désinscrire de ce congrès ?")) return;
    await supabase.from("congres_inscriptions").delete().eq("user_id", user.id).eq("congres_id", ev._data.id);
    setCongresInscs(congresInscs.filter((c: any) => c.id !== ev._data.id));
  };

  const handleDesinscribeWebinaire = async (ev: CalEvent) => {
    if (!confirm("Se désinscrire de ce webinaire ?")) return;
    await supabase.from("webinaire_inscriptions").delete().eq("user_id", user.id).eq("webinaire_id", ev._data.id);
    setWebInscs(webInscs.filter(w => w.id !== ev._data.id));
  };

  const isEmpty = allEvents.length === 0;

  return (
    <div style={{ paddingBottom: 40 }}>
      {isEmpty ? (
        <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <p>Aucun événement planifié. Inscrivez-vous à des formations pour les voir apparaître ici.</p>
        </div>
      ) : sortedMonths.map(([month, events]) => (
        <div key={month} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10, textTransform: "capitalize" }}>📅 {month}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {events.map(ev => {
              const borderColor = ev.type === "congres" ? C.accent : ev.type === "webinaire" ? "#7C3AED" : (domColors[ev._data?.domaine] || C.accent);
              const badgeBg = ev.type === "congres" ? C.accentBg : ev.type === "webinaire" ? "#7C3AED11" : C.accentBg;
              const badgeColor = ev.type === "congres" ? C.accent : ev.type === "webinaire" ? "#7C3AED" : C.accent;
              const href = ev.type === "congres" ? `/congres/${ev._data.id}` : ev.type === "webinaire" ? `/webinaires` : `/formation/${ev._data.fId}`;
              const dateLabel = ev._sortDate ? ev._sortDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ev._data?.dates || "—";
              const badge = ev.type === "congres" ? "🎤 Congrès" : ev.type === "webinaire" ? "📡 Webinaire" : ev._data?.domaine;
              const subtitle = ev.type === "webinaire"
                ? (ev._sortDate ? ev._sortDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + " à " + ev._sortDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "")
                : ev.type === "congres"
                  ? (ev._data?.adresse || "")
                  : `📍 ${ev._data?.lieu || ""}${ev._data?.adresse ? " — " + ev._data.adresse : ""}`;

              return (
                <div key={ev.key} style={{ display: "flex", gap: mob ? 8 : 12, alignItems: "center", padding: mob ? "10px 12px" : "11px 14px", background: C.surface, borderRadius: 12, border: "1px solid " + C.borderLight, borderLeft: "4px solid " + borderColor, flexWrap: "wrap" }}>
                  {/* Date badge */}
                  <span style={{ padding: "3px 9px", borderRadius: 8, background: badgeBg, color: badgeColor, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {ev.type === "formation" ? ev._data?.dates : dateLabel}
                  </span>
                  {/* Content — clickable */}
                  <Link href={href} style={{ flex: 1, minWidth: 140, textDecoration: "none", color: "inherit" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{ev.titre}</div>
                    {subtitle && <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>{subtitle}</div>}
                  </Link>
                  {/* Badge type */}
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: badgeBg, color: badgeColor, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>{badge}</span>
                  {/* Desinscription button */}
                  <button
                    onClick={() => {
                      if (ev.type === "formation") handleDesinscribeFormation(ev);
                      else if (ev.type === "congres") handleDesinscribeCongres(ev);
                      else handleDesinscribeWebinaire(ev);
                    }}
                    style={{ padding: "4px 10px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textTer, fontSize: 11, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
                    title="Se désinscrire"
                  >✕ Retirer</button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const [congresInscs, setCongresInscs] = useState<any[]>([]); // congrès inscrits
  const [webInscs, setWebInscs] = useState<any[]>([]); // webinaires inscrits
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
    // Load congrès inscrits
    supabase.from("congres_inscriptions").select("congres_id, congres:congres(id,titre,date,adresse,photo_url,lien_url)").eq("user_id", user.id).then(({ data }: { data: any[] | null }) => {
      if (data) setCongresInscs(data.map(d => d.congres).filter(Boolean));
    }).catch(() => {});
    // Load webinaires inscrits
    supabase.from("webinaire_inscriptions").select("webinaire_id, webinaire:webinaires(id,titre,date_heure,lien_url)").eq("user_id", user.id).then(({ data, error }: { data: any[] | null; error: any }) => {
      if (error) console.error("webinaire_inscriptions load error:", error.message);
      if (data) setWebInscs(data.map(d => d.webinaire).filter(Boolean));
    }).catch((e: any) => console.error("webinaire catch:", e.message));
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

  const planSessions = inscF.flatMap(f => {
    const inscriptions = inscs.filter(i => i.formation_id === f.id);
    const list = f.sessions || [];
    let filtered: typeof list;
    if (inscriptions.length === 0) { filtered = []; }
    else {
      const sessionIds = inscriptions.map(i => i.session_id).filter(id => id != null);
      filtered = sessionIds.length === 0 ? list : list.filter(s => sessionIds.includes(s.id));
    }
    return filtered.map((s, i) => ({ ...s, titre: f.titre, fId: f.id, key: f.id + "-" + s.id + "-" + i }));
  }).sort((a, b) => a.dates.localeCompare(b.dates));

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

          {/* Newsletter toggle */}
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
          {newPw && <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>{pwChecks.map(c => <span key={c.label} style={{ fontSize: 10, color: c.ok ? C.green : C.textTer }}>{c.ok ? "✓" : "○"} {c.label}</span>)}</div>}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <button onClick={handleChangePw} disabled={pwSaving || !pwValid} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: pwSaving || !pwValid ? 0.5 : 1 }}>Mettre à jour</button>
            {pwMsg && <span style={{ fontSize: 12, color: pwMsg.startsWith("✓") ? C.green : C.pink }}>{pwMsg}</span>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 18, padding: 4, background: C.bgAlt, borderRadius: 12, width: "fit-content", flexWrap: "wrap" }}>
        <button onClick={() => { setTab("inscriptions"); setSearch(""); }} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "inscriptions" ? C.accentBg : "transparent", color: tab === "inscriptions" ? C.accent : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "inscriptions" ? 700 : 500, cursor: "pointer" }}>📋 Inscriptions ({inscF.length})</button>
        <button onClick={() => setTab("calendrier")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "calendrier" ? C.accentBg : "transparent", color: tab === "calendrier" ? C.accent : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "calendrier" ? 700 : 500, cursor: "pointer" }}>📅 Calendrier</button>
        <button onClick={() => setTab("avis")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "avis" ? "rgba(232,123,53,0.1)" : "transparent", color: tab === "avis" ? "#E87B35" : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "avis" ? 700 : 500, cursor: "pointer" }}>⭐ Avis ({myAvis.length})</button>
        <button onClick={() => setTab("favoris")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: tab === "favoris" ? C.pinkBg : "transparent", color: tab === "favoris" ? C.pink : C.textTer, fontSize: mob ? 11 : 12, fontWeight: tab === "favoris" ? 700 : 500, cursor: "pointer" }}>❤️ Favoris ({favF.length})</button>
      </div>

      {tab === "calendrier" && <CalendrierTab inscF={inscF} inscs={inscs} congresInscs={congresInscs} setCongresInscs={setCongresInscs} webInscs={webInscs} setWebInscs={setWebInscs} setInscs={setInscs} setInscriptionIds={setInscriptionIds} user={user} mob={mob} />}

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
          {planSessions.length > 0 && (
            <div style={{ marginBottom: 20, padding: mob ? 12 : 16, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>📅 Planning</div>
              {planSessions.map(s => (
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
    </div>
  );
}
