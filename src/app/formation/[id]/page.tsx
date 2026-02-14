"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { C, getDC, getPhoto, fmtLabel, fmtTitle, fetchFormation, fetchFormations, fetchAvis, addAvis as addAvisDB, updateAvis as updateAvisDB, type Formation, type Avis } from "@/lib/data";
import { StarRow, PriseTag, FormationCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";

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
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: mob ? 28 : 36, fontWeight: 800, color: C.yellow }}>{avg || "—"}</span>
          <div><StarRow rating={Math.round(avg)} /><span style={{ fontSize: 11, color: C.textTer }}>{fAvis.length} avis</span></div>
        </div>
        {userId && !myAvis && !showForm && <button onClick={() => { setShowForm(true); setEditMode(false); setTexte(""); setNote(5) }} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Donner mon avis</button>}
      </div>
      {showForm && (
        <div style={{ padding: 16, background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, marginBottom: 8 }}>{editMode ? "Modifier votre avis" : "Votre avis"}</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>{[1, 2, 3, 4, 5].map(i => (<button key={i} onClick={() => setNote(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, opacity: note >= i ? 1 : 0.3 }}>⭐</button>))}</div>
          <textarea value={texte} onChange={e => setTexte(e.target.value)} placeholder="Partagez votre expérience..." style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", minHeight: 70, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={handleSubmit} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{editMode ? "Modifier" : "Publier"}</button>
            <button onClick={() => { setShowForm(false); setEditMode(false) }} style={{ padding: "8px 18px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>Annuler</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {fAvis.map(a => (
          <div key={a.id} style={{ padding: mob ? 10 : 14, background: a.user_id === userId ? C.yellowBg : C.surface, borderRadius: 12, border: "1px solid " + (a.user_id === userId ? C.yellow + "33" : C.borderLight) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: a.user_id === userId ? C.gradient : C.gradientBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: a.user_id === userId ? "#fff" : C.text, fontWeight: 700 }}>{a.user_name[0]}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.user_id === userId ? "Vous" : a.user_name}</span>
                <span style={{ fontSize: 10, color: C.textTer }}>{a.created_at?.slice(0, 10)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <StarRow rating={a.note} />
                {a.user_id === userId && !showForm && <button onClick={startEdit} style={{ marginLeft: 4, padding: "3px 8px", borderRadius: 6, border: "1px solid " + C.border, background: C.surface, color: C.accent, fontSize: 10, cursor: "pointer" }}>✏️</button>}
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.6 }}>{a.texte}</p>
          </div>
        ))}
        {fAvis.length === 0 && <div style={{ textAlign: "center", padding: 20, color: C.textTer, fontSize: 12 }}>Aucun avis. Soyez le premier !</div>}
      </div>
    </div>
  );
}

