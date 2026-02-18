"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { C, type Formation, type Organisme } from "@/lib/data";
import { StarRow, PriseTag } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase } from "@/lib/supabase-data";
import { useRouter } from "next/navigation";

const DOMAINES = ["Langage oral", "Langage écrit", "Neurologie", "OMF", "Cognition mathématique", "Pratique professionnelle", "Autres"];
const MODALITES = ["Présentiel", "Distanciel", "Visio", "Mixte"];
const PRISES = ["DPC", "FIF-PL", "OPCO"];

type SessionRow = { id?: number; dates: string; lieu: string; adresse: string; ville: string; code_postal: string; modalite_session?: string; lien_visio?: string; date_debut?: string; date_fin_session?: string };
type FormateurRow = { id: number; nom: string; bio: string; sexe: string; organisme_id: number | null; user_id: string | null };

function emptyFormation() {
  return {
    titre: "", sous_titre: "", description: "", domaine: DOMAINES[0], domaine_custom: "",
    modalite: MODALITES[0],
    prise_en_charge: [] as string[], prise_aucune: false,
    duree: "", prix: null as number | null, prix_salarie: null as number | null,
    prix_liberal: null as number | null, prix_dpc: null as number | null,
    is_new: false, populations: [] as string[], mots_cles: "",
    professions: ["Orthophonie"], effectif: 0, video_url: "", url_inscription: "",
  };
}

