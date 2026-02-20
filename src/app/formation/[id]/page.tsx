"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Head from "next/head";
import { C, getDC, fmtLabel, fmtTitle, fetchFormation, fetchFormations, fetchAvis, fetchFavoris, toggleFavori, addAvis as addAvisDB, updateAvis as updateAvisDB, type Formation, type Avis } from "@/lib/data";
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
function AvisSection({ formationId, avis, onAdd, onEdit, mob, userId }: { formationId: number; avis: Avis[]; onAdd: (note: number, texte: string, subs?: { contenu: number; organisation: number; supports: number; pertinence: number }) => void; onEdit: (aId: number, note: number, texte: string) => void; mob: boolean; userId?: string }) {
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
  const startEdit = () => { setNote(myAvis!.note); setTexte(myAvis!.texte); setEditMode(true); setShowForm(true) };
  const handleSubmit = () => { if (!texte.trim()) return; if (editMode && myAvis) { onEdit(myAvis.id, note, texte.trim()) } else { onAdd(note, texte.trim(), { contenu: subContenu, organisation: subOrganisation, supports: subSupports, pertinence: subPertinence }) } setShowForm(false); setEditMode(false) };
  const avg = fAvis.length ? Math.round(fAvis.reduce((s, a) => s + a.note, 0) / fAvis.length * 10) / 10 : 0;
  const notedContenu = fAvis.filter(a => a.note_contenu !== null);
  const notedOrga = fAvis.filter(a => a.note_organisation !== null);
  const notedSupports = fAvis.filter(a => a.note_supports !== null);
  const notedPertinence = fAvis.filter(a => a.note_pertinence !== null);
  const avgContenu = notedContenu.length ? Math.round(notedContenu.reduce((s, a) => s + a.note_contenu!, 0) / notedContenu.length * 10) / 10 : 0;
  const avgOrga = notedOrga.length ? Math.round(notedOrga.reduce((s, a) => s + a.note_organisation!, 0) / notedOrga.length * 10) / 10 : 0;
  const avgSupports = notedSupports.length ? Math.round(notedSupports.reduce((s, a) => s + a.note_supports!, 0) / notedSupports.length * 10) / 10 : 0;
  const avgPertinence = notedPertinence.length ? Math.round(notedPertinence.reduce((s, a) => s + a.note_pertinence!, 0) / notedPertinence.length * 10) / 10 : 0;
  const subCount = [notedContenu.length, notedOrga.length, notedSupports.length, notedPertinence.length].filter(n => n > 0).length;
  const avgAll = subCount > 0 ? (avgContenu + avgOrga + avgSupports + avgPertinence) / subCount : avg;
  const pctSat = fAvis.length ? Math.round(avgAll / 5 * 100) : 0;

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
          <button onClick={startEdit} style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Modifier mon avis</button>
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
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={handleSubmit} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{editMode ? "Modifier" : "Publier"}</button>
            <button onClick={() => { setShowForm(false); setEditMode(false) }} style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>Annuler</button>
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
  const [f, setF] = useState<Formation | null>(null);
  const [loading, setLoading] = useState(true);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [isFav, setIsFav] = useState(false);
  const { user, profile } = useAuth();
  const mob = useIsMobile();
  const [formations, setFormations] = useState<Formation[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchFormation(Number(id)).then(d => { setF(d); setLoading(false); });
    fetchAvis().then(setAvis);
    fetchFormations().then(setFormations);
    if (user) fetchFavoris(user.id).then(favs => setIsFav(favs.some(fv => fv.formation_id === Number(id))));
  }, [id, user]);

  const handleFav = async () => {
    if (!user) { alert("Connectez-vous pour ajouter aux favoris"); return; }
    const added = await toggleFavori(user.id, Number(id));
    setIsFav(added);
  };

  const handleAddAvis = async (note: number, texte: string, subs?: { contenu: number; organisation: number; supports: number; pertinence: number }) => {
    if (!user) return;
    const a = await addAvisDB(Number(id), user.id, profile?.full_name || "Anonyme", note, texte, subs);
    if (a) setAvis(prev => [a, ...prev]);
  };

  const handleEditAvis = async (aId: number, note: number, texte: string) => {
    const ok = await updateAvisDB(aId, note, texte);
    if (ok) setAvis(prev => prev.map(a => a.id === aId ? { ...a, note, texte } : a));
  };

  if (loading) return <PageSkeleton mob={mob} />;
  if (!f) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>Formation non trouvée.</div>;

  const dc = getDC(f.domaine);
  const photo = (f as any).photo_url || null;
  const sessions = f.sessions || [];
  const org = f.organisme;
  const formateur = f.formateur;
  const priseEnCharge = f.prise_en_charge || [];
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

  // Autres formations du même formateur
  const autresFormations = formations.filter(ff => ff.formateur_id === f.formateur_id && ff.id !== f.id).slice(0, 3);

  return (
    <>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
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
                {f.is_new && <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.pinkBg, color: C.pink }}>✨ Nouvelle formation</span>}
                <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: dc.bg, color: dc.color }}>{f.domaine}</span>
                <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.yellowBg, color: C.yellowDark }}>⭐ {avg} ({fAvis.length} avis)</span>
              </div>

              {/* Title */}
              <h1 style={{ fontSize: mob ? 26 : 36, fontWeight: 800, color: C.text, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 12 }}>{f.titre}</h1>
              {f.sous_titre && <p style={{ fontSize: mob ? 14 : 16, color: C.textSec, marginBottom: 20, fontStyle: "italic" }}>{f.sous_titre}</p>}

              {/* Quick info */}
              <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>⏱️</span>
                  <span style={{ fontSize: 14, color: C.textSec }}>{f.duree}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>👥</span>
                  <span style={{ fontSize: 14, color: C.textSec }}>{f.effectif} places</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>📍</span>
                  <span style={{ fontSize: 14, color: C.textSec }}>{sessions.length > 0 ? sessions[0].lieu : "—"}</span>
                </div>
              </div>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: mob ? 32 : 42, fontWeight: 800, color: C.accent }}>{f.prix}€</span>
                <span style={{ fontSize: 14, color: C.textTer }}>par personne</span>
              </div>

              {/* CTA Buttons */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href={f.url_inscription || "#"} style={{ padding: "14px 32px", borderRadius: 12, background: C.gradient, color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  S'inscrire →
                </a>
                <a href="#sessions" style={{ padding: "14px 24px", borderRadius: 12, background: C.surface, border: "2px solid " + C.border, color: C.text, fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
                  Voir les sessions
                </a>
              </div>
            </div>

            {/* RIGHT: Image */}
            <div style={{ marginTop: mob ? 24 : 0 }}>
              <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", aspectRatio: "4/3" }}>
                {photo ? (
                  <img src={photo} alt={f.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${dc.bg}, ${dc.color}30)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 80 }}>{f.domaine === "Langage oral" ? "🗣️" : f.domaine === "Langage écrit" ? "📝" : f.domaine === "Neurologie" ? "🧠" : f.domaine === "Cognition mathématique" ? "🔢" : f.domaine === "OMF" ? "👄" : "📚"}</span>
                  </div>
                )}
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

            {/* Sessions */}
            <section id="sessions" style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: mob ? 20 : 24, fontWeight: 800, color: C.text, marginBottom: 16 }}>Sessions disponibles</h2>
              {sessions.length === 0 ? (
                <p style={{ color: C.textTer }}>Aucune session programmée pour le moment.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {sessions.map((s, i) => (
                    <div key={i} style={{ padding: 16, background: C.surface, borderRadius: 14, border: "1.5px solid " + C.border, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>📅 {s.dates}</div>
                        <div style={{ fontSize: 13, color: C.textSec }}>📍 {s.lieu}</div>
                        {s.adresse && <div style={{ fontSize: 12, color: C.textTer, marginTop: 2 }}>{s.adresse}</div>}
                      </div>
                      <a href={f.url_inscription || "#"} style={{ padding: "10px 20px", borderRadius: 10, background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                        S'inscrire
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Avis */}
            <AvisSection formationId={f.id} avis={avis} onAdd={handleAddAvis} onEdit={handleEditAvis} mob={mob} userId={user?.id} />
          </div>

          {/* RIGHT COLUMN - Sidebar */}
          <div>
            {/* Organisme card */}
            {org && (
              <div style={{ padding: 20, background: C.surface, borderRadius: 16, border: "1.5px solid " + C.border, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Organisme</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {org.logo ? (
                    <img src={org.logo} alt={org.nom} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: C.gradientSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff" }}>🏢</div>
                  )}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{org.nom}</div>
                    <Link href={`/catalogue?organisme=${org.id}`} style={{ fontSize: 12, color: C.accent, textDecoration: "none" }}>Voir ses formations →</Link>
                  </div>
                </div>
              </div>
            )}

            {/* Formateur card */}
            {formateur && (
              <div style={{ padding: 20, background: C.surface, borderRadius: 16, border: "1.5px solid " + C.border, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{fmtTitle(formateur)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: C.gradientSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", fontWeight: 700 }}>
                    {formateur.nom?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{formateur.nom}</div>
                    {formateur.bio && <div style={{ fontSize: 12, color: C.textSec, marginTop: 2, lineHeight: 1.4 }}>{formateur.bio.slice(0, 80)}...</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            <div style={{ padding: 20, background: C.surface, borderRadius: 16, border: "1.5px solid " + C.border, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Informations</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: C.textSec }}>Modalité</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.modalite}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: C.textSec }}>Durée</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.duree}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: C.textSec }}>Effectif</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.effectif} places</span>
                </div>
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
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => navigator.share?.({ title: f.titre, url: window.location.href })} style={{ flex: 1, padding: "10px", borderRadius: 10, background: C.bgAlt, border: "1.5px solid " + C.border, color: C.textSec, fontSize: 12, cursor: "pointer" }}>🔗 Lien</button>
              </div>
            </div>
          </div>
        </div>

        {/* Autres formations du même formateur */}
        {autresFormations.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: mob ? 20 : 24, fontWeight: 800, color: C.text, marginBottom: 20 }}>{fmtLabel(formateur)}</h2>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
              {autresFormations.map(ff => <FormationCard key={ff.id} f={ff} mob={mob} />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
