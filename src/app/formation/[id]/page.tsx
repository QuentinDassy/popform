"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { C, getDC, getPhoto, fmtTitle, fetchFormation, fetchFormations, fetchAvis, fetchFavoris, toggleFavori, addAvis as addAvisDB, updateAvis as updateAvisDB, deleteAvis as deleteAvisDB, recalcFormationAvis, fetchInscriptions, fetchFormationsFaites, toggleFormationFaite, type Formation, type Avis, type Inscription } from "@/lib/data";
import { supabase } from "@/lib/supabase-data";
import { StarRow, PriseTag, FormationCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";

/* ===== DATE HELPER ===== */
const MOIS_FR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
function fmtDateFr(iso: string) {
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

/* ===== SKELETON ===== */
function Skeleton({ w = "100%", h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg, #F5EDD8 25%, #FFF3D6 50%, #F5EDD8 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />;
}
function PageSkeleton({ mob }: { mob: boolean }) {
  return (
    <div>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mob ? "16px" : "40px" }}>
        <Skeleton w="60%" h={32} /><div style={{ height: 16 }} />
        <Skeleton w="100%" h={mob ? 200 : 400} r={16} />
      </div>
    </div>
  );
}

/* ===== AVIS BAR ===== */
function AvisBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: C.textSec, width: 120, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.borderLight }}>
        <div style={{ width: `${pct}%`, height: 6, borderRadius: 3, background: C.gradient, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.text, width: 36, textAlign: "right" }}>{value.toFixed(1)}<span style={{ fontSize: 9, color: C.textTer }}>/{max}</span></span>
    </div>
  );
}