export default function FormationPage() {
  const params = useParams();
  const id = Number(params.id);
  const mob = useIsMobile();
  const { user, profile } = useAuth();
  const [f, setF] = useState<Formation | null>(null);
  const [allF, setAllF] = useState<Formation[]>([]);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchFormation(id), fetchFormations(), fetchAvis()]).then(([det, all, av]) => {
      setF(det); setAllF(all); setAvis(av); setLoading(false);
    });
  }, [id]);

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  if (!f) return (<div style={{ maxWidth: 920, margin: "0 auto", padding: 40, textAlign: "center" }}><p style={{ color: C.textTer }}>Formation introuvable.</p><Link href="/catalogue" style={{ color: C.accent }}>← Retour</Link></div>);

  const dc = getDC(f.domaine); const photo = getPhoto(f.domaine);
  const fmt = f.formateur; const org = f.organisme;
  const sessions = f.sessions || [];
  const priseEnCharge = f.prise_en_charge || [];
  const otherFmt = allF.filter(x => x.id !== f.id && x.formateur_id === f.formateur_id);
  const otherOrg = allF.filter(x => x.id !== f.id && x.organisme_id === f.organisme_id && f.organisme_id);
  const otherLike = allF.filter(x => x.id !== f.id && x.domaine === f.domaine && !otherFmt.find(o => o.id === x.id) && !otherOrg.find(o => o.id === x.id)).slice(0, 4);
  const embedUrl = f.video_url?.includes("watch?v=") ? f.video_url.replace("watch?v=", "embed/") : f.video_url?.includes("youtu.be") ? f.video_url.replace("youtu.be/", "youtube.com/embed/") : f.video_url;

  const handleAddAvis = async (note: number, texte: string) => {
    if (!user || !profile) return;
    const newAvis = await addAvisDB(f.id, user.id, profile.full_name || "Anonyme", note, texte);
    if (newAvis) setAvis(prev => [newAvis, ...prev]);
  };
  const handleEditAvis = async (aId: number, note: number, texte: string) => {
    const ok = await updateAvisDB(aId, note, texte);
    if (ok) setAvis(prev => prev.map(a => a.id === aId ? { ...a, note, texte } : a));
  };

  const lbl = (t: string) => <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: mob ? 6 : 8 }}>{t}</div>;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: mob ? "0 16px" : "0 24px" }}>
      <Link href="/catalogue" style={{ display: "flex", alignItems: "center", gap: 6, color: C.textTer, fontSize: 13, padding: "14px 0", textDecoration: "none" }}>← Retour</Link>
      <div style={{ borderRadius: mob ? 14 : 22, overflow: "hidden", marginBottom: mob ? 14 : 24, position: "relative" }}>
        <img src={photo} alt="" style={{ width: "100%", height: mob ? 170 : 280, objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(45,27,6,0.92) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", bottom: mob ? 14 : 28, left: mob ? 14 : 28, right: mob ? 14 : 28 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: mob ? 6 : 12, flexWrap: "wrap" }}>
            {f.is_new && <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: C.gradient, color: "#fff" }}>À l&apos;affiche 🍿</span>}
            <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.9)", color: dc.color }}>{f.domaine}</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, background: "rgba(255,255,255,0.7)", color: "#2D1B06" }}>{f.modalite}</span>
          </div>
          <h1 style={{ fontSize: mob ? 20 : 28, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{f.titre}</h1>
          {f.sous_titre && <p style={{ fontSize: mob ? 12 : 14, color: "rgba(255,255,255,0.7)", marginTop: 4, fontStyle: "italic" }}>{f.sous_titre}</p>}
        </div>
      </div>

      <div style={{ display: mob ? "flex" : "grid", gridTemplateColumns: "1fr 280px", flexDirection: "column", gap: mob ? 14 : 24, paddingBottom: 30 }}>
        {mob && (
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <div><span style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{f.prix}</span><span style={{ fontSize: 13, color: C.textTer }}>€</span></div>
              <a href="#" style={{ padding: "8px 16px", borderRadius: 10, background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Réserver 🎬</a>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: C.textSec }}>{"⏱ " + f.duree}{f.effectif > 0 && " · 👥 " + f.effectif}{org && " · 🏢 " + org.nom}</div>
            {priseEnCharge.length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>{priseEnCharge.map(p => <PriseTag key={p} label={p} />)}</div>}
          </div>
        )}
        <div>
          {lbl("Synopsis")}
          <p style={{ fontSize: mob ? 13 : 14.5, color: C.textSec, lineHeight: 1.8, marginBottom: 20 }}>{f.description}</p>
          {f.mots_cles && f.mots_cles.length > 0 && <div style={{ marginBottom: 20 }}>{lbl("Mots-clés")}<div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{f.mots_cles.map(m => <span key={m} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, background: C.yellowBg, color: C.yellowDark, fontWeight: 600 }}>{m}</span>)}</div></div>}
          {f.populations && f.populations.length > 0 && <div style={{ marginBottom: 20 }}>{lbl("Population")}<div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{f.populations.map(p => <span key={p} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, background: C.blueBg, color: C.blue, fontWeight: 600 }}>{p}</span>)}</div></div>}
          {f.professions && f.professions.length > 0 && <div style={{ marginBottom: 20 }}>{lbl("Professions")}<div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{f.professions.map(p => <span key={p} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, background: C.greenBg, color: C.green, fontWeight: 600 }}>{p}</span>)}</div></div>}
          {embedUrl && <div style={{ marginBottom: 20 }}>{lbl("Bande-annonce")}<div style={{ borderRadius: 12, overflow: "hidden", background: "#000" }}><iframe src={embedUrl} width="100%" height={mob ? 190 : 320} frameBorder="0" allowFullScreen style={{ display: "block" }} /></div></div>}
          {fmt && <div style={{ marginBottom: 20 }}>{lbl(fmtTitle(fmt))}
            <div style={{ display: "flex", gap: 12, padding: mob ? 12 : 18, background: C.gradientBg, borderRadius: 14, border: "1px solid " + C.borderLight }}>
              <div style={{ width: mob ? 40 : 50, height: mob ? 40 : 50, borderRadius: 12, flexShrink: 0, background: C.gradientSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: mob ? 13 : 16, color: "#fff", fontWeight: 800 }}>{fmt.nom.split(" ").map(n => n[0]).join("")}</div>
              <div><h3 style={{ fontSize: mob ? 13 : 14.5, fontWeight: 700, color: C.text, marginBottom: 2 }}>{fmt.nom}</h3><p style={{ fontSize: mob ? 11 : 12.5, color: C.textTer, lineHeight: 1.5 }}>{fmt.bio}</p></div>
            </div>
          </div>}
          {lbl("Critiques")}
          <AvisSection formationId={f.id} avis={avis} onAdd={handleAddAvis} onEdit={handleEditAvis} mob={mob} userId={user?.id} />
          {otherFmt.length > 0 && <div style={{ marginBottom: 24 }}>{lbl(fmtLabel(fmt))}<div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 10 }}>{otherFmt.slice(0, 4).map(x => <FormationCard key={x.id} f={x} compact mob={mob} />)}</div></div>}
          {otherOrg.length > 0 && <div style={{ marginBottom: 24 }}>{lbl("D'autres de " + (org?.nom || ""))}<div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 10 }}>{otherOrg.slice(0, 4).map(x => <FormationCard key={x.id} f={x} compact mob={mob} />)}</div></div>}
          {otherLike.length > 0 && <div style={{ marginBottom: 24 }}>{lbl("Vous pourriez aimer")}<div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 10 }}>{otherLike.map(x => <FormationCard key={x.id} f={x} compact mob={mob} />)}</div></div>}
        </div>
        {!mob && <div><div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: 22, position: "sticky", top: 80 }}>
          <div><span style={{ fontSize: 32, fontWeight: 800, color: C.text }}>{f.prix}</span><span style={{ fontSize: 14, color: C.textTer }}>€</span></div>
          {(f.prix_salarie || f.prix_liberal || f.prix_dpc !== null) && <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{f.prix_salarie ? `Salarié: ${f.prix_salarie}€ · ` : ""}{f.prix_liberal ? `Libéral: ${f.prix_liberal}€ · ` : ""}{f.prix_dpc !== null ? `DPC: ${f.prix_dpc}€` : ""}</div>}
          <p style={{ fontSize: 11, color: C.textTer, marginBottom: 14 }}>par participant</p>
          <a href="#" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: 13, borderRadius: 12, background: C.gradient, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 28px rgba(212,43,43,0.25)" }}>Réserver 🎬</a>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            {[{ l: "Durée", v: f.duree }, { l: "Modalité", v: f.modalite }, { l: "Production", v: org?.nom || "Indépendant" }, { l: "Effectif", v: f.effectif ? f.effectif + " places" : "—" }].map((x, i) => (<div key={i}><div style={{ fontSize: 10, color: C.textTer, textTransform: "uppercase", fontWeight: 700 }}>{x.l}</div><div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginTop: 1 }}>{x.v}</div></div>))}
          </div>
          {priseEnCharge.length > 0 && <div style={{ marginTop: 14 }}><div style={{ fontSize: 10, color: C.textTer, textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>Prise en charge</div><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{priseEnCharge.map(p => <PriseTag key={p} label={p} />)}</div></div>}
          {sessions.length > 0 && <div style={{ marginTop: 14 }}><div style={{ fontSize: 10, color: C.textTer, textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>Séances</div>{sessions.map((s, i) => (<div key={i} style={{ padding: "9px 11px", background: C.gradientBg, borderRadius: 10, marginBottom: 4, border: "1px solid " + C.borderLight }}><div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{s.dates}</div><div style={{ fontSize: 11, color: C.textTer }}>📍 {s.lieu}{s.adresse ? " — " + s.adresse : ""}</div></div>))}</div>}
        </div></div>}
      </div>
    </div>
  );
}