export default function DashboardOrganismePage() {
  const { user, profile } = useAuth();
  const mob = useIsMobile();
  const [organisme, setOrganisme] = useState<Organisme | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "edit" | "formateurs" | "webinaires">("list");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyFormation());
  const [sessions, setSessions] = useState<SessionRow[]>([{ dates: "", lieu: "", adresse: "", ville: "", code_postal: "" }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Formateurs management
  const [formateurs, setFormateurs] = useState<FormateurRow[]>([]);
  const [fmtForm, setFmtForm] = useState({ nom: "", bio: "", sexe: "Non genré" });
  const [editFmtId, setEditFmtId] = useState<number | null>(null);
  const [selFormateurId, setSelFormateurId] = useState<number | null>(null);
  // Admin villes
  const [adminVilles, setAdminVilles] = useState<string[]>([]);
  // Webinaires
  type WbRow = { id?: number; titre: string; description: string; date_heure: string; prix: number; lien_url: string; status?: string };
  const [webinaires, setWebinaires] = useState<WbRow[]>([]);
  const [wForm, setWForm] = useState<WbRow>({ titre: "", description: "", date_heure: "", prix: 0, lien_url: "" });
  const [editWId, setEditWId] = useState<number | null>(null);
  const [wSaving, setWSaving] = useState(false);
  const [wMsg, setWMsg] = useState<string | null>(null);

  // Load organisme + formations
  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      // Find organisme linked to this user
      let { data: myOrgs } = await supabase.from("organismes").select("*").eq("user_id", user.id);
      let myOrg = myOrgs?.[0] || null;
      
      // If no organisme linked, try to find one without user_id and claim it, or create new
      if (!myOrg && profile.role === "organisme") {
        // Try to find an unlinked organisme
        const { data: unlinked } = await supabase.from("organismes").select("*").is("user_id", null).limit(1);
        if (unlinked?.[0]) {
          await supabase.from("organismes").update({ user_id: user.id }).eq("id", unlinked[0].id);
          myOrg = { ...unlinked[0], user_id: user.id };
        } else {
          const { data: newOrg } = await supabase.from("organismes").insert({ 
            nom: profile.full_name || "Mon organisme", 
            logo: (profile.full_name || "MO").slice(0, 2).toUpperCase(), 
            description: "",
            user_id: user.id 
          }).select().single();
          myOrg = newOrg;
        }
      }
      setOrganisme(myOrg);
      if (myOrg) {
        const { data: f } = await supabase.from("formations").select("*, sessions(*)").eq("organisme_id", myOrg.id).order("date_ajout", { ascending: false });
        setFormations(f || []);
        const { data: fmts } = await supabase.from("formateurs").select("*").eq("organisme_id", myOrg.id);
        setFormateurs(fmts || []);
        const { data: wbs } = await supabase.from("webinaires").select("*").eq("organisme_id", myOrg.id).order("date_heure", { ascending: true });
        setWebinaires(wbs || []);
      }
      // Load admin villes
      const { data: villes } = await supabase.from("domaines").select("nom").eq("type", "ville").order("nom");
      setAdminVilles(villes?.map((v: { nom: string }) => v.nom) || []);
      setLoading(false);
    })();
  }, [user, profile]);

  const openEdit = (f?: Formation) => {
    if (f) {
      setEditId(f.id);
      setForm({
        titre: f.titre, sous_titre: f.sous_titre || "", description: f.description,
        domaine: f.domaine, domaine_custom: "",
        modalite: f.modalite, prise_en_charge: f.prise_en_charge || [], prise_aucune: (f.prise_en_charge || []).length === 0,
        duree: f.duree, prix: f.prix, prix_salarie: f.prix_salarie, prix_liberal: f.prix_liberal,
        prix_dpc: f.prix_dpc, is_new: f.is_new, populations: f.populations || [],
        mots_cles: (f.mots_cles || []).join(", "), professions: f.professions || [],
        effectif: f.effectif, video_url: f.video_url || "", url_inscription: f.url_inscription || "",
      });
      setSessions((f.sessions || []).map(s => ({ id: s.id, dates: s.dates, lieu: s.lieu, adresse: s.adresse || "", ville: s.lieu || "", code_postal: "", modalite_session: s.modalite_session || "", lien_visio: s.lien_visio || "" })));
    } else {
      setEditId(null);
      setForm(emptyFormation());
      setSessions([{ dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "", lien_visio: "" }]);
    }
    setMsg(null);
    setTab("edit");
  };

  const handleSave = async () => {
    if (!organisme) return;
    if (!form.titre.trim()) { setMsg("Le titre est obligatoire."); return }
    if (!form.description.trim()) { setMsg("La description est obligatoire."); return }
    setSaving(true); setMsg(null);

    const payload = {
      titre: form.titre.trim(),
      sous_titre: form.sous_titre.trim(),
      description: form.description.trim(),
      domaine: form.domaine === "Autres" ? (form.domaine_custom.trim() || "Autres") : form.domaine,
      modalite: form.modalite,
      prise_en_charge: form.prise_aucune ? [] : form.prise_en_charge,
      duree: form.duree || "7h",
      prix: form.prix ?? 0,
      prix_salarie: form.prix_salarie || null,
      prix_liberal: form.prix_liberal || null,
      prix_dpc: form.prix_dpc || null,
      is_new: true,
      populations: form.populations,
      mots_cles: form.mots_cles.split(",").map((s: string) => s.trim()).filter(Boolean),
      professions: form.professions.length ? form.professions : ["Orthophonie"],
      effectif: form.effectif || 20,
      video_url: form.video_url,
      url_inscription: form.url_inscription || "",
      organisme_id: organisme.id,
      formateur_id: selFormateurId || null as number | null,
      note: 0,
      nb_avis: 0,
      sans_limite: false,
      date_fin: null as string | null,
      date_ajout: new Date().toISOString().slice(0, 10),
    };

    let formationId = editId;

    if (editId) {
      // Modification: remet en attente
      const { error } = await supabase.from("formations").update({ ...payload, status: "en_attente" }).eq("id", editId);
      if (error) { setMsg("Erreur: " + error.message); setSaving(false); return }
    } else {
      // Création: en attente de validation
      const { data, error } = await supabase.from("formations").insert({ ...payload, status: "en_attente" }).select().single();
      if (error) { setMsg("Erreur: " + error.message); setSaving(false); return }
      formationId = data.id;
    }

    // Sessions: delete old, insert new
    if (formationId) {
      await supabase.from("sessions").delete().eq("formation_id", formationId);
      const validSessions = sessions.filter(s => s.dates.trim() && (s.ville.trim() || s.lieu.trim()));
      if (validSessions.length > 0) {
        await supabase.from("sessions").insert(validSessions.map(s => ({
          formation_id: formationId,
          dates: s.dates.trim(),
          lieu: s.ville.trim() || s.lieu.trim(),
          adresse: [s.adresse.trim(), s.ville.trim(), s.code_postal.trim()].filter(Boolean).join(", "),
          modalite_session: s.modalite_session || null,
          lien_visio: s.lien_visio || null,
        })));
      }
    }

    // Reload
    const { data: f } = await supabase.from("formations").select("*, sessions(*)").eq("organisme_id", organisme.id).order("date_ajout", { ascending: false });
    setFormations(f || []);
    setSaving(false);
    setTab("list");
    setMsg(null);
  };

  // === FORMATEURS MANAGEMENT ===
  const handleSaveFormateur = async () => {
    if (!organisme) return;
    if (!fmtForm.nom.trim()) { setMsg("Le nom du formateur est obligatoire."); return }
    setSaving(true); setMsg(null);
    if (editFmtId) {
      const { error } = await supabase.from("formateurs").update({ nom: fmtForm.nom.trim(), bio: fmtForm.bio.trim(), sexe: fmtForm.sexe }).eq("id", editFmtId);
      if (error) { setMsg("Erreur: " + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from("formateurs").insert({ nom: fmtForm.nom.trim(), bio: fmtForm.bio.trim(), sexe: fmtForm.sexe, organisme_id: organisme.id }).select().single();
      if (error) { setMsg("Erreur: " + error.message); setSaving(false); return }
    }
    // Reload formateurs
    const { data: fmts } = await supabase.from("formateurs").select("*").eq("organisme_id", organisme.id);
    setFormateurs(fmts || []);
    setFmtForm({ nom: "", bio: "", sexe: "Non genré" });
    setEditFmtId(null);
    setSaving(false);
    setMsg("✅ Formateur·rice enregistré·e !");
    setTimeout(() => setMsg(null), 3000);
  };

  const handleDeleteFormateur = async (id: number) => {
    if (!organisme) return;
    if (!confirm("Supprimer ce formateur·rice ?")) return;
    await supabase.from("formateurs").delete().eq("id", id);
    setFormateurs(prev => prev.filter(f => f.id !== id));
  };

  const openEditFormateur = (f: FormateurRow) => {
    setEditFmtId(f.id);
    setFmtForm({ nom: f.nom, bio: f.bio || "", sexe: f.sexe || "Non genré" });
    setMsg(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette formation ?")) return;
    await supabase.from("sessions").delete().eq("formation_id", id);
    await supabase.from("formations").delete().eq("id", id);
    setFormations(prev => prev.filter(f => f.id !== id));
  };

  if (!user) { if (typeof window !== "undefined") window.location.href = "/"; return null }
  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  if (profile?.role !== "organisme") { if (typeof window !== "undefined") window.location.href = "/"; return null }

  const px = mob ? "0 16px" : "0 40px";
  const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: px }}>
      <div style={{ padding: "18px 0 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
          <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>🏢 Dashboard {organisme?.nom}</h1>
          <p style={{ fontSize: 12, color: C.textTer }}>{formations.length} formation{formations.length > 1 ? "s" : ""} publiée{formations.length > 1 ? "s" : ""}</p>
        </div>
        {tab === "list" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setTab("formateurs")} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🎤 Formateur·rice·s ({formateurs.length})</button>
            <button onClick={() => setTab("webinaires")} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: "#7C3AED", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📡 Webinaires</button>
            <button onClick={() => openEdit()} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nouvelle formation</button>
          </div>
        )}
      </div>

      {/* ===== STATS ===== */}
      {tab === "list" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Formations", value: formations.length, icon: "🎬" },
              { label: "Sessions", value: formations.reduce((s, f) => s + (f.sessions?.length || 0), 0), icon: "📅" },
              { label: "Note moyenne", value: formations.length ? (formations.reduce((s, f) => s + f.note, 0) / formations.length).toFixed(1) : "—", icon: "⭐" },
              { label: "Places totales", value: formations.reduce((s, f) => s + f.effectif, 0), icon: "👥" },
            ].map(s => (
              <div key={s.label} style={{ padding: mob ? 12 : 16, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontSize: mob ? 20 : 24, fontWeight: 800, color: C.text }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.textTer }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ===== LIST ===== */}
          {formations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textTer }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
              <p>Aucune formation. Créez votre première !</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 40 }}>
              {formations.map(f => (
                <div key={f.id} style={{ padding: mob ? 12 : 18, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, display: "flex", gap: mob ? 8 : 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: mob ? 14 : 16, fontWeight: 700, color: C.text }}>{f.titre}</span>
                      {f.is_new && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.gradient, color: "#fff" }}>NEW</span>}
                      {f.status === "en_attente" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.yellowBg, color: C.yellowDark }}>⏳ En attente</span>}
                      {f.status === "refusee" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.pinkBg, color: C.pink }}>✕ Refusée</span>}
                      {f.status === "publiee" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.greenBg, color: C.green }}>✓ Publiée</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: C.textTer }}>
                      <span>{f.domaine}</span><span>·</span><span>{f.modalite}</span><span>·</span><span>{f.prix}€</span><span>·</span><span>{(f.sessions || []).length} session{(f.sessions || []).length > 1 ? "s" : ""}</span>
                    </div>
                    {(f.prise_en_charge || []).length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 4 }}>{f.prise_en_charge.map(p => <PriseTag key={p} label={p} />)}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <StarRow rating={Math.round(f.note)} />
                    <span style={{ fontSize: 12, color: C.textSec }}>{f.note}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link href={`/formation/${f.id}`} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, textDecoration: "none", cursor: "pointer" }}>👁️ Voir</Link>
                    <button onClick={() => openEdit(f)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, cursor: "pointer" }}>✏️ Modifier</button>
                    <button onClick={() => handleDelete(f.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== FORMATEURS TAB ===== */}
      {tab === "formateurs" && (
        <div style={{ paddingBottom: 40 }}>
          <button onClick={() => { setTab("list"); setMsg(null); setEditFmtId(null); setFmtForm({ nom: "", bio: "", sexe: "Non genré" }) }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer", marginBottom: 16 }}>← Retour</button>
          <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text, marginBottom: 16 }}>🎤 Formateur·rice·s de {organisme?.nom}</h2>

          {/* Liste des formateurs existants */}
          {formateurs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {formateurs.map(f => (
                <div key={f.id} style={{ padding: mob ? 12 : 16, background: C.surface, borderRadius: 12, border: "1px solid " + C.borderLight, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{f.nom}</div>
                    <div style={{ fontSize: 12, color: C.textTer }}>{f.sexe === "Femme" ? "Formatrice" : f.sexe === "Homme" ? "Formateur" : "Formateur·rice"}{f.bio ? " · " + f.bio.slice(0, 60) + (f.bio.length > 60 ? "..." : "") : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openEditFormateur(f)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>✏️ Modifier</button>
                    <button onClick={() => handleDeleteFormateur(f.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 12, cursor: "pointer" }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire ajout/édition */}
          <div style={{ padding: mob ? 16 : 24, background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 }}>{editFmtId ? "Modifier le·la formateur·rice" : "Ajouter un·e formateur·rice"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Nom complet *</label>
                <input value={fmtForm.nom} onChange={e => setFmtForm({ ...fmtForm, nom: e.target.value })} placeholder="Ex: Dr. Marie Lefort" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Genre (affichage formateur/formatrice)</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Homme", "Femme", "Non genré"].map(s => (
                    <button key={s} type="button" onClick={() => setFmtForm({ ...fmtForm, sexe: s })} style={{ flex: 1, padding: "8px 10px", borderRadius: 9, border: "1.5px solid " + (fmtForm.sexe === s ? C.accent + "55" : C.border), background: fmtForm.sexe === s ? C.accentBg : C.surface, color: fmtForm.sexe === s ? C.accent : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: fmtForm.sexe === s ? 700 : 400 }}>
                      {s === "Homme" ? "Formateur" : s === "Femme" ? "Formatrice" : "Formateur·rice"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                <label style={labelStyle}>Biographie</label>
                <textarea value={fmtForm.bio} onChange={e => setFmtForm({ ...fmtForm, bio: e.target.value })} placeholder="Parcours, spécialisations..." style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
              </div>
            </div>
            {msg && <p style={{ color: msg.startsWith("✅") ? C.green : C.pink, fontSize: 13, marginTop: 10, textAlign: "center" }}>{msg}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={handleSaveFormateur} disabled={saving} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
                {saving ? "⏳ ..." : editFmtId ? "Enregistrer" : "Ajouter 🎤"}
              </button>
              {editFmtId && (
                <button onClick={() => { setEditFmtId(null); setFmtForm({ nom: "", bio: "", sexe: "Non genré" }); setMsg(null) }} style={{ padding: "10px 24px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 13, cursor: "pointer" }}>Annuler</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT FORM ===== */}
      {tab === "edit" && (
        <div style={{ paddingBottom: 40 }}>
          <button onClick={() => { setTab("list"); setMsg(null) }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer", marginBottom: 16 }}>← Retour à la liste</button>
          <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text, marginBottom: 16 }}>{editId ? "Modifier la formation" : "Nouvelle formation"}</h2>

          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 14 }}>
            {/* Titre */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Titre *</label>
              <input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Ex: Prise en charge du langage oral" style={inputStyle} />
            </div>

            {/* Sous-titre */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Sous-titre</label>
              <input value={form.sous_titre} onChange={e => setForm({ ...form, sous_titre: e.target.value })} placeholder="Ex: Approche fondée sur les preuves" style={inputStyle} />
            </div>

            {/* Description */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Description *</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez la formation..." style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} />
            </div>

            {/* Formateur */}
            <div>
              <label style={labelStyle}>Formateur·rice</label>
              <select value={selFormateurId ?? ""} onChange={e => setSelFormateurId(e.target.value ? Number(e.target.value) : null)} style={inputStyle}>
                <option value="">— Aucun —</option>
                {formateurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
              {formateurs.length === 0 && <p style={{ fontSize: 11, color: C.textTer, marginTop: 4 }}>Ajoutez d&apos;abord un formateur dans l&apos;onglet &quot;Formateur·rice·s&quot;</p>}
            </div>

            {/* Domaine */}
            <div>
              <label style={labelStyle}>Domaine</label>
              <select value={form.domaine} onChange={e => setForm({ ...form, domaine: e.target.value })} style={inputStyle}>
                {DOMAINES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {form.domaine === "Autres" && (
                <input value={form.domaine_custom} onChange={e => setForm({ ...form, domaine_custom: e.target.value })} placeholder="Précisez le domaine..." style={{ ...inputStyle, marginTop: 6 }} />
              )}
            </div>

            {/* Modalité */}
            <div>
              <label style={labelStyle}>Modalité</label>
              <select value={form.modalite} onChange={e => setForm({ ...form, modalite: e.target.value })} style={inputStyle}>
                {MODALITES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Prix */}
            <div>
              <label style={labelStyle}>Prix (€)</label>
              <input type="number" min="0" value={form.prix ?? ""} onChange={e => setForm({ ...form, prix: e.target.value === "" ? null : Number(e.target.value) })} placeholder="0" style={inputStyle} />
            </div>

            {/* Durée */}
            <div>
              <label style={labelStyle}>Durée</label>
              <input value={form.duree} onChange={e => setForm({ ...form, duree: e.target.value })} placeholder="Ex: 14h (2j)" style={inputStyle} />
            </div>

            {/* Prix variantes */}
            <div>
              <label style={labelStyle}>Prix salarié (€)</label>
              <input type="number" value={form.prix_salarie ?? ""} onChange={e => setForm({ ...form, prix_salarie: e.target.value ? Number(e.target.value) : null })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Prix libéral (€)</label>
              <input type="number" value={form.prix_liberal ?? ""} onChange={e => setForm({ ...form, prix_liberal: e.target.value ? Number(e.target.value) : null })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Prix DPC (€)</label>
              <input type="number" value={form.prix_dpc ?? ""} onChange={e => setForm({ ...form, prix_dpc: e.target.value ? Number(e.target.value) : null })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Effectif max</label>
              <input type="number" value={form.effectif} onChange={e => setForm({ ...form, effectif: Number(e.target.value) })} style={inputStyle} />
            </div>

            {/* Prise en charge */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Prise en charge</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setForm({ ...form, prise_aucune: !form.prise_aucune, prise_en_charge: [] })}
                  style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px solid " + (form.prise_aucune ? C.textTer + "88" : C.border), background: form.prise_aucune ? "#F5F5F5" : C.bgAlt, color: form.prise_aucune ? C.textSec : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: form.prise_aucune ? 700 : 400 }}>
                  Aucune
                </button>
                {!form.prise_aucune && PRISES.map(p => (
                  <button key={p} onClick={() => setForm({ ...form, prise_en_charge: form.prise_en_charge.includes(p) ? form.prise_en_charge.filter(x => x !== p) : [...form.prise_en_charge, p] })}
                    style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px solid " + (form.prise_en_charge.includes(p) ? C.accent + "55" : C.border), background: form.prise_en_charge.includes(p) ? C.accentBg : C.bgAlt, color: form.prise_en_charge.includes(p) ? C.accent : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: form.prise_en_charge.includes(p) ? 700 : 400 }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Mots-clés */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Mots-clés (séparés par des virgules)</label>
              <input value={form.mots_cles} onChange={e => setForm({ ...form, mots_cles: e.target.value })} placeholder="Ex: TDL, évaluation, rééducation" style={inputStyle} />
            </div>

            {/* Populations */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Populations</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Nourrisson/bébé", "Enfant", "Adolescent", "Adulte", "Senior"].map(p => (
                  <button key={p} onClick={() => setForm({ ...form, populations: form.populations.includes(p) ? form.populations.filter(x => x !== p) : [...form.populations, p] })}
                    style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + (form.populations.includes(p) ? C.blue + "55" : C.border), background: form.populations.includes(p) ? C.blueBg : C.bgAlt, color: form.populations.includes(p) ? C.blue : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: form.populations.includes(p) ? 700 : 400 }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Video URL */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>URL vidéo (YouTube)</label>
              <input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
            </div>

            {/* URL inscription */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>URL d&apos;inscription (lien vers votre site)</label>
              <input value={form.url_inscription || ""} onChange={e => setForm({ ...form, url_inscription: e.target.value })} placeholder="https://monsite.fr/inscription" style={inputStyle} />
            </div>
          </div>

          {/* ===== SESSIONS ===== */}
          <div style={{ marginTop: 24 }}>
            <label style={labelStyle}>Sessions</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {sessions.map((s, i) => {
                const modaliteFormation = form.modalite;
                const showModaliteSession = modaliteFormation === "Mixte";
                const effModalite = showModaliteSession ? (s.modalite_session || "Présentiel") : modaliteFormation;
                const isDistanciel = effModalite === "Distanciel";
                const isPresentiel = effModalite === "Présentiel";
                return (
                  <div key={i} style={{ padding: mob ? 12 : 16, background: C.bgAlt, borderRadius: 12, border: "1px solid " + C.borderLight }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.textTer }}>Session {i + 1}</span>
                      <button onClick={() => setSessions(sessions.filter((_, j) => j !== i))} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>✕ Supprimer</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 8 }}>
                      {/* Dates avec date picker */}
                      <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                        <label style={labelStyle}>Dates</label>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <input type="date" value={s.date_debut || ""} onChange={e => { const n = [...sessions]; n[i] = { ...n[i], date_debut: e.target.value }; setSessions(n) }} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
                          <span style={{ color: C.textTer, fontSize: 12 }}>au</span>
                          <input type="date" value={s.date_fin_session || ""} onChange={e => { const n = [...sessions]; n[i] = { ...n[i], date_fin_session: e.target.value, dates: (s.date_debut || "") + (e.target.value ? " → " + e.target.value : "") }; setSessions(n) }} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
                        </div>
                      </div>
                      {/* Modalité par session si Mixte */}
                      {showModaliteSession && (
                        <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                          <label style={labelStyle}>Modalité de cette session</label>
                          <div style={{ display: "flex", gap: 6 }}>
                            {["Présentiel", "Distanciel"].map(m => (
                              <button key={m} type="button" onClick={() => { const n = [...sessions]; n[i] = { ...n[i], modalite_session: m }; setSessions(n) }}
                                style={{ flex: 1, padding: "8px 10px", borderRadius: 9, border: "1.5px solid " + ((s.modalite_session || "Présentiel") === m ? C.accent + "55" : C.border), background: (s.modalite_session || "Présentiel") === m ? C.accentBg : C.surface, color: (s.modalite_session || "Présentiel") === m ? C.accent : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: (s.modalite_session || "Présentiel") === m ? 700 : 400 }}>
                                {m === "Présentiel" ? "🏢 Présentiel" : "💻 Distanciel"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Adresse si présentiel */}
                      {(isPresentiel || !isDistanciel) && (
                        <>
                          <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                            <label style={labelStyle}>Adresse</label>
                            <input value={s.adresse} onChange={e => { const n = [...sessions]; n[i].adresse = e.target.value; setSessions(n) }} placeholder="Ex: 12 rue de la Paix" style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Ville</label>
                            {adminVilles.length > 0 ? (
                              <select value={s.ville} onChange={e => { const n = [...sessions]; n[i].ville = e.target.value; n[i].lieu = e.target.value; setSessions(n); }} style={inputStyle}>
                                <option value="">— Choisir une ville —</option>
                                {adminVilles.map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            ) : (
                              <input value={s.ville} onChange={e => { const n = [...sessions]; n[i].ville = e.target.value; n[i].lieu = e.target.value; setSessions(n); }} placeholder="Ex: Paris" style={inputStyle} />
                            )}
                          </div>
                          <div>
                            <label style={labelStyle}>Code postal</label>
                            <input value={s.code_postal} onChange={e => { const n = [...sessions]; n[i].code_postal = e.target.value; setSessions(n) }} placeholder="Ex: 75001" style={inputStyle} />
                          </div>
                        </>
                      )}
                      {/* Lien visio si distanciel */}
                      {isDistanciel && (
                        <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                          <label style={labelStyle}>Lien visioconférence</label>
                          <input value={s.lien_visio || ""} onChange={e => { const n = [...sessions]; n[i].lien_visio = e.target.value; setSessions(n) }} placeholder="https://zoom.us/j/..." style={inputStyle} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setSessions([...sessions, { dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "", lien_visio: "" }])} style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px dashed " + C.border, background: "transparent", color: C.textTer, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>+ Ajouter une session</button>
            </div>
          </div>

          {/* Save */}
          {msg && <p style={{ color: C.pink, fontSize: 13, marginTop: 14, textAlign: "center" }}>{msg}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
              {saving ? "⏳ Enregistrement..." : editId ? "Enregistrer les modifications" : "Publier la formation 🍿"}
            </button>
            <button onClick={() => { setTab("list"); setMsg(null) }} style={{ padding: "12px 28px", borderRadius: 12, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 14, cursor: "pointer" }}>Annuler</button>
          </div>
        </div>
      )}

      {/* ===== WEBINAIRES TAB ===== */}
      {tab === "webinaires" && (
        <div style={{ paddingBottom: 40 }}>
          <button onClick={() => { setTab("list"); setWMsg(null); setEditWId(null); setWForm({ titre: "", description: "", date_heure: "", prix: 0, lien_url: "" }); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer", marginBottom: 16 }}>← Retour</button>
          <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>📡 Webinaires</h2>
          <p style={{ fontSize: 12, color: C.textTer, marginBottom: 16 }}>Vos webinaires seront soumis à validation admin avant publication.</p>

          {/* Liste webinaires existants */}
          {webinaires.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {webinaires.map(w => (
                <div key={w.id} style={{ padding: mob ? 12 : 16, background: C.surface, borderRadius: 12, border: "1px solid " + C.borderLight, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{w.titre}</div>
                    <div style={{ fontSize: 11, color: C.textTer }}>{w.date_heure ? new Date(w.date_heure).toLocaleString("fr-FR") : "—"} · {w.prix === 0 ? "Gratuit" : w.prix + "€"}</div>
                    {w.status === "en_attente" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.yellowBg, color: C.yellowDark }}>⏳ En attente</span>}
                    {w.status === "publie" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.greenBg, color: C.green }}>✓ Publié</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setEditWId(w.id!); setWForm({ titre: w.titre, description: w.description, date_heure: w.date_heure, prix: w.prix, lien_url: w.lien_url }); }} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, cursor: "pointer" }}>✏️</button>
                    <button onClick={async () => { if (!confirm("Supprimer ?")) return; await supabase.from("webinaires").delete().eq("id", w.id); setWebinaires(prev => prev.filter(x => x.id !== w.id)); }} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire webinaire */}
          <div style={{ padding: mob ? 16 : 24, background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>{editWId ? "Modifier le webinaire" : "Créer un webinaire"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Titre *</label>
                <input value={wForm.titre} onChange={e => setWForm({ ...wForm, titre: e.target.value })} placeholder="Ex: Introduction à la prise en charge TDL" style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "inherit" }} />
              </div>
              <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Description</label>
                <textarea value={wForm.description} onChange={e => setWForm({ ...wForm, description: e.target.value })} style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const, minHeight: 70, resize: "vertical" as const, fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Date et heure *</label>
                <input type="datetime-local" value={wForm.date_heure} onChange={e => setWForm({ ...wForm, date_heure: e.target.value })} style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Prix (€) — 0 = gratuit</label>
                <input type="number" min="0" value={wForm.prix} onChange={e => setWForm({ ...wForm, prix: Number(e.target.value) })} style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
              </div>
              <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Lien de connexion (Zoom, Teams…)</label>
                <input value={wForm.lien_url} onChange={e => setWForm({ ...wForm, lien_url: e.target.value })} placeholder="https://zoom.us/j/..." style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
              </div>
            </div>
            {wMsg && <p style={{ color: wMsg.startsWith("✅") ? C.green : C.pink, fontSize: 13, marginTop: 10 }}>{wMsg}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button disabled={wSaving} onClick={async () => {
                if (!wForm.titre.trim() || !wForm.date_heure) { setWMsg("Titre et date obligatoires."); return; }
                setWSaving(true); setWMsg(null);
                if (editWId) {
                  await supabase.from("webinaires").update({ ...wForm }).eq("id", editWId);
                  setWebinaires(prev => prev.map(x => x.id === editWId ? { ...x, ...wForm } : x));
                  setEditWId(null);
                } else {
                  const { data: wb } = await supabase.from("webinaires").insert({ ...wForm, organisme_id: organisme?.id, status: "en_attente" }).select().single();
                  if (wb) setWebinaires(prev => [...prev, wb]);
                }
                setWForm({ titre: "", description: "", date_heure: "", prix: 0, lien_url: "" });
                setWSaving(false); setWMsg("✅ Webinaire soumis pour validation !");
                setTimeout(() => setWMsg(null), 3000);
              }} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: wSaving ? 0.5 : 1 }}>
                {wSaving ? "⏳ ..." : editWId ? "Enregistrer" : "📡 Soumettre le webinaire"}
              </button>
              {editWId && <button onClick={() => { setEditWId(null); setWForm({ titre: "", description: "", date_heure: "", prix: 0, lien_url: "" }); }} style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 13, cursor: "pointer" }}>Annuler</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