/* ===== AVIS SECTION ===== */
function AvisSection({ formationId, avis, onAdd, onEdit, onDelete, mob, userId }: { formationId: number; avis: Avis[]; onAdd: (note: number, texte: string, subs?: { contenu: number; organisation: number; supports: number; pertinence: number }) => Promise<void>; onEdit: (aId: number, note: number, texte: string) => Promise<void>; onDelete: (aId: number) => Promise<void>; mob: boolean; userId?: string }) {
  const fAvis = avis.filter(a => a.formation_id === formationId);
  const myAvis = userId ? fAvis.find(a => a.user_id === userId) : undefined;
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [note, setNote] = useState(myAvis?.note || 5);
  const [texte, setTexte] = useState(myAvis?.texte || "");
  const [subContenu, setSubContenu] = useState(5);
  const [subOrganisation, setSubOrganisation] = useState(5);
  const [subSupports, setSubSupports] = useState(5);
  const [subPertinence, setSubPertinence] = useState(5);
  const [certifie, setCertifie] = useState(false);
  const startEdit = () => { setNote(myAvis!.note); setTexte(myAvis!.texte); setEditMode(true); setShowForm(true) };
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const handleSubmit = async () => { 
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (editMode && myAvis) { 
        await onEdit(myAvis.id, note, texte.trim()); 
      } else { 
        await onAdd(note, texte.trim(), { contenu: subContenu, organisation: subOrganisation, supports: subSupports, pertinence: subPertinence }); 
      } 
      setShowForm(false); setEditMode(false);
    } catch(e) {
      setSubmitError("Erreur lors de la publication. Êtes-vous connecté·e ?");
    } finally {
      setSubmitting(false);
    }
  };
  const avg = fAvis.length ? Math.round(fAvis.reduce((s, a) => s + a.note, 0) / fAvis.length * 10) / 10 : 0;
  const notedContenu = fAvis.filter(a => a.note_contenu !== null);
  const notedOrga = fAvis.filter(a => a.note_organisation !== null);
  const notedSupports = fAvis.filter(a => a.note_supports !== null);
  const notedPertinence = fAvis.filter(a => a.note_pertinence !== null);
  const avgContenu = notedContenu.length ? Math.round(notedContenu.reduce((s, a) => s + a.note_contenu!, 0) / notedContenu.length * 10) / 10 : 0;
  const avgOrga = notedOrga.length ? Math.round(notedOrga.reduce((s, a) => s + a.note_organisation!, 0) / notedOrga.length * 10) / 10 : 0;
  const avgSupports = notedSupports.length ? Math.round(notedSupports.reduce((s, a) => s + a.note_supports!, 0) / notedSupports.length * 10) / 10 : 0;
  const avgPertinence = notedPertinence.length ? Math.round(notedPertinence.reduce((s, a) => s + a.note_pertinence!, 0) / notedPertinence.length * 10) / 10 : 0;
  // Satisfaction based on note globale only (sub-criteria are indicative)
  const pctSat = fAvis.length ? Math.round(avg * 20) : 0;

  const SubRatingInput = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: C.textSec, width: 140, flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", gap: 2 }}>{[1, 2, 3, 4, 5].map(i => (<button key={i} type="button" onClick={() => onChange(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: value >= i ? 1 : 0.25 }}>⭐</button>))}</div>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{value}/5</span>
    </div>
  );

  return (
    <div id="avis">
      {/* Summary bar */}
      <div style={{ display: "flex", gap: mob ? 12 : 24, alignItems: "center", padding: mob ? "16px" : "20px 24px", background: C.surface, borderRadius: 16, border: "1px solid " + C.borderLight, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center", minWidth: 80 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: C.yellow, lineHeight: 1 }}>{pctSat}%</div>
          <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>satisfaction</div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <AvisBar label="Contenu pédagogique" value={avgContenu} />
          <AvisBar label="Organisation" value={avgOrga} />
          <AvisBar label="Supports fournis" value={avgSupports} />
          <AvisBar label="Pertinence pratique" value={avgPertinence} />
        </div>
        <div style={{ textAlign: "center", minWidth: 80 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fAvis.length}</div>
          <div style={{ fontSize: 11, color: C.textTer }}>avis</div>
        </div>
      </div>

      {/* Add avis button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: C.text }}>Avis des participants</h3>
        {!showForm && (myAvis ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={startEdit} style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Modifier mon avis</button>
            <button onClick={async () => { if (!confirm("Supprimer votre avis ?")) return; await onDelete(myAvis.id); }} style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Supprimer</button>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Donner mon avis</button>
        ))}
      </div>

      {/* Avis form */}
      {showForm && (
        <div style={{ padding: mob ? 14 : 18, background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Note globale</span>
            <div style={{ display: "flex", gap: 2 }}>{[1, 2, 3, 4, 5].map(i => (<button key={i} type="button" onClick={() => setNote(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, opacity: note >= i ? 1 : 0.25 }}>⭐</button>))}</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{note}/5</span>
          </div>
          {!editMode && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textSec, marginBottom: 8 }}>Détaillez votre expérience :</div>
              <SubRatingInput label="Contenu pédagogique" value={subContenu} onChange={setSubContenu} />
              <SubRatingInput label="Organisation" value={subOrganisation} onChange={setSubOrganisation} />
              <SubRatingInput label="Supports fournis" value={subSupports} onChange={setSubSupports} />
              <SubRatingInput label="Pertinence pratique" value={subPertinence} onChange={setSubPertinence} />
            </>
          )}
          <textarea value={texte} onChange={e => setTexte(e.target.value)} placeholder="Partagez votre expérience..." style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, resize: "vertical", marginTop: 12 }} />
          {!editMode && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={certifie} onChange={e => setCertifie(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.accent, cursor: "pointer", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.textSec, lineHeight: 1.4 }}>Je certifie avoir assisté à cette formation</span>
            </label>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            {submitError && <p style={{ color: C.pink, fontSize: 12, marginBottom: 6, width: "100%" }}>{submitError}</p>}
            <button onClick={handleSubmit} disabled={submitting || (!editMode && !certifie)} title={!editMode && !certifie ? "Veuillez certifier avoir assisté à cette formation" : undefined} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: (!editMode && !certifie) ? "not-allowed" : "pointer", opacity: (submitting || (!editMode && !certifie)) ? 0.5 : 1 }}>{submitting ? "⏳..." : editMode ? "Modifier" : "Publier"}</button>
            <button onClick={() => { setShowForm(false); setEditMode(false); setCertifie(false); }} style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Avis list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {fAvis.slice(0, 5).map(a => (
          <div key={a.id} style={{ padding: mob ? 12 : 16, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: C.gradientSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700 }}>{a.user_name?.[0]?.toUpperCase() || "?"}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{a.user_name}</div>
                  <div style={{ fontSize: 10, color: C.textTer }}>{a.created_at?.slice(0, 10)}</div>
                </div>
              </div>
              <StarRow rating={a.note} />
            </div>
            <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6 }}>{a.texte}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FormationPage() {
  const { id } = useParams();
  const router = useRouter();
  const [f, setF] = useState<Formation | null>(null);
  const [loading, setLoading] = useState(true);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [isFav, setIsFav] = useState(false);
  const trackClick = (formationId: number) => {
    supabase.from("formation_clicks").insert({ formation_id: formationId }).then(() => {});
  };
  const [isFait, setIsFait] = useState(false);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [inscribing, setInscribing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastScrollAvis, setToastScrollAvis] = useState(false);
  const [photo, setPhoto] = useState<string>("");
  const { user, profile, setShowAuth } = useAuth();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };
  const mob = useIsMobile();
  const [formations, setFormations] = useState<Formation[]>([]);
  useEffect(() => {
    if (!id) return;
    fetchFormation(Number(id)).then(d => { setF(d); setLoading(false); if (d) setPhoto((d as any).photo_url || getPhoto(d.domaine)); }).catch(() => setLoading(false));
    fetchAvis(Number(id)).then(avisData => {
      setAvis(avisData);
      // Resync note/nb_avis on the formation if stale (handles legacy data)
      fetchFormation(Number(id)).then(formation => {
        if (formation && (formation.nb_avis !== avisData.length || (avisData.length > 0 && formation.nb_avis === 0))) {
          recalcFormationAvis(Number(id)).catch(() => {});
        }
      });
    });
    fetchFormations().then(setFormations);
    if (user) {
      fetchFavoris(user.id).then(favs => setIsFav(favs.some(fv => fv.formation_id === Number(id))));
      fetchFormationsFaites(user.id).then(ids => setIsFait(ids.includes(Number(id))));
      fetchInscriptions(user.id).then(setInscriptions);
    }
  }, [id, user]);

  const handleFav = async () => {
    if (!user) { setShowAuth(true); return; }
    const added = await toggleFavori(user.id, Number(id));
    setIsFav(added);
    if (added) showToast("Retrouvez vos favoris dans votre espace PopForm !");
  };

  const handleFait = async () => {
    if (!user) { setShowAuth(true); return; }
    const done = await toggleFormationFaite(user.id, Number(id));
    setIsFait(done);
    if (done) { setToastScrollAvis(true); showToast("✅ Formation effectuée ! Cliquez ici pour laisser un avis 📝"); }
    else { setToastScrollAvis(false); showToast("Formation retirée de vos formations faites."); }
  };

  const handleInscription = async (sessionId?: number) => {
    if (!user) { setShowAuth(true); return; }
    if (!f) return;
    setInscribing(true);
    const alreadyInscrit = inscriptions.some(i => i.formation_id === f.id && (sessionId ? i.session_id === sessionId : true));
    if (!alreadyInscrit) {
      const { error } = await supabase.from("inscriptions").insert({ user_id: user.id, formation_id: f.id, session_id: sessionId || null, status: "inscrit" });
      if (!error) {
        const updated = await fetchInscriptions(user.id);
        setInscriptions(updated);
        showToast("Retrouvez votre inscription dans votre espace PopForm !");
      }
    }
    setInscribing(false);
  };

  const handleAddAvis = async (note: number, texte: string, subs?: { contenu: number; organisation: number; supports: number; pertinence: number }): Promise<void> => {
    if (!user) throw new Error("Non connecté");
    const a = await addAvisDB(Number(id), user.id, profile?.full_name || "Anonyme", note, texte, subs);
    if (!a) throw new Error("Erreur base de données");
    setAvis(prev => [a, ...prev]);
  };

  const handleEditAvis = async (aId: number, note: number, texte: string): Promise<void> => {
    const ok = await updateAvisDB(aId, note, texte);
    if (!ok) throw new Error("Erreur mise à jour");
    setAvis(prev => prev.map(a => a.id === aId ? { ...a, note, texte } : a));
  };

  const handleDeleteAvis = async (aId: number): Promise<void> => {
    await deleteAvisDB(aId);
    setAvis(prev => prev.filter(a => a.id !== aId));
  };

  if (loading) return <PageSkeleton mob={mob} />;
  if (!f) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>Formation non trouvée.</div>;

  const dc = getDC(f.domaine);
  const domainPhoto = getPhoto(f.domaine);
  const sessions = f.sessions || [];
  const org = f.organisme;
  const formateur = f.formateur;
  const formateurs: typeof f.formateur[] = (f as any).formateurs?.length ? (f as any).formateurs : (formateur ? [formateur] : []);
  function fmtShortNom(fmt: NonNullable<typeof formateur>): string {
    const parts = fmt.nom.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0].toUpperCase()}. ${parts.slice(1).join(" ")}`;
    return fmt.nom;
  }
  const priseEnCharge = f.prise_en_charge || [];
  const hasSessionOrgs = sessions.some(s => (s as any).organisme || (s as any).organisme_libre);
  const fAvis = avis.filter(a => a.formation_id === f.id);
  const avg = fAvis.length ? (fAvis.reduce((s, a) => s + a.note, 0) / fAvis.length).toFixed(1) : "—";

  const getEmbedUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/").split("&")[0].replace("youtube.com/watch", "youtube.com/embed");
    if (url.includes("youtu.be/")) return "https://www.youtube.com/embed/" + url.split("youtu.be/")[1].split("?")[0];
    if (url.includes("youtube.com/embed/")) return url;
    return null;
  };
  const embedUrl = getEmbedUrl(f.video_url);

  /* JSON-LD for SEO */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: f.titre,
    description: f.description?.slice(0, 200),
    provider: org ? { "@type": "Organization", name: org.nom } : undefined,
    offers: { "@type": "Offer", price: f.prix, priceCurrency: "EUR" },
    aggregateRating: fAvis.length ? { "@type": "AggregateRating", ratingValue: avg, reviewCount: fAvis.length } : undefined,
  };


  return (
    <>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } } @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }`}</style>
      {toast && (
        <div onClick={toastScrollAvis ? () => { setToast(null); setToastScrollAvis(false); document.getElementById("avis")?.scrollIntoView({ behavior: "smooth" }); } : undefined} style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#2D1B06", color: "#fff", padding: "13px 20px", borderRadius: 14, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", animation: "slideUp 0.25s ease", pointerEvents: "auto", maxWidth: "calc(100vw - 32px)", width: "max-content", textAlign: "center", cursor: toastScrollAvis ? "pointer" : "default" }}>
          🍿 {toast}
        </div>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ===== MODERN HERO: Texte à gauche, Image à droite ===== */}
      <div style={{ background: `linear-gradient(135deg, ${dc.bg} 0%, #FFFDF7 50%, ${dc.color}15 100%)`, minHeight: mob ? "auto" : "500px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: mob ? "16px" : "40px" }}>
          {/* Header avec retour */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <button onClick={() => window.history.back()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, background: C.surface, border: "1.5px solid " + C.border, color: C.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              ← Retour
            </button>
            <button onClick={handleFav} style={{ width: 44, height: 44, borderRadius: 22, background: isFav ? C.pinkBg : C.surface, border: "1.5px solid " + (isFav ? C.pink + "44" : C.border), color: isFav ? C.pink : C.textTer, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isFav ? "❤️" : "🤍"}
            </button>
          </div>

          {/* Two columns layout */}
          <div style={{ display: mob ? "block" : "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
            {/* LEFT: Text content */}
            <div>
              {/* Breadcrumb */}
              <div style={{ display: "flex", gap: 8, fontSize: 12, color: C.textTer, marginBottom: 16, flexWrap: "wrap" }}>
                <Link href="/" style={{ color: C.textTer, textDecoration: "none" }}>Accueil</Link>
                <span>›</span>
                <Link href="/catalogue" style={{ color: C.textTer, textDecoration: "none" }}>Catalogue</Link>
                <span>›</span>
                <span style={{ color: dc.color }}>{f.domaine}</span>
              </div>

              {/* Badges */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>

                {((f as any).domaines?.length > 0 ? (f as any).domaines : [f.domaine]).map((d: string) => (
                  <span key={d} style={{ padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: getDC(d).bg, color: getDC(d).color }}>{d}</span>
                ))}
                <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.yellowBg, color: C.yellowDark }}>⭐ {avg} ({fAvis.length} avis)</span>
              </div>

              {/* Title */}
              <h1 style={{ fontSize: mob ? 26 : 36, fontWeight: 800, color: C.text, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 8 }}>{f.titre}</h1>
              {f.sous_titre && <p style={{ fontSize: mob ? 14 : 16, color: C.textSec, marginBottom: 14, fontStyle: "italic" }}>{f.sous_titre}</p>}

              {/* Formateur(s) & Organisme — prominent row */}
              {(formateurs.length > 0 || org) && (
                <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                  {formateurs.map((fmt, fi) => fmt && (
                    <div key={fi} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 40, background: C.accentBg, border: "1.5px solid " + C.accent + "33" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: C.gradient, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {(fmt as any).photo_url
                          ? <img src={(fmt as any).photo_url} alt={fmt.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 13, color: "#fff", fontWeight: 800 }}>{fmt.nom?.[0]?.toUpperCase()}</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.07em", lineHeight: 1 }}>Formateur</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{formateurs.length > 1 ? fmtShortNom(fmt) : fmt.nom}</div>
                      </div>
                    </div>
                  ))}
                  {(() => {
  const formOrgs = ((f as any).formOrganismes as { id: number; nom: string; site_url?: string | null }[] | undefined) || [];
  const formLibres = ((f as any).organismes_libres as string[] | undefined) || [];
  const displayOrgs: { nom: string; logo?: string; site_url?: string | null; isLibre?: boolean }[] =
    formOrgs.length > 0 || formLibres.length > 0
      ? [...formOrgs.map(o => ({ nom: o.nom, site_url: o.site_url })), ...formLibres.map(n => ({ nom: n, isLibre: true }))]
      : org ? [{ nom: org.nom, logo: org.logo, site_url: (org as any).site_url }] : [];
  return displayOrgs.map((o, i) => (
    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 40, background: C.blueBg, border: "1.5px solid " + C.blue + "33" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", background: C.bgAlt, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {(o as any).logo?.startsWith("http")
          ? <img src={(o as any).logo} alt={o.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 16 }}>🏢</span>}
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.07em", lineHeight: 1 }}>Organisme</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>
          {o.site_url ? <a href={o.site_url} target="_blank" rel="noopener noreferrer" style={{ color: C.text, textDecoration: "none" }}>{o.nom} 🌐</a> : o.nom}
        </div>
      </div>
    </div>
  ));
})()}
                </div>
              )}

              {/* Quick info */}
              <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>⏱️</span>
                  <span style={{ fontSize: 14, color: C.textSec }}>{f.duree}</span>
                </div>
                {f.effectif > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>👥</span>
                  <span style={{ fontSize: 14, color: C.textSec }}>{f.effectif} places</span>
                </div>
                )}
                {f.modalite !== "E-learning" && (() => {
                  const ul = [...new Set(sessions.flatMap((s: any) => {
                    const parts = (s as any).session_parties as any[] | null;
                    if (parts && parts.length > 0) {
                      const lieux = parts.map((p: any) => p.modalite === "Visio" ? "Visio" : ((p as any).ville || p.lieu || p.adresse || "")).filter(Boolean);
                      if (lieux.length > 0) return lieux;
                    }
                    return s.lieu ? [s.lieu] : [];
                  }))];
                  if (ul.length === 0) return null;
                  const isAllVisio = ul.every((l: string) => /visio/i.test(l));
                  const lieu = ul.length > 1 ? "Plusieurs lieux" : ul[0];
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>{isAllVisio ? "💻" : "📍"}</span>
                      <span style={{ fontSize: 14, color: C.textSec }}>{lieu}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Price */}
              {f.prix > 0 && (() => {
                const isPrixFrom = (f.prix_extras || []).some((e: any) => e.label === "__from__");
                return (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Prix</div>
                    <span style={{ display: "inline-block", padding: "8px 18px", borderRadius: 10, background: C.accentBg, border: "1.5px solid " + C.accent + "44", fontSize: mob ? 18 : 22, fontWeight: 800, color: C.accent }}>
                      {isPrixFrom ? `à partir de ${f.prix}€` : `${f.prix}€`}
                    </span>
                  </div>
                );
              })()}

              {/* CTA Buttons */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {f.modalite !== "E-learning" && (
                  <a href="#sessions" style={{ padding: "14px 24px", borderRadius: 12, background: C.gradient, color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                    Voir les sessions →
                  </a>
                )}
                {(f.modalite === "E-learning" || ((f as any).modalites || []).includes("E-learning")) && f.url_inscription && (
                  <a href={f.url_inscription} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(f.id)} style={{ padding: "14px 24px", borderRadius: 12, background: C.gradient, color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                    Accéder à la formation →
                  </a>
                )}
                <button onClick={handleFait} style={{ padding: "14px 20px", borderRadius: 12, background: isFait ? C.greenBg : C.surface, border: "2px solid " + (isFait ? C.green : C.borderLight), color: isFait ? C.green : C.textSec, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  {isFait ? "✅ Formation faite" : "☐ J'ai suivi cette formation"}
                </button>
              </div>
            </div>

            {/* RIGHT: Image */}
            <div style={{ marginTop: mob ? 24 : 0 }}>
              <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", aspectRatio: "4/3", background: `linear-gradient(135deg, ${dc.bg}, ${dc.color}22)` }}>
                <img src={photo} alt="" onError={() => { if (photo !== domainPhoto) setPhoto(domainPhoto); }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT SECTIONS ===== */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mob ? "24px 16px" : "40px" }}>
        <div style={{ display: mob ? "block" : "grid", gridTemplateColumns: "2fr 1fr", gap: 40 }}>
          {/* LEFT COLUMN */}
          <div>
            {/* Description */}
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: mob ? 20 : 24, fontWeight: 800, color: C.text, marginBottom: 16 }}>À propos de cette formation</h2>
              <p style={{ fontSize: mob ? 14 : 15, color: C.textSec, lineHeight: 1.8, whiteSpace: "pre-line" }}>{f.description}</p>
            </section>

            {/* Video */}
            {embedUrl && (
              <section style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: mob ? 20 : 24, fontWeight: 800, color: C.text, marginBottom: 16 }}>Vidéo de présentation</h2>
                <div style={{ position: "relative", paddingBottom: "56.25%", borderRadius: 16, overflow: "hidden" }}>
                  <iframe src={embedUrl} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen />
                </div>
              </section>
            )}
            {(() => {
              const isElearning = f.modalite === "E-learning" || ((f as any).modalites || []).includes("E-learning");
              const hasSessions = sessions.length > 0;
              return (
              <section id="sessions" style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: mob ? 20 : 24, fontWeight: 800, color: C.text, marginBottom: 16 }}>{isElearning && !hasSessions ? "Formation en ligne - E-Learning" : "Sessions disponibles"}</h2>
              {isElearning && (
                <div style={{ padding: "20px 24px", background: "#F0F7FF", borderRadius: 14, border: "1.5px solid #C7DEFF", marginBottom: hasSessions ? 16 : 0 }}>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>📺</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1A5FA8", marginBottom: 6 }}>Ce contenu est accessible en autonomie, à tout moment, sans contrainte de date ou de lieu.</div>
                  {f.lien_elearning && (
                    <a href={f.lien_elearning} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(f.id)} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8, padding: "10px 20px", borderRadius: 10, background: C.gradient, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                      📺 Accéder à la formation →
                    </a>
                  )}
                </div>
              )}
              {!isElearning && !hasSessions ? (
                <p style={{ color: C.textTer }}>Aucune session programmée pour le moment.</p>
              ) : hasSessions ? (
                <div style={{ display: "flex", flexDirection: "column", gap: sessions.length > 2 ? 6 : 12 }}>
                  {sessions.map((s, si) => {
                    const parts = (s as any).session_parties as Array<{titre:string;date_debut:string;date_fin:string;jours:string|null;modalite:string;lieu:string;adresse:string;ville:string;lien_visio:string}> | null;
                    const isInscrit = inscriptions.some(ins => ins.formation_id === f.id && ins.session_id === s.id);
                    const compact = sessions.length > 2;
                    const sessionOrg = (s as any).organisme as { id: number; nom: string; site_url?: string | null } | null;
                    const sessionOrgLibre = (s as any).organisme_libre as string | null;
                    const hasOrg = !!(sessionOrg || sessionOrgLibre);
                    const displayDate = parts && parts.length > 0
                      ? parts.map(p => p.date_debut ? fmtDateFr(p.date_debut) + (p.date_fin && p.date_fin !== p.date_debut ? " → " + fmtDateFr(p.date_fin) : "") : "").filter(Boolean).join(" / ")
                      : s.dates;
                    const displayLieu = (() => {
                      if (parts && parts.length > 0) {
                        const lieux = [...new Set(parts.map(p => p.modalite === "Visio" ? "Visio" : ((p as any).ville || p.lieu || p.adresse || "")).filter(Boolean))];
                        if (lieux.length > 0) return lieux.join(", ");
                      }
                      return s.lieu || "";
                    })();
                    return (
                    <div key={si} style={{ padding: compact ? "10px 14px" : 16, background: C.surface, borderRadius: 14, border: "1.5px solid " + C.border }}>
                      {compact ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                          {sessions.length > 1 && <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", minWidth: 60 }}>Session {si + 1}</div>}
                          <div style={{ flex: 1, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>📅 {displayDate}</span>
                            {displayLieu && <span style={{ fontSize: 13, color: C.textSec }}>{displayLieu === "Visio" ? "💻 Visio" : "📍 " + displayLieu}</span>}
                            {hasOrg && (
                              <span style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>
                                🏢 {sessionOrg?.nom || sessionOrgLibre}
                                {sessionOrg?.site_url && <a href={sessionOrg.site_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: C.textSec, fontSize: 11, marginLeft: 6, textDecoration: "none" }}>🌐 site →</a>}
                              </span>
                            )}
                          </div>
                          {hasOrg && ((s as any).url_inscription || f.url_inscription) && (
                            <a href={(s as any).url_inscription || f.url_inscription} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(f.id)} style={{ padding: "7px 14px", borderRadius: 9, background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                              Voir la formation →
                            </a>
                          )}
                          <button onClick={() => handleInscription(s.id)} disabled={inscribing} style={{ padding: "7px 16px", borderRadius: 9, background: isInscrit ? C.greenBg : C.gradient, color: isInscrit ? C.green : "#fff", fontSize: 12, fontWeight: 700, border: isInscrit ? "1.5px solid " + C.green : "none", cursor: "pointer", opacity: inscribing ? 0.7 : 1, whiteSpace: "nowrap" }}>
                            {isInscrit ? "✓ Inscrit·e" : "S'inscrire"}
                          </button>
                        </div>
                      ) : (
                        <>
                          {sessions.length > 1 && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Session {si + 1}</div>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ flex: 1 }}>
                              {(() => {
                                const hasMeaningfulParts = parts && parts.length > 0 && parts.some((p: any) => p.titre || p.ville || p.lieu || p.adresse || p.modalite === "Visio");
                                if (hasMeaningfulParts) {
                                  return (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                      {parts!.map((p, pi) => (
                                        <div key={pi} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                          {parts!.length > 1 && <div style={{ minWidth: 60, fontSize: 11, fontWeight: 700, color: C.accent, paddingTop: 2 }}>{p.titre || ("Partie " + (pi + 1))}</div>}
                                          <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                                              {p.modalite === "Visio" ? "💻 En visio" : ((p as any).ville || p.lieu || p.adresse) ? "📍 " + ((p as any).ville || p.lieu || p.adresse) : null}
                                              {(p.jours || p.date_debut) && <span style={{ fontSize: 12, color: C.textTer, marginLeft: 8 }}>📅 {p.jours ? p.jours.split(",").filter(Boolean).map(fmtDateFr).join(", ") : (fmtDateFr(p.date_debut) + (p.date_fin && p.date_fin !== p.date_debut ? " → " + fmtDateFr(p.date_fin) : ""))}</span>}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                const dateStr = parts && parts.length > 0
                                  ? parts.map(p => p.date_debut ? fmtDateFr(p.date_debut) + (p.date_fin && p.date_fin !== p.date_debut ? " → " + fmtDateFr(p.date_fin) : "") : "").filter(Boolean).join(" / ")
                                  : s.dates;
                                const lieuStr = s.lieu || "";
                                return (
                                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>📅 {dateStr}</span>
                                    {lieuStr && <span style={{ fontSize: 13, color: C.textSec }}>{lieuStr === "Visio" ? "💻 Visio" : "📍 " + lieuStr}</span>}
                                  </div>
                                );
                              })()}
                              {hasOrg && (
                                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span style={{ padding: "4px 10px", borderRadius: 8, background: C.blueBg, border: "1px solid " + C.blue + "33", fontSize: 12, fontWeight: 700, color: C.blue }}>
                                    🏢 {sessionOrg?.nom || sessionOrgLibre}
                                  </span>
                                  {sessionOrg?.site_url && (
                                    <a href={sessionOrg.site_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.textSec, textDecoration: "none" }}>🌐 Voir le site →</a>
                                  )}
                                  {((s as any).url_inscription || f.url_inscription) && (
                                    <a href={(s as any).url_inscription || f.url_inscription} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(f.id)} style={{ padding: "8px 16px", borderRadius: 10, background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                                      Voir la formation →
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                            <button onClick={() => handleInscription(s.id)} disabled={inscribing} style={{ padding: "10px 20px", borderRadius: 10, background: isInscrit ? C.greenBg : C.gradient, color: isInscrit ? C.green : "#fff", fontSize: 13, fontWeight: 700, border: isInscrit ? "1.5px solid " + C.green : "none", cursor: "pointer", opacity: inscribing ? 0.7 : 1, whiteSpace: "nowrap" }}>
                              {isInscrit ? "✓ Inscrit·e" : "S'inscrire"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
              );
            })()}

            {/* Avis */}
            <AvisSection formationId={f.id} avis={avis} onAdd={handleAddAvis} onEdit={handleEditAvis} onDelete={handleDeleteAvis} mob={mob} userId={user?.id} />
          </div>

          {/* RIGHT COLUMN - Sidebar */}
          <div>
            {/* Organisme card */}
            {org && (
              <div style={{ padding: 20, background: C.surface, borderRadius: 16, border: "1.5px solid " + C.border, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Organisme</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {org.logo?.startsWith("http") ? (
                    <img src={org.logo} alt={org.nom} style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: 10, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", fontWeight: 800 }}>{org.logo || org.nom?.slice(0, 2)}</div>
                  )}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{org.nom}</div>
                    <Link href={`/catalogue?organisme=${org.id}`} style={{ fontSize: 12, color: C.accent, textDecoration: "none" }}>Voir ses formations →</Link>
                    {(org as any).site_url && (
                      <a href={(org as any).site_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 12, color: C.textSec, textDecoration: "none", marginTop: 4 }}>🌐 Voir le site →</a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Formateur cards (supports multi-formateur) */}
            {formateurs.length > 0 && formateurs.map((fmt, fi) => fmt && (
              <div key={fmt.id || fi} onClick={() => { window.scrollTo({ top: 0, behavior: "instant" }); router.push(`/formateurs?id=${fmt.id}`); }} style={{ padding: 20, background: C.surface, borderRadius: 16, border: "1.5px solid " + C.border, cursor: "pointer", marginBottom: 12, transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent + "66")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{fmtTitle(fmt)} · <span style={{ color: C.accent }}>Voir ses formations →</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 36, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "#fff", fontWeight: 700, overflow: "hidden", flexShrink: 0 }}>
                    {(fmt as any).photo_url ? (
                      <img src={(fmt as any).photo_url} alt={fmt.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span>{fmt.nom?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{fmt.nom}</div>
                    {fmt.bio && <div style={{ fontSize: 12, color: C.textSec, marginTop: 2, lineHeight: 1.4 }}>{fmt.bio.slice(0, 80)}...</div>}
                    {(fmt as any).site_url && (
                      <a href={(fmt as any).site_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: "block", fontSize: 12, color: C.textSec, textDecoration: "none", marginTop: 4 }}>🌐 Voir le site →</a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Infos */}
            <div style={{ padding: 20, background: C.surface, borderRadius: 16, border: "1.5px solid " + C.border, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Informations</div>
              {!hasSessionOrgs && f.url_inscription && (
                <a href={f.url_inscription} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(f.id)} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: 12, background: C.gradient, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", textAlign: "center", marginBottom: 16 }}>
                  Voir la formation →
                </a>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: C.textSec }}>Modalité</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.modalite}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: C.textSec }}>Durée</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.duree}</span>
                </div>
                {f.effectif > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: C.textSec }}>Effectif</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.effectif} places</span>
                  </div>
                )}
                {f.prix_salarie && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: C.textSec }}>Prix salarié</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.prix_salarie}€</span>
                  </div>
                )}
                {f.prix_liberal && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: C.textSec }}>Prix libéral</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.prix_liberal}€</span>
                  </div>
                )}
                {(f.prix_extras || []).filter((e: any) => e.label !== "__from__").map((e, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: C.textSec }}>{e.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{e.value}€</span>
                  </div>
                ))}
              </div>
              {priseEnCharge.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + C.borderLight }}>
                  <div style={{ fontSize: 12, color: C.textSec, marginBottom: 8 }}>Prise en charge</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {priseEnCharge.map(p => <PriseTag key={p} label={p} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Share */}
            <div style={{ padding: 20, background: C.surface, borderRadius: 16, border: "1.5px solid " + C.border }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Partager</div>
              <button onClick={() => {
                const url = window.location.href;
                const text = "Regarde cette formation sur PopForm";
                if (navigator.share) { navigator.share({ title: f.titre, text, url }); }
                else { navigator.clipboard?.writeText(text + "\n" + url); }
              }} style={{ width: "100%", padding: "10px", borderRadius: 10, background: C.bgAlt, border: "1.5px solid " + C.border, color: C.textSec, fontSize: 12, cursor: "pointer" }}>🔗 Partager à un·e collègue</button>
            </div>
          </div>
        </div>

      </div>

      {/* ===== FORMATIONS SUGGÉRÉES ===== */}
      {(() => {
        const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
        const autresFmt = f.formateur_id ? shuffle(formations.filter(ff => ff.id !== f.id && ff.formateur_id === f.formateur_id && ff.titre?.trim())).slice(0, 3) : [];
        const autresOrg = f.organisme_id ? shuffle(formations.filter(ff => ff.id !== f.id && ff.organisme_id === f.organisme_id && ff.formateur_id !== f.formateur_id && ff.titre?.trim())).slice(0, 3) : [];
        if (autresFmt.length === 0 && autresOrg.length === 0) return null;
        return (
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: mob ? "0 16px 40px" : "0 40px 60px" }}>
            {autresFmt.length > 0 && (
              <section style={{ marginBottom: autresOrg.length > 0 ? 40 : 0 }}>
                <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text, marginBottom: 16 }}>
                  {formateur?.sexe === "Femme" ? "D'autres formations de cette formatrice" : formateur?.sexe === "Homme" ? "D'autres formations de ce formateur" : "D'autres formations de ce·tte formateur·rice"}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(260px,100%),1fr))", gap: 16 }}>
                  {autresFmt.map(ff => <FormationCard key={ff.id} f={ff} mob={mob} />)}
                </div>
              </section>
            )}
            {autresOrg.length > 0 && (
              <section>
                <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text, marginBottom: 16 }}>D&apos;autres formations de cet organisme</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(260px,100%),1fr))", gap: 16 }}>
                  {autresOrg.map(ff => <FormationCard key={ff.id} f={ff} mob={mob} />)}
                </div>
              </section>
            )}
          </div>
        );
      })()}
    </>
  );
}
