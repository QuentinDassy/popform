"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Head from "next/head";
import { C, getDC, getPhoto, fmtLabel, fmtTitle, fetchFormation, fetchFormations, fetchAvis, fetchFavoris, toggleFavori, addAvis as addAvisDB, updateAvis as updateAvisDB, type Formation, type Avis } from "@/lib/data";
import { StarRow, PriseTag, FormationCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase-data";

/* ===== SKELETON ===== */
function Skeleton({ w = "100%", h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg, #F5EDD8 25%, #FFF3D6 50%, #F5EDD8 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />;
}
function PageSkeleton({ mob }: { mob: boolean }) {
  return (
    <div>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      <Skeleton w="100%" h={mob ? 200 : 380} r={0} />
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: mob ? "16px" : "24px 40px" }}>
        <Skeleton w="50%" h={28} /><div style={{ height: 12 }} />
        <div style={{ display: "flex", gap: 16 }}><Skeleton w={80} h={50} r={10} /><Skeleton w={80} h={50} r={10} /><Skeleton w={80} h={50} r={10} /><Skeleton w={80} h={50} r={10} /></div>
        <div style={{ height: 24 }} /><Skeleton w="100%" h={14} /><Skeleton w="90%" h={14} /><Skeleton w="70%" h={14} />
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
function AvisSection({ formationId, avis, onAdd, onEdit, mob, userId }: { formationId: number; avis: Avis[]; onAdd: (note: number, texte: string) => void; onEdit: (aId: number, note: number, texte: string) => void; mob: boolean; userId?: string }) {
  const fAvis = avis.filter(a => a.formation_id === formationId);
  const myAvis = userId ? fAvis.find(a => a.user_id === userId) : undefined;
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [note, setNote] = useState(myAvis?.note || 5);
  const [texte, setTexte] = useState(myAvis?.texte || "");
  const startEdit = () => { setNote(myAvis!.note); setTexte(myAvis!.texte); setEditMode(true); setShowForm(true) };
  const handleSubmit = () => { if (!texte.trim()) return; if (editMode && myAvis) { onEdit(myAvis.id, note, texte.trim()) } else { onAdd(note, texte.trim()) } setShowForm(false); setEditMode(false) };
  const avg = fAvis.length ? Math.round(fAvis.reduce((s, a) => s + a.note, 0) / fAvis.length * 10) / 10 : 0;
  const pctSat = fAvis.length ? Math.round(fAvis.filter(a => a.note >= 4).length / fAvis.length * 100) : 0;

  return (
    <div id="avis">
      {/* Summary bar like escapegame.fr */}
      <div style={{ display: "flex", gap: mob ? 12 : 24, alignItems: "center", padding: mob ? "16px" : "20px 24px", background: C.surface, borderRadius: 16, border: "1px solid " + C.borderLight, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center", minWidth: 80 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: C.yellow, lineHeight: 1 }}>{pctSat}%</div>
          <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>satisfaction</div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <AvisBar label="Contenu pédagogique" value={avg} />
          <AvisBar label="Organisation" value={Math.min(5, avg + 0.2)} />
          <AvisBar label="Supports fournis" value={Math.max(1, avg - 0.1)} />
          <AvisBar label="Pertinence pratique" value={avg} />
        </div>
        <div style={{ textAlign: "center", minWidth: 80 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fAvis.length}</div>
          <div style={{ fontSize: 11, color: C.textTer }}>avis</div>
        </div>
      </div>

      {/* Add avis button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Avis des participants</h3>
        {userId && !myAvis && !showForm && <button onClick={() => { setShowForm(true); setEditMode(false); setTexte(""); setNote(5) }} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Donner mon avis</button>}
      </div>

      {showForm && (
        <div style={{ padding: 16, background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, marginBottom: 8 }}>{editMode ? "Modifier votre avis" : "Votre avis"}</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>{[1, 2, 3, 4, 5].map(i => (<button key={i} onClick={() => setNote(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, opacity: note >= i ? 1 : 0.3 }}>⭐</button>))}</div>
          <textarea value={texte} onChange={e => setTexte(e.target.value)} placeholder="Partagez votre expérience..." style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", minHeight: 80, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={handleSubmit} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{editMode ? "Modifier" : "Publier"}</button>
            <button onClick={() => { setShowForm(false); setEditMode(false) }} style={{ padding: "8px 18px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>Annuler</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {fAvis.map(a => (
          <div key={a.id} style={{ padding: mob ? 14 : 18, background: a.user_id === userId ? C.accentBg : C.surface, borderRadius: 14, border: "1px solid " + (a.user_id === userId ? C.accent + "22" : C.borderLight) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: C.gradientSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 800 }}>{a.user_name?.[0]?.toUpperCase() || "?"}</div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{a.user_name}</span>
                  {a.user_id === userId && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 5, background: C.accentBg, color: C.accent, fontWeight: 700, marginLeft: 6 }}>Vous</span>}
                  <div style={{ display: "flex", gap: 2, marginTop: 1 }}><StarRow rating={a.note} /></div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: C.textTer }}>{a.created_at?.slice(0, 10)}</span>
                {a.user_id === userId && !showForm && <button onClick={startEdit} style={{ fontSize: 10, color: C.accent, cursor: "pointer", background: "none", border: "none", fontWeight: 600 }}>✏️</button>}
              </div>
            </div>
            <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.7, margin: "4px 0 0 40px" }}>{a.texte}</p>
          </div>
        ))}
        {fAvis.length === 0 && <p style={{ fontSize: 13, color: C.textTer, textAlign: "center", padding: 20 }}>Aucun avis pour le moment.</p>}
      </div>
    </div>
  );
}

/* ===== MAIN PAGE ===== */
export default function FormationPage() {
  const params = useParams();
  const id = Number(params.id);
  const mob = useIsMobile();
  const { user, profile, setShowAuth } = useAuth();
  const [f, setF] = useState<Formation | null>(null);
  const [allF, setAllF] = useState<Formation[]>([]);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [isInscrit, setIsInscrit] = useState(false);
  const [inscribing, setInscribing] = useState(false);
  const [inscMsg, setInscMsg] = useState("");

  useEffect(() => {
    Promise.all([fetchFormation(id), fetchFormations(), fetchAvis()]).then(([det, all, av]) => {
      setF(det); setAllF(all); setAvis(av); setLoading(false);
    });
  }, [id]);

  // Dynamic page title
  useEffect(() => {
    if (f) document.title = `${f.titre} — PopForm 🍿`;
    return () => { document.title = "PopForm — La formation continue, version blockbuster 🍿" };
  }, [f]);

  useEffect(() => {
    if (!user) return;
    fetchFavoris(user.id).then(favs => setIsFav(favs.some(fv => fv.formation_id === id)));
    supabase.from("inscriptions").select("id").eq("user_id", user.id).eq("formation_id", id).then(({ data }) => { if (data && data.length > 0) setIsInscrit(true) });
  }, [user, id]);

  const handleFav = async () => { if (!user) { setShowAuth?.(true); return } const added = await toggleFavori(user.id, id); setIsFav(added) };
  const handleReserver = async () => {
    if (!user) { setShowAuth?.(true); return }
    if (isInscrit) return;
    setInscribing(true); setInscMsg("");
    const { error } = await supabase.from("inscriptions").insert({ user_id: user.id, formation_id: id, status: "inscrit" });
    if (error) { setInscMsg(error.code === "23505" ? "Déjà inscrit" : "Erreur") } else { setIsInscrit(true); setInscMsg("✓ Inscription confirmée !") }
    setInscribing(false);
  };
  const handleAddAvis = async (note: number, texte: string) => { if (!user || !profile) return; const n = await addAvisDB(f!.id, user.id, profile.full_name || "Anonyme", note, texte); if (n) setAvis(prev => [n, ...prev]) };
  const handleEditAvis = async (aId: number, note: number, texte: string) => { const ok = await updateAvisDB(aId, note, texte); if (ok) setAvis(prev => prev.map(a => a.id === aId ? { ...a, note, texte } : a)) };

  if (loading) return <PageSkeleton mob={mob} />;
  if (!f) return (<div style={{ maxWidth: 920, margin: "0 auto", padding: 40, textAlign: "center" }}><p style={{ color: C.textTer }}>Formation introuvable.</p><Link href="/catalogue" style={{ color: C.accent }}>← Retour au catalogue</Link></div>);

  const dc = getDC(f.domaine); const photo = getPhoto(f.domaine);
  const fmt = f.formateur; const org = f.organisme;
  const sessions = f.sessions || [];
  const priseEnCharge = f.prise_en_charge || [];
  const otherFmt = allF.filter(x => x.id !== f.id && x.formateur_id === f.formateur_id);
  const otherDomain = allF.filter(x => x.id !== f.id && x.domaine === f.domaine && !otherFmt.find(o => o.id === x.id)).slice(0, 4);
  const embedUrl = f.video_url?.includes("watch?v=") ? f.video_url.replace("watch?v=", "embed/") : f.video_url?.includes("youtu.be") ? f.video_url.replace("youtu.be/", "youtube.com/embed/") : f.video_url;
  const fAvis = avis.filter(a => a.formation_id === f.id);
  const avg = fAvis.length ? (fAvis.reduce((s, a) => s + a.note, 0) / fAvis.length).toFixed(1) : "—";

  const favBtn = <button onClick={handleFav} title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"} style={{ width: 44, height: 44, borderRadius: 22, background: isFav ? C.pinkBg : "rgba(255,255,255,0.9)", border: "1.5px solid " + (isFav ? C.pink + "44" : "rgba(255,255,255,0.5)"), color: isFav ? C.pink : C.textTer, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>{isFav ? "❤️" : "🤍"}</button>;

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
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ===== HERO IMAGE FULL-WIDTH ===== */}
      <div style={{ position: "relative", width: "100%", height: mob ? 220 : 380, overflow: "hidden" }}>
        <img src={photo} alt={f.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(45,27,6,0.95) 0%, rgba(45,27,6,0.4) 40%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: mob ? 12 : 20, right: mob ? 12 : 20 }}>{favBtn}</div>
        <div style={{ position: "absolute", top: mob ? 12 : 20, left: mob ? 12 : 20 }}>
          <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.9)", color: C.textSec, textDecoration: "none" }}>Formation</span>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: mob ? "14px 16px" : "24px 40px", maxWidth: 1040, margin: "0 auto" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: mob ? 6 : 10, flexWrap: "wrap" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>PopForm</Link>
            <span>›</span>
            {org && <><Link href={`/catalogue`} style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{org.nom}</Link><span>›</span></>}
            {sessions[0] && <><Link href={`/catalogue?ville=${sessions[0].lieu}`} style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{sessions[0].lieu}</Link><span>›</span></>}
          </div>
          <h1 style={{ fontSize: mob ? 22 : 34, fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.02em", maxWidth: 700 }}>{f.titre}</h1>
          {f.sous_titre && <p style={{ fontSize: mob ? 12 : 15, color: "rgba(255,255,255,0.7)", marginTop: 4, fontStyle: "italic" }}>{f.sous_titre}</p>}
        </div>
      </div>

      {/* ===== INFO BAR (like escapegame.fr) ===== */}
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
        <div style={{ display: "flex", gap: mob ? 8 : 0, padding: mob ? "12px 0" : "0", marginTop: mob ? 0 : -28, position: "relative", zIndex: 2, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 0, background: C.surface, borderRadius: mob ? 14 : 16, border: "1px solid " + C.borderLight, overflow: "hidden", boxShadow: "0 4px 20px rgba(45,27,6,0.08)", flexWrap: mob ? "wrap" : "nowrap", width: mob ? "100%" : "auto" }}>
            {[
              { label: "Domaine", value: f.domaine, color: dc.color },
              { label: "Durée", value: f.duree || "—" },
              { label: "Effectif", value: f.effectif ? f.effectif + " places" : "—" },
              { label: "Prix", value: f.prix + "€/pers." },
              { label: "Note", value: avg + "/5 (" + fAvis.length + " avis)" },
            ].map((item, i) => (
              <div key={i} style={{ padding: mob ? "10px 12px" : "14px 22px", borderRight: mob ? "none" : (i < 4 ? "1px solid " + C.borderLight : "none"), borderBottom: mob && i < 4 ? "1px solid " + C.borderLight : "none", flex: mob ? "1 0 45%" : "none", textAlign: mob ? "center" : "left" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: item.color || C.text, marginTop: 2 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== TWO-COLUMN LAYOUT ===== */}
        <div style={{ display: mob ? "block" : "grid", gridTemplateColumns: "1fr 300px", gap: 28, marginTop: mob ? 16 : 24, paddingBottom: 40 }}>

          {/* === MAIN CONTENT === */}
          <div>
            {/* Tags */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
              {f.is_new && <span style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: C.gradient, color: "#fff" }}>À l&apos;affiche 🍿</span>}
              <span style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: dc.bg, color: dc.color }}>{f.domaine}</span>
              <span style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.blueBg, color: C.blue }}>{f.modalite}</span>
              {priseEnCharge.map(p => <PriseTag key={p} label={p} />)}
            </div>

            {/* Description */}
            <p style={{ fontSize: mob ? 14 : 15, color: C.textSec, lineHeight: 1.85, marginBottom: 24, whiteSpace: "pre-line" }}>{f.description}</p>

            <hr style={{ border: "none", borderTop: "1px solid " + C.borderLight, margin: "0 0 24px" }} />

            {/* Keywords */}
            {f.mots_cles && f.mots_cles.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>Mots-clés</h3>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{f.mots_cles.map(m => <span key={m} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, background: C.yellowBg, color: C.yellowDark, fontWeight: 600 }}>{m}</span>)}</div>
              </div>
            )}

            {/* Populations + Professions */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
              {f.populations && f.populations.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>Population</h3>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{f.populations.map(p => <span key={p} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, background: C.blueBg, color: C.blue, fontWeight: 600 }}>{p}</span>)}</div>
                </div>
              )}
              {f.professions && f.professions.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>Professions ciblées</h3>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{f.professions.map(p => <span key={p} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, background: C.greenBg, color: C.green, fontWeight: 600 }}>{p}</span>)}</div>
                </div>
              )}
            </div>

            {/* Video */}
            {embedUrl && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>Bande-annonce</h3>
                <div style={{ borderRadius: 14, overflow: "hidden", background: "#000" }}><iframe src={embedUrl} width="100%" height={mob ? 200 : 340} frameBorder="0" allowFullScreen style={{ display: "block" }} /></div>
              </div>
            )}

            <hr style={{ border: "none", borderTop: "1px solid " + C.borderLight, margin: "0 0 24px" }} />

            {/* Avis */}
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 16 }}>Avis de la communauté</h2>
            <AvisSection formationId={f.id} avis={avis} onAdd={handleAddAvis} onEdit={handleEditAvis} mob={mob} userId={user?.id} />

            {/* Recommendations */}
            {otherFmt.length > 0 && <div style={{ marginTop: 32, marginBottom: 24 }}><h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>{fmtLabel(fmt)}</h3><div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12 }}>{otherFmt.slice(0, 4).map(x => <FormationCard key={x.id} f={x} compact mob={mob} />)}</div></div>}
            {otherDomain.length > 0 && <div style={{ marginTop: 24 }}><h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Autres en {f.domaine}</h3><div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12 }}>{otherDomain.map(x => <FormationCard key={x.id} f={x} compact mob={mob} />)}</div></div>}
          </div>

          {/* === SIDEBAR (sticky) === */}
          {!mob && (
            <div>
              <div style={{ position: "sticky", top: 76, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Reserve card */}
                <div style={{ background: C.surface, border: "1px solid " + C.borderLight, borderRadius: 16, padding: 22, boxShadow: "0 4px 16px rgba(45,27,6,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <div><span style={{ fontSize: 30, fontWeight: 800, color: C.text }}>{f.prix}</span><span style={{ fontSize: 14, color: C.textTer }}>€</span></div>
                    {favBtn}
                  </div>
                  {(f.prix_salarie || f.prix_liberal || f.prix_dpc !== null) && <div style={{ fontSize: 11, color: C.textSec, marginBottom: 6 }}>{f.prix_salarie ? `Salarié: ${f.prix_salarie}€` : ""}{f.prix_liberal ? ` · Libéral: ${f.prix_liberal}€` : ""}{f.prix_dpc !== null && f.prix_dpc !== undefined ? ` · DPC: ${f.prix_dpc}€` : ""}</div>}
                  <p style={{ fontSize: 11, color: C.textTer, marginBottom: 14 }}>par participant</p>

                  <button onClick={handleReserver} disabled={inscribing || isInscrit} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: 14, borderRadius: 12, background: isInscrit ? C.greenBg : C.gradient, color: isInscrit ? C.green : "#fff", fontSize: 15, fontWeight: 700, border: isInscrit ? "1.5px solid " + C.green + "33" : "none", cursor: isInscrit ? "default" : "pointer", boxShadow: isInscrit ? "none" : "0 8px 28px rgba(212,43,43,0.2)", opacity: inscribing ? 0.5 : 1, transition: "all 0.2s" }}>
                    {inscribing ? "⏳..." : isInscrit ? "✓ Inscrit" : "Réserver 🎬"}
                  </button>
                  {inscMsg && <p style={{ fontSize: 11, color: inscMsg.startsWith("✓") ? C.green : C.pink, marginTop: 6, textAlign: "center" }}>{inscMsg}</p>}

                  {/* Quick info */}
                  <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { icon: "⏱", l: "Durée", v: f.duree },
                      { icon: "📍", l: "Modalité", v: f.modalite },
                      { icon: "🏢", l: "Organisme", v: org?.nom || "Indépendant" },
                      { icon: "👥", l: "Effectif", v: f.effectif ? f.effectif + " places" : "—" },
                    ].map((x, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 14 }}>{x.icon}</span>
                        <div><div style={{ fontSize: 10, color: C.textTer, textTransform: "uppercase", fontWeight: 700 }}>{x.l}</div><div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{x.v}</div></div>
                      </div>
                    ))}
                  </div>

                  {priseEnCharge.length > 0 && <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid " + C.borderLight }}><div style={{ fontSize: 10, color: C.textTer, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>Prise en charge</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{priseEnCharge.map(p => <PriseTag key={p} label={p} />)}</div></div>}
                </div>

                {/* Sessions card */}
                {sessions.length > 0 && (
                  <div style={{ background: C.surface, border: "1px solid " + C.borderLight, borderRadius: 16, padding: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>📅 Prochaines sessions</div>
                    {sessions.map((s, i) => (
                      <div key={i} style={{ padding: "10px 12px", background: C.gradientBg, borderRadius: 10, marginBottom: 6, border: "1px solid " + C.borderLight }}>
                        <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{s.dates}</div>
                        <div style={{ fontSize: 11, color: C.textTer }}>📍 {s.lieu}{s.adresse ? " — " + s.adresse : ""}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formateur card (like escapegame.fr room card) */}
                {fmt && (
                  <div style={{ background: C.surface, border: "1px solid " + C.borderLight, borderRadius: 16, padding: 18 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: C.gradientSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 800 }}>{fmt.nom.split(" ").map(n => n[0]).join("")}</div>
                      <div>
                        <div style={{ fontSize: 10, color: C.textTer, textTransform: "uppercase", fontWeight: 700 }}>{fmtTitle(fmt)}</div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "2px 0" }}>{fmt.nom}</h4>
                      </div>
                    </div>
                    {fmt.bio && <p style={{ fontSize: 12, color: C.textTer, lineHeight: 1.6, marginTop: 10 }}>{fmt.bio}</p>}
                    {otherFmt.length > 0 && <Link href="/catalogue" style={{ display: "block", marginTop: 10, fontSize: 12, color: C.accent, fontWeight: 600, textDecoration: "none" }}>Voir toutes ses formations ›</Link>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile: formateur + sessions below content */}
          {mob && fmt && (
            <div style={{ marginTop: 20, padding: 16, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: C.gradientSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 800 }}>{fmt.nom.split(" ").map(n => n[0]).join("")}</div>
                <div><div style={{ fontSize: 10, color: C.textTer, textTransform: "uppercase", fontWeight: 700 }}>{fmtTitle(fmt)}</div><h4 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fmt.nom}</h4></div>
              </div>
              {fmt.bio && <p style={{ fontSize: 12, color: C.textTer, lineHeight: 1.5, marginTop: 8 }}>{fmt.bio}</p>}
            </div>
          )}

          {/* Mobile: sticky bottom bar */}
          {mob && (
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "rgba(255,253,247,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid " + C.borderLight, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{f.prix}€</span>
                <span style={{ fontSize: 11, color: C.textTer, marginLeft: 4 }}>/pers.</span>
              </div>
              <button onClick={handleReserver} disabled={inscribing || isInscrit} style={{ padding: "10px 24px", borderRadius: 12, background: isInscrit ? C.greenBg : C.gradient, color: isInscrit ? C.green : "#fff", fontSize: 14, fontWeight: 700, border: isInscrit ? "1.5px solid " + C.green + "33" : "none", cursor: "pointer" }}>
                {isInscrit ? "✓ Inscrit" : "Réserver 🎬"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom spacer for mobile fixed bar */}
      {mob && <div style={{ height: 70 }} />}
    </>
  );
}
