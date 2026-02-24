"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { C, fetchDomainesAdmin, invalidateCache, type Formation, type Organisme } from "@/lib/data";
import { StarRow, PriseTag } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase } from "@/lib/supabase-data";
import { uploadImage } from "@/lib/upload";
import { useRouter } from "next/navigation";

const MODALITES = ["Présentiel", "Visio", "Mixte"];
const PRISES = ["DPC", "FIF-PL"];

type PartieRow = { titre: string; jours: string[]; modalite: string; lieu: string; adresse: string; ville: string; code_postal: string; lien_visio: string; date_debut: string; date_fin: string };
type SessionRow = { id?: number; dates: string; lieu: string; adresse: string; ville: string; code_postal: string; modalite_session?: string; lien_visio?: string; date_debut?: string; date_fin_session?: string; is_visio?: boolean; nb_parties: number; parties?: PartieRow[] };
type FormateurRow = { id: number; nom: string; bio: string; sexe: string; organisme_id: number | null; user_id: string | null; photo_url?: string | null };

function emptyFormation(domainesList: { nom: string; emoji: string }[] = []) {
  return {
    titre: "", sous_titre: "", description: "", domaine: "", domaine_custom: "",
    modalite: MODALITES[0],
    prise_en_charge: [] as string[], prise_aucune: false,
    duree: "", prix: null as number | null, prix_salarie: null as number | null,
    prix_liberal: null as number | null, prix_dpc: null as number | null,
    is_new: false, populations: [] as string[], mots_cles: "",
    professions: ["Orthophonie"], effectif: null as number | null, video_url: "", url_inscription: "", photo_url: "" as string,
  };
}

export default function DashboardOrganismePage() {
  const { user, profile } = useAuth();
  const mob = useIsMobile();
  const [organisme, setOrganisme] = useState<Organisme | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "edit" | "formateurs" | "webinaires" | "congres">("list");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyFormation());
  const defaultParty = (): PartieRow => ({ titre: "", jours: [], modalite: "Présentiel", lieu: "", adresse: "", ville: "", code_postal: "", lien_visio: "", date_debut: "", date_fin: "" });
  const [sessions, setSessions] = useState<SessionRow[]>([{ dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "", lien_visio: "", is_visio: false, nb_parties: 1, parties: [defaultParty()] }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Formateurs management
  const [formateurs, setFormateurs] = useState<FormateurRow[]>([]);
  const [fmtForm, setFmtForm] = useState({ prenom: "", nom: "", bio: "", sexe: "Non genré", photo_url: "" });
  const [fmtPhotoFile, setFmtPhotoFile] = useState<File | null>(null);
  const [editFmtId, setEditFmtId] = useState<number | null>(null);
  const [selFormateurId, setSelFormateurId] = useState<number | null>(null);
  // Admin villes
  const [adminVilles, setAdminVilles] = useState<string[]>([]);
  // Domaines from admin
  const [domainesList, setDomainesList] = useState<{ nom: string; emoji: string }[]>([]);
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [orgSiteUrl, setOrgSiteUrl] = useState<string>("");
  const [orgNom, setOrgNom] = useState<string>("");
  // Webinaires
  type WbRow = { id?: number; titre: string; description: string; date_heure: string; prix: number; lien_url: string; status?: string };
  const [webinaires, setWebinaires] = useState<WbRow[]>([]);
  const [wForm, setWForm] = useState<WbRow>({ titre: "", description: "", date_heure: "", prix: 0, lien_url: "" });
  const [editWId, setEditWId] = useState<number | null>(null);
  const [wSaving, setWSaving] = useState(false);
  const [wMsg, setWMsg] = useState<string | null>(null);
  // Congrès
  type SpeakerRow = { nom: string; titre_intervention: string };
  type CongresRow = { id?: number; titre: string; description: string; date: string; adresse: string; lien_url: string | null; lien_visio: string | null; photo_url?: string | null; status?: string; speakers: SpeakerRow[] };
  const emptyCongres = (): CongresRow => ({ titre: "", description: "", date: "", adresse: "", lien_url: "", lien_visio: "", speakers: [] });
  const [congresList, setCongresList] = useState<CongresRow[]>([]);
  const [cForm, setCForm] = useState<CongresRow>(emptyCongres());
  const [editCId, setEditCId] = useState<number | null>(null);
  const [cSaving, setCSaving] = useState(false);
  const [cMsg, setCMsg] = useState<string | null>(null);
  const [cPhotoFile, setCPhotoFile] = useState<File | null>(null);

  // Load organisme + formations
  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      // Find organisme linked to this user
      let { data: myOrgs } = await supabase.from("organismes").select("*").eq("user_id", user.id).order("id").limit(1);
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
      setOrgSiteUrl((myOrg as any)?.site_url || "");
      setOrgNom(myOrg?.nom || "");
      if (myOrg) {
        const { data: f } = await supabase.from("formations").select("*, sessions(*, session_parties(*))").eq("organisme_id", myOrg.id).order("date_ajout", { ascending: false });
        setFormations(f || []);
        const { data: fmts } = await supabase.from("formateurs").select("*").eq("organisme_id", myOrg.id);
        setFormateurs(fmts || []);
        const { data: wbs } = await supabase.from("webinaires").select("*").eq("organisme_id", myOrg.id).order("date_heure", { ascending: true });
        setWebinaires(wbs || []);
        const { data: cgs } = await supabase.from("congres").select("*, speakers:congres_speakers(nom,titre_intervention)").eq("organisme_id", myOrg.id).order("date", { ascending: true });
        setCongresList((cgs || []).map((c: any) => ({ ...c, speakers: c.speakers || [] })));
      }
      // Load admin villes
      const { data: villes } = await supabase.from("villes_admin").select("nom").order("nom");
      setAdminVilles(villes?.map((v: { nom: string }) => v.nom) || []);
      // Load domaines from admin
      const domaines = await fetchDomainesAdmin();
      setDomainesList(domaines.map(d => ({ nom: d.nom, emoji: d.emoji })));
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
        effectif: f.effectif, video_url: f.video_url || "", url_inscription: f.url_inscription || "", photo_url: (f as any).photo_url || "",
      });
      setSessions((f.sessions || []).map(s => { const sp = (s as any).session_parties || []; const parties = sp.length > 0 ? sp.map((p: any) => ({ titre: p.titre || "", jours: p.jours ? p.jours.split(",").filter(Boolean) : (p.date_debut ? [p.date_debut] : []), date_debut: p.date_debut || "", date_fin: p.date_fin || "", modalite: p.modalite || "Présentiel", lieu: p.lieu || "", adresse: p.adresse || "", ville: p.ville || "", code_postal: p.code_postal || "", lien_visio: p.lien_visio || "" })) : [defaultParty()]; return { id: s.id, dates: s.dates, lieu: s.lieu, adresse: s.adresse || "", ville: s.lieu || "", code_postal: "", modalite_session: s.modalite_session || "", lien_visio: s.lien_visio || "", is_visio: s.lieu === "Visio" || !!s.lien_visio, nb_parties: parties.length, parties }; }));
    } else {
      setEditId(null);
      setForm(emptyFormation());
      setSessions([{ dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "", lien_visio: "", is_visio: false, nb_parties: 1, parties: [defaultParty()] }]);
      setFormPhotoFile(null);
    }
    setMsg(null);
    setTab("edit");
  };

  const handleSave = async () => {
    if (!organisme) return;
    if (!form.titre.trim()) { setMsg("Le titre est obligatoire."); return }
    if (!form.description.trim()) { setMsg("La description est obligatoire."); return }
    if (!form.domaine) { setMsg("Le domaine est obligatoire."); return }
    if (!selFormateurId) { setMsg("Veuillez sélectionner un·e formateur·rice."); return }
    const hasDate = sessions.every(s => (s.parties || []).some(p => (p.jours || []).length > 0 || p.date_debut));
    if (sessions.length > 0 && !hasDate) { setMsg("Chaque session doit avoir au moins une date."); return }
    setSaving(true); setMsg(null);

    // Déterminer la modalité en fonction des sessions
    const allVisio = sessions.length > 0 && sessions.every(s => s.is_visio);
    const someVisio = sessions.some(s => s.is_visio) && !allVisio;
    const computedModalite = allVisio ? "Visio" : someVisio ? "Mixte" : (form.modalite || "Présentiel");

    const payload = {
      titre: form.titre.trim(),
      sous_titre: form.sous_titre.trim(),
      description: form.description.trim(),
      domaine: form.domaine === "Autres" ? (form.domaine_custom.trim() || "Autres") : form.domaine,
      modalite: computedModalite,
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
      effectif: form.effectif ?? 0, photo_url: form.photo_url || null,
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

    // Upload photo si présente
    let formPhotoUrl: string | null = form.photo_url || null;
    if (formPhotoFile) {
      try {
        const { uploadImage } = await import("@/lib/upload");
        formPhotoUrl = await uploadImage(formPhotoFile, "formations");
      } catch (_) {
        setMsg("⚠️ Photo non uploadée (créez un bucket \"images\" dans Supabase Storage) — formation soumise sans photo.");
      }
    }
    if (formPhotoUrl) payload.photo_url = formPhotoUrl;

    if (editId) {
      // Modification: repasse en attente de validation
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
      const validSessions = sessions.filter(s => (s.parties && s.parties.length > 0) || (s.dates.trim() && (s.ville.trim() || s.lieu.trim() || (s.lien_visio || "").trim())));
      if (validSessions.length > 0) {
        const { data: insertedSessions } = await supabase.from("sessions").insert(validSessions.map(s => ({
          formation_id: formationId,
          dates: s.parties && s.parties.length > 0 
            ? s.parties.map((p, pi) => { const lbl = p.titre || ("Partie " + (pi+1)); const d = p.jours && p.jours.length > 0 ? (p.jours.length === 1 ? p.jours[0] : p.jours[0] + " → " + p.jours[p.jours.length-1]) : (p.date_debut || ""); return `${lbl}: ${d}`; }).join(" | ")
            : (s.date_debut ? (s.date_debut + (s.date_fin_session ? " → " + s.date_fin_session : "")) : s.dates.trim()),
          lieu: s.parties && s.parties.length > 0
            ? [...new Set(s.parties.map(p => p.modalite === "Visio" ? "Visio" : p.lieu).filter(Boolean))].join(", ")
            : (s.is_visio ? "Visio" : (s.ville.trim() || s.lieu.trim())),
          adresse: s.parties && s.parties.length > 0
            ? s.parties.map(p => p.modalite === "Visio" ? (p.lien_visio || "Visio") : [p.adresse, p.lieu].filter(Boolean).join(", ")).join(" | ")
            : (s.is_visio ? ((s.lien_visio || "").trim()) : [s.adresse.trim(), s.ville.trim(), s.code_postal.trim()].filter(Boolean).join(", ")),
          modalite_session: s.modalite_session || null,
          lien_visio: s.lien_visio || null,
        }))).select();
        // Save parties for each session
        if (insertedSessions) {
          for (let si = 0; si < validSessions.length; si++) {
            const parties = validSessions[si].parties || [];
            if (parties.length > 0 && insertedSessions[si]) {
              await supabase.from("session_parties").insert(
                parties.map(p => ({ session_id: insertedSessions[si].id, titre: p.titre, modalite: p.modalite, lieu: p.lieu || p.ville, adresse: [p.adresse, p.code_postal].filter(Boolean).join(", ") || null, ville: p.ville, lien_visio: p.lien_visio || null, date_debut: p.jours?.[0] || p.date_debut || null, date_fin: p.jours?.[p.jours.length-1] || p.date_fin || null, jours: (p.jours || []).join(",") || null }))
              );
            }
          }
        }
      }
    }

    // Reload
    const { data: f } = await supabase.from("formations").select("*, sessions(*, session_parties(*))").eq("organisme_id", organisme.id).order("date_ajout", { ascending: false });
    setFormations(f || []);
    setSaving(false);
    setFormPhotoFile(null);
    setTab("list");
    setMsg(null);
  };

  // === FORMATEURS MANAGEMENT ===
  const handleSaveFormateur = async () => {
    if (!organisme) return;
    const fullName = [fmtForm.prenom.trim(), fmtForm.nom.trim()].filter(Boolean).join(" ");
    if (!fullName) { setMsg("Le nom du formateur est obligatoire."); return }
    setSaving(true); setMsg(null);
    let photoUrl: string | null = fmtForm.photo_url || null;
    if (fmtPhotoFile) {
      try {
        const { uploadImage } = await import("@/lib/upload");
        photoUrl = await uploadImage(fmtPhotoFile, "profils");
        setFmtPhotoFile(null);
      } catch (e: any) { setMsg("Erreur photo: " + e.message); setSaving(false); return; }
    }
    if (editFmtId) {
      const { error } = await supabase.from("formateurs").update({ nom: fullName, bio: fmtForm.bio.trim(), sexe: fmtForm.sexe, photo_url: photoUrl }).eq("id", editFmtId);
      if (error) { setMsg("Erreur: " + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from("formateurs").insert({ nom: fullName, bio: fmtForm.bio.trim(), sexe: fmtForm.sexe, organisme_id: organisme.id, photo_url: photoUrl }).select().single();
      if (error) { setMsg("Erreur: " + error.message); setSaving(false); return }
    }
    // Reload formateurs
    const { data: fmts } = await supabase.from("formateurs").select("*").eq("organisme_id", organisme.id);
    setFormateurs(fmts || []);
    setFmtForm({ prenom: "", nom: "", bio: "", sexe: "Non genré", photo_url: "" });
    setFmtPhotoFile(null);
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
    const parts = (f.nom || "").trim().split(" ");
    const nom = parts.pop() || "";
    const prenom = parts.join(" ");
    setFmtForm({ prenom, nom, bio: f.bio || "", sexe: f.sexe || "Non genré", photo_url: f.photo_url || "" });
    setFmtPhotoFile(null);
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
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
            {/* Logo organisme */}
            <label style={{ cursor: "pointer", flexShrink: 0, position: "relative" }} title="Changer le logo">
              <div style={{ width: 80, height: 80, borderRadius: 16, background: organisme?.logo?.startsWith("http") ? "transparent" : C.bgAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: C.textTer, fontWeight: 800, overflow: "hidden", border: "2px dashed " + C.border }}>
                {organisme?.logo?.startsWith("http") ? (
                  <img src={organisme.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 28 }}>📷</span>
                    <span style={{ fontSize: 9, color: C.textTer, fontWeight: 600 }}>Logo</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                if (!e.target.files?.[0] || !organisme) return;
                try {
                  const { uploadImage } = await import("@/lib/upload");
                  const url = await uploadImage(e.target.files[0], "logos");
                  await supabase.from("organismes").update({ logo: url }).eq("id", organisme.id);
                  setOrganisme(prev => prev ? { ...prev, logo: url } : prev);
                  invalidateCache();
                } catch (e: any) {
                  setMsg("Erreur upload logo: " + e.message);
                }
              }} />
            </label>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: C.textTer }}>Dashboard</span>
                <input
                  value={orgNom}
                  onChange={e => setOrgNom(e.target.value)}
                  onBlur={async () => {
                    if (!organisme || !orgNom.trim() || orgNom === organisme.nom) return;
                    await supabase.from("organismes").update({ nom: orgNom.trim() }).eq("id", organisme.id);
                    setOrganisme(prev => prev ? { ...prev, nom: orgNom.trim() } : prev);
                    invalidateCache();
                  }}
                  style={{ fontSize: mob ? 20 : 26, fontWeight: 800, color: C.text, background: "transparent", border: "none", borderBottom: "2px solid " + C.borderLight, outline: "none", padding: "2px 4px", minWidth: 80, fontFamily: "inherit" }}
                  title="Cliquez pour modifier le nom"
                />
              </div>
              <p style={{ fontSize: 12, color: C.textTer }}>{formations.length} formation{formations.length > 1 ? "s" : ""} · <span style={{ fontSize: 11, color: C.textTer }}>📷 Cliquez sur le logo pour le changer</span></p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: C.textTer }}>🌐</span>
                <input
                  value={orgSiteUrl}
                  onChange={e => setOrgSiteUrl(e.target.value)}
                  onBlur={async () => {
                    if (!organisme) return;
                    await supabase.from("organismes").update({ site_url: orgSiteUrl || null }).eq("id", organisme.id);
                    setOrganisme(prev => prev ? { ...prev, site_url: orgSiteUrl } : prev);
                  }}
                  placeholder="Site web (ex: https://monorganisme.fr)"
                  style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid " + C.borderLight, background: "transparent", color: C.textSec, width: 260, outline: "none" }}
                />
              </div>
            </div>
          </div>
        </div>
        {tab === "list" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setTab("formateurs")} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🎤 Formateur·rice·s ({formateurs.length})</button>
            {/* Webinaires - désactivé v1 */}
            {/* Congrès - désactivé v1 */}
            <button onClick={() => openEdit()} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nouvelle formation</button>
          </div>
        )}
      </div>


      {/* ===== CONTACT ===== */}
      <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(212,43,43,0.04)", borderRadius: 10, border: "1px solid " + C.borderLight, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16 }}>💬</span>
        <span style={{ fontSize: 13, color: C.textSec }}>Une question ? Écrivez-nous à <a href="mailto:contact@popform.fr" style={{ color: C.accent, fontWeight: 700, textDecoration: "none" }}>contact@popform.fr</a></span>
      </div>

      {/* ===== STATS ===== */}
      {tab === "list" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Formations", value: formations.length, icon: "🎬" },
              { label: "Sessions", value: formations.reduce((s, f) => s + (f.sessions?.length || 0), 0), icon: "📅" },
              { label: "Note moyenne", value: (() => { const rated = formations.filter(f => f.nb_avis > 0); return rated.length ? (rated.reduce((s, f) => s + f.note, 0) / rated.length).toFixed(1) : "—"; })(), icon: "⭐" },
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

                      {f.status === "en_attente" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.yellowBg, color: C.yellowDark }}>⏳ En attente</span>}{(f as any).pending_update && f.status === "publiee" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: "#E8F0FE", color: "#2E7CE6", marginLeft: 4 }}>🔄 Modif. en attente</span>}
                      {(f as any).pending_update && f.status === "publiee" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.blueBg, color: C.blue }}>🔄 Modif. en attente</span>}
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
          <button onClick={() => { setTab("list"); setMsg(null); setEditFmtId(null); setFmtPhotoFile(null); setFmtForm({ prenom: "", nom: "", bio: "", sexe: "Non genré", photo_url: "" }) }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer", marginBottom: 16 }}>← Retour</button>
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
              <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                <label style={labelStyle}>Photo de profil (optionnel)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <label style={{ cursor: "pointer" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 28, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", fontWeight: 700, overflow: "hidden", border: "2px solid " + C.borderLight }}>
                      {fmtPhotoFile ? (
                        <img src={URL.createObjectURL(fmtPhotoFile)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : fmtForm.photo_url ? (
                        <img src={fmtForm.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span>{(fmtForm.prenom || fmtForm.nom)?.[0]?.toUpperCase() || "?"}</span>
                      )}
                    </div>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setFmtPhotoFile(e.target.files[0]); }} />
                  </label>
                  <span style={{ fontSize: 12, color: C.textTer }}>Cliquez sur l&apos;avatar pour ajouter une photo</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Prénom</label>
                <input value={fmtForm.prenom} onChange={e => setFmtForm({ ...fmtForm, prenom: e.target.value })} placeholder="Ex: Marie" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input value={fmtForm.nom} onChange={e => setFmtForm({ ...fmtForm, nom: e.target.value })} placeholder="Ex: Lefort" style={inputStyle} />
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
                <button onClick={() => { setEditFmtId(null); setFmtPhotoFile(null); setFmtForm({ prenom: "", nom: "", bio: "", sexe: "Non genré", photo_url: "" }); setMsg(null) }} style={{ padding: "10px 24px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 13, cursor: "pointer" }}>Annuler</button>
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
                <option value="">— Sélectionner un domaine * —</option>
                {domainesList.map(d => <option key={d.nom} value={d.nom}>{d.nom}</option>)}
              </select>
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
              <input type="number" min="0" value={form.prix ?? ""} onChange={e => setForm({ ...form, prix: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Ex: 450€" style={inputStyle} />
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
              <input value={form.mots_cles} onChange={e => setForm({ ...form, mots_cles: e.target.value })} placeholder="Ex: aphasie, dyslexie, tdl" style={inputStyle} />
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

            {/* Photo upload */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Photo de la formation</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.textSec, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                  📷 {formPhotoFile ? "✓ " + formPhotoFile.name.slice(0, 24) : form.photo_url ? "Changer la photo" : "Ajouter une photo"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setFormPhotoFile(e.target.files[0]); }} />
                </label>
                {formPhotoFile && (
                  <>
                    <img src={URL.createObjectURL(formPhotoFile)} alt="" style={{ width: 80, height: 50, borderRadius: 8, objectFit: "cover" }} />
                    <button type="button" onClick={() => setFormPhotoFile(null)} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>✕ Annuler</button>
                  </>
                )}
                {form.photo_url && !formPhotoFile && (
                  <>
                    <img src={form.photo_url} alt="" style={{ width: 80, height: 50, borderRadius: 8, objectFit: "cover" }} />
                    <button type="button" onClick={() => { setForm({ ...form, photo_url: "" }); setFormPhotoFile(null); }} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>✕ Supprimer</button>
                  </>
                )}
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
                const today = new Date().toISOString().split("T")[0];
                return (
                  <div key={i} style={{ padding: mob ? 12 : 16, background: C.bgAlt, borderRadius: 12, border: "1px solid " + C.borderLight }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.textTer }}>Session {i + 1}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { const copy = JSON.parse(JSON.stringify(s)); delete copy.id; setSessions([...sessions, copy]); }} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, cursor: "pointer" }}>⧉ Dupliquer</button>
                        <button onClick={() => setSessions(sessions.filter((_, j) => j !== i))} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>✕ Supprimer</button>
                      </div>
                    </div>

                    {/* Step 1: Number of parties */}
                    <div style={{ marginBottom: 14, padding: "12px 14px", background: C.surface, borderRadius: 10, border: "1px solid " + C.borderLight }}>
                      <label style={{ ...labelStyle, marginBottom: 8 }}>Nombre de parties de cette session</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[1, 2, 3, 4].map(n => (
                          <button key={n} type="button" onClick={() => {
                            const nSessions = [...sessions];
                            nSessions[i].nb_parties = n;
                            const parts = nSessions[i].parties || [];
                            if (n > parts.length) {
                              for (let k = parts.length; k < n; k++) {
                                parts.push({ titre: n === 1 ? "" : "Partie " + (k + 1), jours: [], modalite: "Présentiel", lieu: "", adresse: "", ville: "", code_postal: "", lien_visio: "", date_debut: "", date_fin: "" });
                              }
                            } else {
                              parts.splice(n);
                            }
                            nSessions[i].parties = parts;
                            setSessions(nSessions);
                          }} style={{ width: 40, height: 40, borderRadius: 10, border: "2px solid " + (s.nb_parties === n ? C.accent : C.border), background: s.nb_parties === n ? C.accentBg : C.surface, color: s.nb_parties === n ? C.accent : C.textSec, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{n}</button>
                        ))}
                      </div>
                      {s.nb_parties > 1 && <p style={{ fontSize: 11, color: C.textTer, marginTop: 6, fontStyle: "italic" }}>Chaque partie peut avoir sa propre ville, modalité et dates.</p>}
                    </div>

                    {/* Step 2: Fill each partie */}
                    {(s.parties || []).slice(0, s.nb_parties).map((p, pi) => (
                      <div key={pi} style={{ marginBottom: 10, padding: "12px 14px", background: C.surface, borderRadius: 10, border: "1.5px solid " + (s.nb_parties > 1 ? C.accent + "33" : C.borderLight) }}>
                        {s.nb_parties > 1 && <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" as const }}>Partie {pi + 1}</div>}
                        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 8 }}>
                          {s.nb_parties > 1 && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={labelStyle}>Titre de la partie</label>
                              <input value={p.titre} onChange={e => { const n = [...sessions]; n[i].parties![pi].titre = e.target.value; setSessions(n); }} placeholder={"ex: Journée théorique"} style={{ ...inputStyle, fontSize: 12 }} />
                            </div>
                          )}
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Modalité</label>
                            <div style={{ display: "flex", gap: 6 }}>
                              {["Présentiel", "Visio", "Mixte"].map(m => (
                                <button key={m} type="button" onClick={() => {
                                  const n = [...sessions];
                                  n[i].parties![pi].modalite = m;
                                  if (s.nb_parties === 1) { n[i].is_visio = m === "Visio"; n[i].modalite_session = m; }
                                  setSessions(n);
                                }} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "1.5px solid " + (p.modalite === m ? C.accent + "55" : C.border), background: p.modalite === m ? C.accentBg : C.bgAlt, color: p.modalite === m ? C.accent : C.textSec, fontSize: 11, cursor: "pointer", fontWeight: p.modalite === m ? 700 : 400 }}>{m}</button>
                              ))}
                            </div>
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Jours de formation</label>
                            <p style={{ fontSize: 11, color: C.textTer, marginBottom: 6 }}>Cliquez sur chaque jour (les jours peuvent être discontinus, ex: 4, 7 et 9 mars)</p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              {(p.jours || []).map((j, ji) => (
                                <div key={ji} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: C.accentBg, border: "1.5px solid " + C.accent + "44" }}>
                                  <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{j}</span>
                                  <button type="button" onClick={() => { const n = [...sessions]; n[i].parties![pi].jours = p.jours.filter((_, jk) => jk !== ji); n[i].parties![pi].date_debut = n[i].parties![pi].jours[0] || ""; n[i].parties![pi].date_fin = n[i].parties![pi].jours[n[i].parties![pi].jours.length - 1] || ""; setSessions(n); }} style={{ background: "none", border: "none", color: C.pink, fontSize: 12, cursor: "pointer", padding: 0 }}>✕</button>
                                </div>
                              ))}
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <input ref={el => { dateInputRefs.current[`${i}-${pi}`] = el; }} type="date" min={today} style={{ ...inputStyle, fontSize: 12, width: "auto", minWidth: 140 }}
                                  onBlur={() => {
                                    const el = dateInputRefs.current[`${i}-${pi}`];
                                    const val = el?.value;
                                    if (!val) return;
                                    const n = [...sessions];
                                    const cur = n[i].parties![pi].jours || [];
                                    if (!cur.includes(val)) {
                                      const sorted = [...cur, val].sort();
                                      n[i].parties![pi].jours = sorted;
                                      n[i].parties![pi].date_debut = sorted[0];
                                      n[i].parties![pi].date_fin = sorted[sorted.length - 1];
                                      setSessions(n);
                                    }
                                    if (el) el.value = "";
                                  }}
                                />
                                <button type="button" onClick={() => {
                                  const el = dateInputRefs.current[`${i}-${pi}`];
                                  const val = el?.value;
                                  if (!val) return;
                                  const n = [...sessions];
                                  const cur = n[i].parties![pi].jours || [];
                                  if (!cur.includes(val)) {
                                    const sorted = [...cur, val].sort();
                                    n[i].parties![pi].jours = sorted;
                                    n[i].parties![pi].date_debut = sorted[0];
                                    n[i].parties![pi].date_fin = sorted[sorted.length - 1];
                                  }
                                  setSessions(n);
                                  if (el) el.value = "";
                                }} style={{ padding: "5px 12px", borderRadius: 8, background: C.gradient, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+</button>
                              </div>
                            </div>
                          </div>
                          {p.modalite !== "Visio" && (
                            <div>
                              <label style={labelStyle}>Ville</label>
                              {adminVilles.length > 0 ? (
                                <>
                                  <select value={adminVilles.includes(p.ville) ? p.ville : (p.ville ? "__OTHER__" : "")} onChange={e => {
                                    const val = e.target.value;
                                    const n = [...sessions];
                                    if (val !== "__OTHER__") { n[i].parties![pi].ville = val; n[i].parties![pi].lieu = val; }
                                    else { n[i].parties![pi].ville = ""; n[i].parties![pi].lieu = ""; }
                                    setSessions(n);
                                  }} style={inputStyle}>
                                    <option value="">— Choisir une ville —</option>
                                    {adminVilles.map(v => <option key={v} value={v}>{v}</option>)}
                                    <option value="__OTHER__">✏️ Autre ville...</option>
                                  </select>
                                  {(!adminVilles.includes(p.ville)) && (
                                    <input value={p.ville} onChange={e => { const n = [...sessions]; n[i].parties![pi].ville = e.target.value; n[i].parties![pi].lieu = e.target.value; setSessions(n); }} placeholder="Entrez la ville" style={{ ...inputStyle, marginTop: 8 }} />
                                  )}
                                </>
                              ) : (
                                <input value={p.ville} onChange={e => { const n = [...sessions]; n[i].parties![pi].ville = e.target.value; setSessions(n); }} placeholder="Ex: Paris" style={inputStyle} />
                              )}
                            </div>
                          )}
                          {p.modalite !== "Visio" && (
                            <div>
                              <label style={labelStyle}>Adresse</label>
                              <input value={p.adresse} onChange={e => { const n = [...sessions]; n[i].parties![pi].adresse = e.target.value; setSessions(n); }} placeholder="Ex: 12 rue de la Paix" style={inputStyle} />
                            </div>
                          )}
                          {p.modalite !== "Visio" && (
                            <div>
                              <label style={labelStyle}>Code postal</label>
                              <input value={p.code_postal} onChange={e => { const n = [...sessions]; n[i].parties![pi].code_postal = e.target.value; setSessions(n); }} placeholder="Ex: 75001" style={inputStyle} />
                            </div>
                          )}
                          {p.modalite !== "Présentiel" && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={labelStyle}>Lien visioconférence</label>
                              <input value={p.lien_visio} onChange={e => { const n = [...sessions]; n[i].parties![pi].lien_visio = e.target.value; setSessions(n); }} placeholder="https://zoom.us/j/..." style={inputStyle} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              <button onClick={() => setSessions([...sessions, { dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "Présentiel", lien_visio: "", is_visio: false, nb_parties: 1, parties: [{ titre: "", jours: [], modalite: "Présentiel", lieu: "", adresse: "", ville: "", code_postal: "", lien_visio: "", date_debut: "", date_fin: "" }] }])} style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px dashed " + C.border, background: "transparent", color: C.textTer, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>+ Ajouter une session</button>
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

      {/* ===== CONGRÈS TAB ===== */}
      {tab === "congres" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text }}>🎤 Congrès</h2>
            <button onClick={() => { setCForm(emptyCongres()); setEditCId(null); }} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Nouveau congrès</button>
          </div>

          {/* Liste */}
          {congresList.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {congresList.map((c, idx) => (
                <div key={idx} style={{ padding: 14, background: C.surface, borderRadius: 12, border: "1px solid " + C.borderLight, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  {c.photo_url && <img src={c.photo_url as string} alt={c.titre} style={{ width: 60, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{c.titre}</div>
                    <div style={{ fontSize: 11, color: C.textTer }}>{c.date ? new Date(c.date).toLocaleDateString("fr-FR") : "—"} · {(c.speakers || []).length} intervenant{(c.speakers || []).length !== 1 ? "s" : ""}</div>
                    {c.status === "en_attente" && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: "#FFF3C4", color: "#9B6B00", fontWeight: 700 }}>⏳ En attente de validation</span>}
                    {c.status === "publie" && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: C.greenBg, color: C.green, fontWeight: 700 }}>✓ Publié</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setCForm({ titre: c.titre, description: c.description, date: c.date, adresse: c.adresse, lien_url: c.lien_url, lien_visio: c.lien_visio, photo_url: c.photo_url, speakers: c.speakers || [] }); setEditCId(c.id || null); }} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, cursor: "pointer" }}>✏️</button>
                    <button onClick={async () => { if (!confirm("Supprimer ?")) return; await supabase.from("congres").delete().eq("id", c.id); setCongresList(prev => prev.filter(x => x.id !== c.id)); }} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire */}
          <div style={{ padding: mob ? 16 : 24, background: C.bgAlt, borderRadius: 16, border: "1.5px solid " + C.borderLight }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>{editCId ? "Modifier le congrès" : "Créer un congrès"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: mob ? "1" : "1/-1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>Titre *</label>
                <input value={cForm.titre} onChange={e => setCForm({ ...cForm, titre: e.target.value })} placeholder="Ex: 32e Congrès National d'Orthophonie" style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "inherit" }} />
              </div>
              <div style={{ gridColumn: mob ? "1" : "1/-1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>Description</label>
                <textarea value={cForm.description} onChange={e => setCForm({ ...cForm, description: e.target.value })} rows={3} style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const, resize: "vertical" as const, fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>Date *</label>
                <input type="datetime-local" value={cForm.date} onChange={e => setCForm({ ...cForm, date: e.target.value })} style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>Adresse</label>
                <input value={cForm.adresse} onChange={e => setCForm({ ...cForm, adresse: e.target.value })} placeholder="Ex: Palais des Congrès, Paris" style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>URL site / programme</label>
                <input value={cForm.lien_url || ""} onChange={e => setCForm({ ...cForm, lien_url: e.target.value })} placeholder="https://..." style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>Lien visio (si applicable)</label>
                <input value={cForm.lien_visio || ""} onChange={e => setCForm({ ...cForm, lien_visio: e.target.value })} placeholder="https://zoom.us/..." style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "inherit" }} />
              </div>
              <div style={{ gridColumn: mob ? "1" : "1/-1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>Photo</label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  📷 {cPhotoFile ? "✓ " + cPhotoFile.name.slice(0, 24) : cForm.photo_url ? "Changer la photo" : "Ajouter une photo"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setCPhotoFile(e.target.files?.[0] || null)} />
                </label>
                {cForm.photo_url && !cPhotoFile && <img src={cForm.photo_url} alt="" style={{ marginLeft: 10, width: 80, height: 50, borderRadius: 8, objectFit: "cover", verticalAlign: "middle" }} />}
              </div>

              {/* Intervenants */}
              <div style={{ gridColumn: mob ? "1" : "1/-1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const }}>Intervenants</label>
                  <button onClick={() => setCForm({ ...cForm, speakers: [...cForm.speakers, { nom: "", titre_intervention: "" }] })} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, cursor: "pointer" }}>+ Ajouter</button>
                </div>
                {cForm.speakers.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                    <input value={s.nom} onChange={e => { const sp = [...cForm.speakers]; sp[i] = { ...sp[i], nom: e.target.value }; setCForm({ ...cForm, speakers: sp }); }} placeholder="Nom Prénom" style={{ flex: 1, padding: "8px 10px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                    <input value={s.titre_intervention} onChange={e => { const sp = [...cForm.speakers]; sp[i] = { ...sp[i], titre_intervention: e.target.value }; setCForm({ ...cForm, speakers: sp }); }} placeholder="Titre de l'intervention" style={{ flex: 2, padding: "8px 10px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                    <button onClick={() => setCForm({ ...cForm, speakers: cForm.speakers.filter((_, j) => j !== i) })} style={{ padding: "6px 8px", borderRadius: 7, border: "none", background: C.pinkBg, color: C.pink, fontSize: 12, cursor: "pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {cMsg && <p style={{ color: cMsg.startsWith("✅") ? C.green : C.pink, fontSize: 13, marginTop: 10 }}>{cMsg}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button disabled={cSaving} onClick={async () => {
                if (!cForm.titre.trim() || !cForm.date) { setCMsg("Titre et date obligatoires."); return; }
                setCSaving(true); setCMsg(null);
                let photoUrl = cForm.photo_url || null;
                if (cPhotoFile) {
                  try {
                    photoUrl = await uploadImage(cPhotoFile, "congres");
                  } catch (e: any) {
                    setCMsg("⚠️ Photo non uploadée : " + e.message + " — vérifiez la variable SUPABASE_SERVICE_ROLE_KEY dans votre .env.local");
                  }
                }
                const payload = { titre: cForm.titre, description: cForm.description, date: cForm.date, adresse: cForm.adresse, lien_url: cForm.lien_url || null, lien_visio: cForm.lien_visio || null, photo_url: photoUrl, organisme_id: organisme?.id, status: "en_attente" };
                if (editCId) {
                  await supabase.from("congres").update(payload).eq("id", editCId);
                  await supabase.from("congres_speakers").delete().eq("congres_id", editCId);
                  if (cForm.speakers.length > 0) await supabase.from("congres_speakers").insert(cForm.speakers.filter(s => s.nom.trim()).map(s => ({ ...s, congres_id: editCId })));
                  setCongresList(prev => prev.map(c => c.id === editCId ? { ...c, ...payload, speakers: cForm.speakers } : c));
                  setEditCId(null);
                } else {
                  const { data: nc } = await supabase.from("congres").insert(payload).select().single();
                  if (nc) {
                    if (cForm.speakers.length > 0) await supabase.from("congres_speakers").insert(cForm.speakers.filter(s => s.nom.trim()).map(s => ({ ...s, congres_id: nc.id })));
                    setCongresList(prev => [...prev, { ...nc, speakers: cForm.speakers }]);
                  }
                }
                setCForm(emptyCongres()); setCPhotoFile(null);
                setCSaving(false); setCMsg("✅ Congrès soumis pour validation !");
                setTimeout(() => setCMsg(null), 3000);
              }} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: cSaving ? 0.5 : 1 }}>
                {cSaving ? "⏳ ..." : editCId ? "Enregistrer" : "🎤 Soumettre le congrès"}
              </button>
              {editCId && <button onClick={() => { setEditCId(null); setCForm(emptyCongres()); }} style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 13, cursor: "pointer" }}>Annuler</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
