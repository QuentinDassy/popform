"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { C, fetchDomainesAdmin, invalidateCache } from "@/lib/data";
import { supabase, fetchOrganismes, fetchFormateurs, type Organisme, type Formateur } from "@/lib/supabase-data";
import { uploadImage } from "@/lib/upload";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionPartieRow = {
  titre: string; date_debut: string; date_fin: string;
  modalite: string; lieu: string; adresse: string; ville: string; code_postal: string; lien_visio: string;
};
type SessionRow = {
  id?: number; dates: string; date_ranges: { debut: string; fin: string }[];
  lieu: string; adresse: string; ville: string;
  code_postal: string; modalite_session: string; lien_visio: string; is_visio: boolean;
  parties: SessionPartieRow[];
};
type FormState = {
  titre: string; sous_titre: string; description: string;
  domaine: string; domaines: string[];
  modalite: string; prise_en_charge: string[];
  duree: string;
  formateur_ids: number[]; organisme_id: number | null;
  prix: number; prix_salarie: number | null; prix_liberal: number | null; prix_dpc: number | null;
  prix_extras: { label: string; value: number }[];
  populations: string[]; mots_cles: string; professions: string[];
  effectif: number; url_inscription: string; video_url: string;
  sans_limite: boolean; status: string;
  photo_url: string;
};

const MODALITES = ["Présentiel", "Visio", "Mixte", "E-learning"];
const PRISES = ["DPC", "FIF-PL", "FIFPL", "OPCO", "CPF"];
const POPULATIONS_OPTS = ["Enfants", "Adolescents", "Adultes", "Personnes âgées", "Tous publics"];
const PROFESSIONS_OPTS = ["Orthophonistes", "Ergothérapeutes", "Psychomotriciens", "Orthoptistes", "Neuropsychologues", "Médecins", "Infirmiers", "Tous professionnels"];
const STATUS_OPTS = ["publiee", "en_attente", "refusee", "archivee"];

const MOIS_FR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

function formatDateRange(debut: string, fin: string): string {
  if (!debut) return "";
  const d1 = new Date(debut + "T12:00:00");
  if (!fin || fin === debut) return `${d1.getDate()} ${MOIS_FR[d1.getMonth()]} ${d1.getFullYear()}`;
  const d2 = new Date(fin + "T12:00:00");
  if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
    return `${d1.getDate()}-${d2.getDate()} ${MOIS_FR[d1.getMonth()]} ${d1.getFullYear()}`;
  }
  const y1 = d1.getFullYear() !== d2.getFullYear() ? ` ${d1.getFullYear()}` : "";
  return `${d1.getDate()} ${MOIS_FR[d1.getMonth()]}${y1} et ${d2.getDate()} ${MOIS_FR[d2.getMonth()]} ${d2.getFullYear()}`;
}

function formatMultipleDateRanges(ranges: { debut: string; fin: string }[]): string {
  return ranges.filter(r => r.debut).map(r => formatDateRange(r.debut, r.fin)).join(" et ");
}

function emptySession(): SessionRow {
  return { dates: "", date_ranges: [{ debut: "", fin: "" }], lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "Présentiel", lien_visio: "", is_visio: false, parties: [] };
}
function emptyForm(): FormState {
  return {
    titre: "", sous_titre: "", description: "", domaine: "", domaines: [],
    modalite: "Présentiel", prise_en_charge: [],
    duree: "", formateur_ids: [], organisme_id: null,
    prix: 0, prix_salarie: null, prix_liberal: null, prix_dpc: null, prix_extras: [],
    populations: [], mots_cles: "", professions: ["Orthophonistes"],
    effectif: 20, url_inscription: "", video_url: "",
    sans_limite: false, status: "publiee", photo_url: "",
  };
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminFormationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const isNew = id === "new";

  const [form, setForm] = useState<FormState>(emptyForm());
  const [sessions, setSessions] = useState<SessionRow[]>([emptySession()]);
  const [formateurs, setFormateurs] = useState<(Formateur & { organisme?: Organisme })[]>([]);
  const [organismes, setOrganismes] = useState<Organisme[]>([]);
  const [domainesList, setDomainesList] = useState<{ nom: string; emoji: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [newPrixLabel, setNewPrixLabel] = useState("");
  const [newPrixValue, setNewPrixValue] = useState("");

  // Inline creation
  const [showNewFormateur, setShowNewFormateur] = useState(false);
  const [newFmt, setNewFmt] = useState({ prenom: "", nom: "", sexe: "Femme", bio: "" });
  const [newFmtPhotoFile, setNewFmtPhotoFile] = useState<File | null>(null);
  const newFmtPhotoRef = useRef<HTMLInputElement>(null);
  const [creatingFmt, setCreatingFmt] = useState(false);
  const [showNewOrganisme, setShowNewOrganisme] = useState(false);
  const [newOrg, setNewOrg] = useState({ nom: "", description: "" });
  const [newOrgLogoFile, setNewOrgLogoFile] = useState<File | null>(null);
  const newOrgLogoRef = useRef<HTMLInputElement>(null);
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Edit existing formateur/organisme
  const [editingFmtId, setEditingFmtId] = useState<number | null>(null);
  const [editFmt, setEditFmt] = useState({ prenom: "", nom: "", sexe: "Femme", bio: "" });
  const [editFmtPhotoFile, setEditFmtPhotoFile] = useState<File | null>(null);
  const editFmtPhotoRef = useRef<HTMLInputElement>(null);
  const [savingFmt, setSavingFmt] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<number | null>(null);
  const [editOrg, setEditOrg] = useState({ nom: "", description: "", logo: "" });
  const [editOrgLogoFile, setEditOrgLogoFile] = useState<File | null>(null);
  const editOrgLogoRef = useRef<HTMLInputElement>(null);
  const [savingOrg, setSavingOrg] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!profile || profile.role !== "admin") { router.replace("/"); return; }

    (async () => {
      try {
        const [fmts, orgs, domaines] = await Promise.all([
          fetchFormateurs(),
          fetchOrganismes(),
          fetchDomainesAdmin(),
        ]);
        setFormateurs(fmts);
        setOrganismes(orgs);
        setDomainesList(domaines.map(d => ({ nom: d.nom, emoji: d.emoji })));

        if (!isNew) {
          const { data: f } = await supabase
            .from("formations")
            .select("*, prix_extras, domaines, sessions(*, session_parties(*))")
            .eq("id", id)
            .single();
          if (f) {
            setForm({
              titre: f.titre || "",
              sous_titre: f.sous_titre || "",
              description: f.description || "",
              domaine: f.domaine || "",
              domaines: (f as any).domaines?.length ? (f as any).domaines : (f.domaine ? [f.domaine] : []),
              modalite: f.modalite || "Présentiel",
              prise_en_charge: f.prise_en_charge || [],
              duree: f.duree || "",
              formateur_ids: (f as any).formateur_ids?.length ? (f as any).formateur_ids : (f.formateur_id ? [f.formateur_id] : []),
              organisme_id: f.organisme_id,
              prix: f.prix ?? 0,
              prix_salarie: f.prix_salarie,
              prix_liberal: f.prix_liberal,
              prix_dpc: f.prix_dpc,
              prix_extras: (f as any).prix_extras || [],
              populations: f.populations || [],
              mots_cles: (f.mots_cles || []).join(", "),
              professions: f.professions || [],
              effectif: f.effectif || 20,
              url_inscription: f.url_inscription || "",
              video_url: f.video_url || "",
              sans_limite: f.sans_limite || false,
              status: f.status || "publiee",
              photo_url: (f as any).photo_url || "",
            });
            setSessions((f.sessions || []).map((s: any) => {
              const sp = s.session_parties || [];
              const partiesWithDates = sp.filter((p: any) => p.date_debut);
              const date_ranges = partiesWithDates.length > 0
                ? partiesWithDates.map((p: any) => ({ debut: p.date_debut, fin: p.date_fin || p.date_debut }))
                : [{ debut: "", fin: "" }];
              return {
                id: s.id,
                dates: s.dates || "",
                date_ranges,
                lieu: s.lieu || "",
                adresse: "",
                ville: s.lieu || "",
                code_postal: s.code_postal || "",
                modalite_session: s.modalite_session || "Présentiel",
                lien_visio: s.lien_visio || "",
                is_visio: s.lieu === "Visio" || !!s.lien_visio,
                parties: sp.map((p: any) => ({
                  titre: p.titre || "",
                  date_debut: p.date_debut || "",
                  date_fin: p.date_fin || "",
                  modalite: p.modalite || "Présentiel",
                  lieu: p.lieu || "",
                  adresse: p.adresse || "",
                  ville: p.ville || "",
                  code_postal: "",
                  lien_visio: p.lien_visio || "",
                })),
              };
            }));
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, profile, id, isNew, router]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const setF = (k: keyof FormState, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleArr = (key: keyof FormState, val: string) => {
    const arr = form[key] as string[];
    setF(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const setSession = (i: number, k: keyof SessionRow, v: unknown) =>
    setSessions(ss => ss.map((s, idx) => idx === i ? { ...s, [k]: v } : s));

  const setPartie = (si: number, pi: number, k: keyof SessionPartieRow, v: string) =>
    setSessions(ss => ss.map((s, i) => i !== si ? s : {
      ...s,
      parties: s.parties.map((p, j) => j !== pi ? p : { ...p, [k]: v }),
    }));

  // ── Inline creation ─────────────────────────────────────────────────────────
  const handleCreateFormateur = async () => {
    if (!newFmt.nom.trim()) return;
    setCreatingFmt(true);
    let photoUrl: string | null = null;
    if (newFmtPhotoFile) { try { photoUrl = await uploadImage(newFmtPhotoFile, "formateurs"); } catch {} }
    const fullNom = [newFmt.prenom.trim(), newFmt.nom.trim()].filter(Boolean).join(" ");
    const { data, error } = await supabase.from("formateurs").insert({ nom: fullNom, sexe: newFmt.sexe, bio: newFmt.bio.trim() || "", organisme_id: form.organisme_id, photo_url: photoUrl }).select().single();
    if (!error && data) {
      setFormateurs(fmts => [...fmts, data]);
      setF("formateur_ids", [...form.formateur_ids, data.id]);
      setShowNewFormateur(false);
      setNewFmt({ prenom: "", nom: "", sexe: "Femme", bio: "" });
      setNewFmtPhotoFile(null);
    }
    setCreatingFmt(false);
  };

  const handleCreateOrganisme = async () => {
    if (!newOrg.nom.trim()) return;
    setCreatingOrg(true);
    let logo = "";
    if (newOrgLogoFile) { try { logo = await uploadImage(newOrgLogoFile, "organismes"); } catch {} }
    const { data, error } = await supabase.from("organismes").insert({ nom: newOrg.nom.trim(), description: newOrg.description.trim() || null, logo }).select().single();
    if (!error && data) {
      setOrganismes(orgs => [...orgs, data]);
      setF("organisme_id", data.id);
      setShowNewOrganisme(false);
      setNewOrg({ nom: "", description: "" });
      setNewOrgLogoFile(null);
    }
    setCreatingOrg(false);
  };

  const handleEditFormateur = (id: number) => {
    const fmt = formateurs.find(f => f.id === id);
    if (!fmt) return;
    const parts = fmt.nom.split(" ");
    const prenom = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
    const nom = parts.length > 1 ? parts[parts.length - 1] : fmt.nom;
    setEditFmt({ prenom, nom, sexe: fmt.sexe || "Femme", bio: fmt.bio || "" });
    setEditFmtPhotoFile(null);
    setEditingFmtId(id);
    setShowNewFormateur(false);
  };
  const handleSaveFormateur = async () => {
    if (!editingFmtId) return;
    setSavingFmt(true);
    let photoUrl = formateurs.find(f => f.id === editingFmtId)?.photo_url || null;
    if (editFmtPhotoFile) { try { photoUrl = await uploadImage(editFmtPhotoFile, "formateurs"); } catch {} }
    const fullNom = [editFmt.prenom.trim(), editFmt.nom.trim()].filter(Boolean).join(" ");
    const { error } = await supabase.from("formateurs").update({ nom: fullNom, sexe: editFmt.sexe, bio: editFmt.bio.trim() || "", photo_url: photoUrl }).eq("id", editingFmtId);
    if (!error) {
      setFormateurs(fmts => fmts.map(f => f.id === editingFmtId ? { ...f, nom: fullNom, sexe: editFmt.sexe, bio: editFmt.bio.trim(), photo_url: photoUrl } : f));
      setEditingFmtId(null);
    }
    setSavingFmt(false);
  };

  const handleEditOrganisme = (id: number) => {
    const org = organismes.find(o => o.id === id);
    if (!org) return;
    setEditOrg({ nom: org.nom, description: org.description || "", logo: org.logo || "" });
    setEditOrgLogoFile(null);
    setEditingOrgId(id);
    setShowNewOrganisme(false);
  };
  const handleSaveOrganisme = async () => {
    if (!editingOrgId) return;
    setSavingOrg(true);
    let logo = editOrg.logo;
    if (editOrgLogoFile) { try { logo = await uploadImage(editOrgLogoFile, "organismes"); } catch {} }
    const { error } = await supabase.from("organismes").update({ nom: editOrg.nom.trim(), description: editOrg.description.trim() || null, logo }).eq("id", editingOrgId);
    if (!error) {
      setOrganismes(orgs => orgs.map(o => o.id === editingOrgId ? { ...o, nom: editOrg.nom.trim(), description: editOrg.description.trim(), logo } : o));
      setEditingOrgId(null);
    }
    setSavingOrg(false);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.titre.trim()) { setMsg("Le titre est obligatoire."); return; }
    setSaving(true); setMsg(null);

    let photoUrl = form.photo_url;
    if (photoFile) {
      try { photoUrl = await uploadImage(photoFile, "formations"); }
      catch (e: any) { setMsg("⚠️ Photo non uploadée : " + e.message); }
    }

    const prixExtras = [
      ...form.prix_extras,
      ...(newPrixLabel.trim() && newPrixValue ? [{ label: newPrixLabel.trim(), value: Number(newPrixValue) }] : []),
    ].filter(e => e.label && !isNaN(e.value));

    const payload: Record<string, unknown> = {
      titre: form.titre.trim(),
      sous_titre: form.sous_titre.trim(),
      description: form.description.trim(),
      domaine: form.domaines[0] || form.domaine || "",
      domaines: form.domaines,
      modalite: form.modalite,
      prise_en_charge: form.prise_en_charge,
      duree: form.duree || "",
      formateur_id: form.formateur_ids[0] || null,
      formateur_ids: form.formateur_ids,
      organisme_id: form.organisme_id,
      prix: form.prix ?? 0,
      prix_salarie: form.prix_salarie,
      prix_liberal: form.prix_liberal,
      prix_dpc: form.prix_dpc,
      prix_extras: prixExtras,
      populations: form.populations,
      mots_cles: form.mots_cles.split(",").map(s => s.trim()).filter(Boolean),
      professions: form.professions,
      effectif: form.effectif || 20,
      url_inscription: form.url_inscription || "",
      video_url: form.video_url || "",
      sans_limite: form.sans_limite,
      status: form.status,
      photo_url: photoUrl || null,
      note: 0, nb_avis: 0, is_new: true,
    };

    let formationId: number | null = isNew ? null : Number(id);

    if (isNew) {
      payload.date_ajout = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.from("formations").insert(payload).select().single();
      if (error) { setMsg("Erreur : " + error.message); setSaving(false); return; }
      formationId = data.id;
    } else {
      const { error } = await supabase.from("formations").update(payload).eq("id", formationId);
      if (error) { setMsg("Erreur : " + error.message); setSaving(false); return; }
    }

    // Sessions
    if (formationId) {
      await supabase.from("sessions").delete().eq("formation_id", formationId);
      const validSessions = sessions.filter(s =>
        s.date_ranges.some(r => r.debut) || s.dates.trim() || s.ville.trim() || s.lien_visio.trim() || s.parties.length > 0
      );
      if (validSessions.length > 0) {
        const { data: insertedSessions } = await supabase.from("sessions").insert(
          validSessions.map(s => ({
            formation_id: formationId,
            dates: (s.date_ranges.some(r => r.debut) ? formatMultipleDateRanges(s.date_ranges) : null) || s.dates.trim() || s.parties.map((p, pi) => `${p.titre || ("Partie " + (pi + 1))}: ${p.date_debut}${p.date_fin && p.date_fin !== p.date_debut ? " → " + p.date_fin : ""}`).join(" | "),
            lieu: s.is_visio ? "Visio" : (s.ville.trim() || s.lieu.trim()),
            adresse: s.is_visio ? (s.lien_visio || "") : s.adresse.trim() || null,
            code_postal: s.code_postal || null,
            modalite_session: s.modalite_session || null,
            lien_visio: s.lien_visio || null,
          }))
        ).select();

        if (insertedSessions) {
          for (let si = 0; si < validSessions.length; si++) {
            const parties = validSessions[si].parties.filter(p => p.date_debut || p.titre);
            if (parties.length > 0 && insertedSessions[si]) {
              await supabase.from("session_parties").insert(
                parties.map(p => ({
                  session_id: insertedSessions[si].id,
                  titre: p.titre || "",
                  modalite: p.modalite,
                  lieu: p.modalite === "Visio" ? "Visio" : (p.lieu || p.ville),
                  adresse: p.modalite === "Visio" ? (p.lien_visio || null) : ([p.adresse, p.ville, p.code_postal].filter(Boolean).join(", ") || null),
                  lien_visio: p.lien_visio || null,
                  date_debut: p.date_debut || null,
                  date_fin: p.date_fin || null,
                }))
              );
            }
          }
        }
      }
    }

    invalidateCache();
    setSaving(false);
    setMsg("✅ Formation enregistrée !");
    setTimeout(() => {
      if (isNew && formationId) router.push(`/dashboard/admin/formation/${formationId}`);
      else router.push("/dashboard/admin");
    }, 1200);
  };

  // ── Render guards ───────────────────────────────────────────────────────────
  if (authLoading || loading) return <div style={{ padding: 60, textAlign: "center", color: C.textSec }}>Chargement…</div>;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const inp: React.CSSProperties = { padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" };
  const section: React.CSSProperties = { background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, padding: "20px 24px", marginBottom: 16 };
  const row2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 16px 60px" }}>
      {/* Header */}
      <div style={{ padding: "18px 0 20px", display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/dashboard/admin" style={{ color: C.textSec, fontSize: 13, textDecoration: "none" }}>← Dashboard admin</Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 24 }}>
        {isNew ? "➕ Nouvelle formation" : "✏️ Modifier la formation"}
      </h1>

      {/* ── Infos de base ── */}
      <div style={section}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 16, fontSize: 15 }}>Informations générales</div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Titre *</label>
          <input style={inp} value={form.titre} onChange={e => setF("titre", e.target.value)} placeholder="Titre de la formation" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Sous-titre</label>
          <input style={inp} value={form.sous_titre} onChange={e => setF("sous_titre", e.target.value)} placeholder="Accroche courte" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Description</label>
          <textarea style={{ ...inp, minHeight: 120, resize: "vertical" }} value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Description complète…" />
        </div>
        <div style={row2}>
          <div>
            <label style={lbl}>Durée</label>
            <input style={inp} value={form.duree} onChange={e => setF("duree", e.target.value)} placeholder="Ex : 2 jours (14h)" />
          </div>
          <div>
            <label style={lbl}>Effectif max</label>
            <input style={inp} type="number" value={form.effectif || ""} onChange={e => setF("effectif", Number(e.target.value))} placeholder="20" />
          </div>
        </div>
      </div>

      {/* ── Domaines & Modalité ── */}
      <div style={section}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 16, fontSize: 15 }}>Domaines & Modalité</div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Domaines</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {domainesList.map(d => (
              <button key={d.nom} onClick={() => toggleArr("domaines", d.nom)} style={{
                padding: "5px 12px", borderRadius: 20, border: "1.5px solid",
                borderColor: form.domaines.includes(d.nom) ? C.accent : C.border,
                background: form.domaines.includes(d.nom) ? C.accentBg : C.surface,
                color: form.domaines.includes(d.nom) ? C.accent : C.textSec,
                fontSize: 12, cursor: "pointer", fontWeight: form.domaines.includes(d.nom) ? 700 : 400,
              }}>
                {d.emoji} {d.nom}
              </button>
            ))}
          </div>
        </div>
        <div style={row2}>
          <div>
            <label style={lbl}>Modalité principale</label>
            <select style={inp} value={form.modalite} onChange={e => setF("modalite", e.target.value)}>
              {MODALITES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Prise en charge</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 4 }}>
              {PRISES.map(p => (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.prise_en_charge.includes(p)} onChange={() => toggleArr("prise_en_charge", p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Formateur / Organisme ── */}
      <div style={section}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 16, fontSize: 15 }}>Formateur & Organisme</div>
        <div style={row2}>
          <div>
            <label style={lbl}>Formateur(s)</label>
            {/* Selected formateurs chips */}
            {form.formateur_ids.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {form.formateur_ids.map(fid => {
                  const fmt = formateurs.find(f => f.id === fid);
                  return fmt ? (
                    <div key={fid} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: C.accentBg, border: "1.5px solid " + C.accent + "44", fontSize: 12 }}>
                      <span style={{ color: C.text, fontWeight: 600 }}>{fmt.nom}</span>
                      <button onClick={() => editingFmtId === fid ? setEditingFmtId(null) : handleEditFormateur(fid)} style={{ padding: "1px 4px", border: "none", background: "none", cursor: "pointer", fontSize: 11, color: C.textSec }}>✏️</button>
                      <button onClick={() => { setF("formateur_ids", form.formateur_ids.filter(id => id !== fid)); if (editingFmtId === fid) setEditingFmtId(null); }} style={{ padding: "1px 4px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: C.pink }}>✕</button>
                    </div>
                  ) : null;
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <select style={{ ...inp, flex: 1 }} value="" onChange={e => { if (e.target.value && !form.formateur_ids.includes(Number(e.target.value))) { setF("formateur_ids", [...form.formateur_ids, Number(e.target.value)]); setEditingFmtId(null); } }}>
                <option value="">+ Ajouter un formateur…</option>
                {formateurs.filter(f => !form.formateur_ids.includes(f.id)).map(f => <option key={f.id} value={f.id}>{f.nom}{f.organisme ? ` (${f.organisme.nom})` : ""}</option>)}
              </select>
              <button onClick={() => { setShowNewFormateur(v => !v); setEditingFmtId(null); }} style={{ padding: "6px 10px", borderRadius: 9, border: "1.5px solid " + C.border, background: showNewFormateur ? C.accentBg : C.surface, color: showNewFormateur ? C.accent : C.textSec, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                {showNewFormateur ? "✕" : "+ Nouveau"}
              </button>
            </div>
            {showNewFormateur && (
              <div style={{ background: C.bgAlt, border: "1px solid " + C.borderLight, borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...inp, flex: 1 }} placeholder="Prénom" value={newFmt.prenom} onChange={e => setNewFmt(f => ({ ...f, prenom: e.target.value }))} />
                  <input style={{ ...inp, flex: 1 }} placeholder="Nom *" value={newFmt.nom} onChange={e => setNewFmt(f => ({ ...f, nom: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ ...inp, flex: 1 }} value={newFmt.sexe} onChange={e => setNewFmt(f => ({ ...f, sexe: e.target.value }))}>
                    <option value="Femme">Formatrice</option>
                    <option value="Homme">Formateur</option>
                    <option value="Autre">Formateur.rice</option>
                  </select>
                  <input style={{ ...inp, flex: 2 }} placeholder="Bio (optionnel)" value={newFmt.bio} onChange={e => setNewFmt(f => ({ ...f, bio: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input ref={newFmtPhotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setNewFmtPhotoFile(e.target.files?.[0] || null)} />
                  <button type="button" onClick={() => newFmtPhotoRef.current?.click()} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px dashed " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>
                    📷 {newFmtPhotoFile ? newFmtPhotoFile.name.slice(0, 22) : "Photo (optionnel)"}
                  </button>
                  {newFmtPhotoFile && <button onClick={() => setNewFmtPhotoFile(null)} style={{ fontSize: 12, color: C.pink, cursor: "pointer", border: "none", background: "none" }}>✕</button>}
                </div>
                <button onClick={handleCreateFormateur} disabled={creatingFmt || !newFmt.nom.trim()} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: !newFmt.nom.trim() ? 0.5 : 1 }}>
                  {creatingFmt ? "Création…" : "Créer et sélectionner"}
                </button>
              </div>
            )}
            {editingFmtId && (
              <div style={{ background: C.bgAlt, border: "1px solid " + C.borderLight, borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...inp, flex: 1 }} placeholder="Prénom" value={editFmt.prenom} onChange={e => setEditFmt(f => ({ ...f, prenom: e.target.value }))} />
                  <input style={{ ...inp, flex: 1 }} placeholder="Nom *" value={editFmt.nom} onChange={e => setEditFmt(f => ({ ...f, nom: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ ...inp, flex: 1 }} value={editFmt.sexe} onChange={e => setEditFmt(f => ({ ...f, sexe: e.target.value }))}>
                    <option value="Femme">Formatrice</option>
                    <option value="Homme">Formateur</option>
                    <option value="Autre">Formateur.rice</option>
                  </select>
                  <input style={{ ...inp, flex: 2 }} placeholder="Bio" value={editFmt.bio} onChange={e => setEditFmt(f => ({ ...f, bio: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input ref={editFmtPhotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setEditFmtPhotoFile(e.target.files?.[0] || null)} />
                  <button type="button" onClick={() => editFmtPhotoRef.current?.click()} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px dashed " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>
                    📷 {editFmtPhotoFile ? editFmtPhotoFile.name.slice(0, 22) : (formateurs.find(f => f.id === editingFmtId)?.photo_url ? "Changer la photo" : "Ajouter une photo")}
                  </button>
                  {editFmtPhotoFile && <button onClick={() => setEditFmtPhotoFile(null)} style={{ fontSize: 12, color: C.pink, cursor: "pointer", border: "none", background: "none" }}>✕</button>}
                </div>
                <button onClick={handleSaveFormateur} disabled={savingFmt || !editFmt.nom.trim()} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {savingFmt ? "Enregistrement…" : "💾 Enregistrer formateur"}
                </button>
              </div>
            )}
          </div>
          <div>
            <label style={lbl}>Organisme</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <select style={{ ...inp, flex: 1 }} value={form.organisme_id ?? ""} onChange={e => { setF("organisme_id", e.target.value ? Number(e.target.value) : null); setEditingOrgId(null); }}>
                <option value="">— Aucun / à lier plus tard —</option>
                {organismes.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
              </select>
              {form.organisme_id && !showNewOrganisme && (
                <button onClick={() => editingOrgId ? setEditingOrgId(null) : handleEditOrganisme(form.organisme_id!)} style={{ padding: "6px 10px", borderRadius: 9, border: "1.5px solid " + C.border, background: editingOrgId ? C.accentBg : C.surface, color: editingOrgId ? C.accent : C.textSec, fontSize: 12, cursor: "pointer" }}>
                  {editingOrgId ? "✕" : "✏️"}
                </button>
              )}
              <button onClick={() => { setShowNewOrganisme(v => !v); setEditingOrgId(null); }} style={{ padding: "6px 10px", borderRadius: 9, border: "1.5px solid " + C.border, background: showNewOrganisme ? C.accentBg : C.surface, color: showNewOrganisme ? C.accent : C.textSec, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                {showNewOrganisme ? "✕" : "+ Nouveau"}
              </button>
            </div>
            {showNewOrganisme && (
              <div style={{ background: C.bgAlt, border: "1px solid " + C.borderLight, borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <input style={inp} placeholder="Nom de l'organisme *" value={newOrg.nom} onChange={e => setNewOrg(o => ({ ...o, nom: e.target.value }))} />
                <input style={inp} placeholder="Description (optionnel)" value={newOrg.description} onChange={e => setNewOrg(o => ({ ...o, description: e.target.value }))} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input ref={newOrgLogoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setNewOrgLogoFile(e.target.files?.[0] || null)} />
                  <button type="button" onClick={() => newOrgLogoRef.current?.click()} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px dashed " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>
                    🖼️ {newOrgLogoFile ? newOrgLogoFile.name.slice(0, 22) : "Logo (optionnel)"}
                  </button>
                  {newOrgLogoFile && <button onClick={() => setNewOrgLogoFile(null)} style={{ fontSize: 12, color: C.pink, cursor: "pointer", border: "none", background: "none" }}>✕</button>}
                </div>
                <button onClick={handleCreateOrganisme} disabled={creatingOrg || !newOrg.nom.trim()} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: !newOrg.nom.trim() ? 0.5 : 1 }}>
                  {creatingOrg ? "Création…" : "Créer et sélectionner"}
                </button>
              </div>
            )}
            {editingOrgId && (
              <div style={{ background: C.bgAlt, border: "1px solid " + C.borderLight, borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <input style={inp} placeholder="Nom *" value={editOrg.nom} onChange={e => setEditOrg(o => ({ ...o, nom: e.target.value }))} />
                <input style={inp} placeholder="Description" value={editOrg.description} onChange={e => setEditOrg(o => ({ ...o, description: e.target.value }))} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {editOrg.logo && !editOrgLogoFile && <img src={editOrg.logo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", border: "1px solid " + C.border }} />}
                  <input ref={editOrgLogoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setEditOrgLogoFile(e.target.files?.[0] || null)} />
                  <button type="button" onClick={() => editOrgLogoRef.current?.click()} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px dashed " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>
                    🖼️ {editOrgLogoFile ? editOrgLogoFile.name.slice(0, 22) : (editOrg.logo ? "Changer le logo" : "Ajouter un logo")}
                  </button>
                  {editOrgLogoFile && <button onClick={() => setEditOrgLogoFile(null)} style={{ fontSize: 12, color: C.pink, cursor: "pointer", border: "none", background: "none" }}>✕</button>}
                </div>
                <button onClick={handleSaveOrganisme} disabled={savingOrg || !editOrg.nom.trim()} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {savingOrg ? "Enregistrement…" : "💾 Enregistrer organisme"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Prix ── */}
      <div style={section}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 16, fontSize: 15 }}>Tarifs</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
          {([["prix", "Prix (€) *"], ["prix_salarie", "Prix salarié"], ["prix_liberal", "Prix libéral"], ["prix_dpc", "Prix DPC"]] as [keyof FormState, string][]).map(([k, lbl2]) => (
            <div key={k}>
              <label style={lbl}>{lbl2}</label>
              <input style={inp} type="number" value={(form[k] as number | null) ?? ""} onChange={e => setF(k, e.target.value === "" ? null : Number(e.target.value))} placeholder="0" />
            </div>
          ))}
        </div>
        {/* Prix extras */}
        <label style={lbl}>Prix supplémentaires</label>
        {form.prix_extras.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
            <input style={{ ...inp, flex: 2 }} value={e.label} onChange={x => setF("prix_extras", form.prix_extras.map((p, j) => j === i ? { ...p, label: x.target.value } : p))} placeholder="Libellé" />
            <input style={{ ...inp, flex: 1 }} type="number" value={e.value || ""} onChange={x => setF("prix_extras", form.prix_extras.map((p, j) => j === i ? { ...p, value: Number(x.target.value) } : p))} placeholder="€" />
            <button onClick={() => setF("prix_extras", form.prix_extras.filter((_, j) => j !== i))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.pink, cursor: "pointer", fontSize: 12 }}>✕</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <input style={{ ...inp, flex: 2 }} value={newPrixLabel} onChange={e => setNewPrixLabel(e.target.value)} placeholder="Libellé (ex: Tarif groupe)" />
          <input style={{ ...inp, flex: 1 }} type="number" value={newPrixValue} onChange={e => setNewPrixValue(e.target.value)} placeholder="€" />
          <button onClick={() => { if (newPrixLabel && newPrixValue) { setF("prix_extras", [...form.prix_extras, { label: newPrixLabel, value: Number(newPrixValue) }]); setNewPrixLabel(""); setNewPrixValue(""); } }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>+ Ajouter</button>
        </div>
      </div>

      {/* ── Public & Mots-clés ── */}
      <div style={section}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 16, fontSize: 15 }}>Public & Mots-clés</div>
        <div style={row2}>
          <div>
            <label style={lbl}>Populations cibles</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {POPULATIONS_OPTS.map(p => (
                <button key={p} onClick={() => toggleArr("populations", p)} style={{ padding: "4px 10px", borderRadius: 16, border: "1.5px solid", borderColor: form.populations.includes(p) ? C.blue : C.border, background: form.populations.includes(p) ? C.blueBg : C.surface, color: form.populations.includes(p) ? C.blue : C.textSec, fontSize: 12, cursor: "pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Professions ciblées</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PROFESSIONS_OPTS.map(p => (
                <button key={p} onClick={() => toggleArr("professions", p)} style={{ padding: "4px 10px", borderRadius: 16, border: "1.5px solid", borderColor: form.professions.includes(p) ? C.green : C.border, background: form.professions.includes(p) ? C.greenBg : C.surface, color: form.professions.includes(p) ? C.green : C.textSec, fontSize: 12, cursor: "pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={lbl}>Mots-clés (séparés par virgule)</label>
          <input style={inp} value={form.mots_cles} onChange={e => setF("mots_cles", e.target.value)} placeholder="dyslexie, bilan, langage…" />
        </div>
      </div>

      {/* ── Inscription & Options ── */}
      <div style={section}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 16, fontSize: 15 }}>Inscription & Options</div>
        <div style={row2}>
          <div>
            <label style={lbl}>URL d&apos;inscription</label>
            <input style={inp} value={form.url_inscription} onChange={e => setF("url_inscription", e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label style={lbl}>URL vidéo (YouTube)</label>
            <input style={inp} value={form.video_url} onChange={e => setF("video_url", e.target.value)} placeholder="https://youtube.com/…" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: C.textSec }}>
            <input type="checkbox" checked={form.sans_limite} onChange={e => setF("sans_limite", e.target.checked)} />
            Sans limite de date
          </label>
        </div>
      </div>

      {/* ── Photo ── */}
      <div style={section}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 16, fontSize: 15 }}>Photo</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {(photoFile ? URL.createObjectURL(photoFile) : form.photo_url) && (
            <img src={photoFile ? URL.createObjectURL(photoFile) : form.photo_url} alt="" style={{ width: 120, height: 80, borderRadius: 10, objectFit: "cover", border: "1px solid " + C.border }} />
          )}
          <div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
            <button onClick={() => photoInputRef.current?.click()} style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.textSec, fontSize: 13, cursor: "pointer" }}>
              📷 {photoFile ? photoFile.name.slice(0, 24) : (form.photo_url ? "Changer la photo" : "Ajouter une photo")}
            </button>
            {(photoFile || form.photo_url) && (
              <button onClick={() => { setPhotoFile(null); setF("photo_url", ""); }} style={{ marginLeft: 8, padding: "8px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.pink, fontSize: 12, cursor: "pointer" }}>Supprimer</button>
            )}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={lbl}>Ou URL directe</label>
          <input style={inp} value={form.photo_url} onChange={e => { setF("photo_url", e.target.value); setPhotoFile(null); }} placeholder="https://…" />
        </div>
      </div>

      {/* ── Sessions ── */}
      {form.modalite === "E-learning" && (
        <div style={{ ...section, background: "#f0f9ff", border: "1.5px solid #bae6fd", color: "#0369a1", fontSize: 13, textAlign: "center", padding: "14px 20px" }}>
          📱 E-learning — pas de sessions à configurer
        </div>
      )}
      {form.modalite !== "E-learning" && <div style={section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>Sessions ({sessions.length})</div>
          <button onClick={() => setSessions(ss => [...ss, emptySession()])} style={{ padding: "6px 14px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            + Session
          </button>
        </div>

        {sessions.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0", color: C.textTer, fontSize: 13 }}>
            Aucune session (formation sans date fixe ou e-learning)
          </div>
        )}

        {sessions.map((s, si) => (
          <div key={si} style={{ border: "1px solid " + C.border, borderRadius: 12, padding: "16px 16px 12px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Session {si + 1}</div>
              <button onClick={() => setSessions(ss => ss.filter((_, i) => i !== si))} style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>✕ Supprimer</button>
            </div>

            {/* Mode visio toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 13, cursor: "pointer", color: C.textSec }}>
              <input type="checkbox" checked={s.is_visio} onChange={e => setSession(si, "is_visio", e.target.checked)} />
              Visioconférence
            </label>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={lbl}>Dates</label>
                <button onClick={() => setSession(si, "date_ranges", [...s.date_ranges, { debut: "", fin: "" }])} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid " + C.border, background: C.bgAlt, color: C.textSec, fontSize: 11, cursor: "pointer" }}>+ Ajouter date</button>
              </div>
              {s.date_ranges.map((dr, dri) => (
                <div key={dri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 6, alignItems: "end" }}>
                  <div>
                    <label style={{ ...lbl, fontSize: 10 }}>Début</label>
                    <input style={inp} type="date" value={dr.debut} onChange={e => { const r = [...s.date_ranges]; r[dri] = { ...dr, debut: e.target.value }; setSession(si, "date_ranges", r); }} />
                  </div>
                  <div>
                    <label style={{ ...lbl, fontSize: 10 }}>Fin (si différent)</label>
                    <input style={inp} type="date" value={dr.fin} min={dr.debut} onChange={e => { const r = [...s.date_ranges]; r[dri] = { ...dr, fin: e.target.value }; setSession(si, "date_ranges", r); }} />
                  </div>
                  {s.date_ranges.length > 1 && (
                    <button onClick={() => setSession(si, "date_ranges", s.date_ranges.filter((_, j) => j !== dri))} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid " + C.border, background: C.surface, color: C.pink, cursor: "pointer", fontSize: 12 }}>✕</button>
                  )}
                </div>
              ))}
              {s.date_ranges.some(r => r.debut) && (
                <div style={{ fontSize: 12, color: C.textSec, marginTop: 4, background: C.bgAlt, borderRadius: 7, padding: "5px 10px", display: "inline-block" }}>
                  📅 {formatMultipleDateRanges(s.date_ranges)}
                </div>
              )}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Modalité session</label>
              <select style={inp} value={s.modalite_session} onChange={e => setSession(si, "modalite_session", e.target.value)}>
                {MODALITES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            {s.is_visio ? (
              <div>
                <label style={lbl}>Lien visio</label>
                <input style={inp} value={s.lien_visio} onChange={e => setSession(si, "lien_visio", e.target.value)} placeholder="https://zoom.us/…" />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>Ville</label>
                  <input style={inp} value={s.ville} onChange={e => setSession(si, "ville", e.target.value)} placeholder="Paris" />
                </div>
                <div>
                  <label style={lbl}>Adresse</label>
                  <input style={inp} value={s.adresse} onChange={e => setSession(si, "adresse", e.target.value)} placeholder="10 rue…" />
                </div>
                <div>
                  <label style={lbl}>Code postal</label>
                  <input style={inp} value={s.code_postal} onChange={e => setSession(si, "code_postal", e.target.value)} placeholder="75001" />
                </div>
              </div>
            )}

            {/* Parties de session */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>Parties de session ({s.parties.length})</span>
                <button onClick={() => setSession(si, "parties", [...s.parties, { titre: "", date_debut: "", date_fin: "", modalite: "Présentiel", lieu: "", adresse: "", ville: "", code_postal: "", lien_visio: "" }])} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid " + C.border, background: C.bgAlt, color: C.textSec, fontSize: 11, cursor: "pointer" }}>+ Partie</button>
              </div>
              {s.parties.map((p, pi) => (
                <div key={pi} style={{ background: C.bgAlt, borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
                    <div>
                      <label style={{ ...lbl, fontSize: 10 }}>Titre partie</label>
                      <input style={{ ...inp, fontSize: 12 }} value={p.titre} onChange={e => setPartie(si, pi, "titre", e.target.value)} placeholder="Jour 1 — Théorie" />
                    </div>
                    <div>
                      <label style={{ ...lbl, fontSize: 10 }}>Date début</label>
                      <input style={{ ...inp, fontSize: 12 }} type="date" value={p.date_debut} onChange={e => setPartie(si, pi, "date_debut", e.target.value)} />
                    </div>
                    <div>
                      <label style={{ ...lbl, fontSize: 10 }}>Date fin</label>
                      <input style={{ ...inp, fontSize: 12 }} type="date" value={p.date_fin} onChange={e => setPartie(si, pi, "date_fin", e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                    <div>
                      <label style={{ ...lbl, fontSize: 10 }}>Modalité</label>
                      <select style={{ ...inp, fontSize: 12 }} value={p.modalite} onChange={e => setPartie(si, pi, "modalite", e.target.value)}>
                        {MODALITES.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ ...lbl, fontSize: 10 }}>Ville</label>
                      <input style={{ ...inp, fontSize: 12 }} value={p.ville} onChange={e => setPartie(si, pi, "ville", e.target.value)} placeholder="Paris" />
                    </div>
                    <div>
                      <label style={{ ...lbl, fontSize: 10 }}>Adresse</label>
                      <input style={{ ...inp, fontSize: 12 }} value={p.adresse} onChange={e => setPartie(si, pi, "adresse", e.target.value)} placeholder="10 rue…" />
                    </div>
                    <div>
                      <label style={{ ...lbl, fontSize: 10 }}>Lien visio</label>
                      <input style={{ ...inp, fontSize: 12 }} value={p.lien_visio} onChange={e => setPartie(si, pi, "lien_visio", e.target.value)} placeholder="https://…" />
                    </div>
                    <button onClick={() => setSession(si, "parties", s.parties.filter((_, j) => j !== pi))} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid " + C.border, background: C.surface, color: C.pink, cursor: "pointer", fontSize: 12, marginBottom: 1 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>}

      {/* ── Statut ── */}
      <div style={section}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 16, fontSize: 15 }}>Statut de publication</div>
        <div style={{ display: "flex", gap: 8 }}>
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setF("status", s)} style={{
              padding: "7px 16px", borderRadius: 9, border: "1.5px solid",
              borderColor: form.status === s ? C.accent : C.border,
              background: form.status === s ? C.accentBg : C.surface,
              color: form.status === s ? C.accent : C.textSec,
              fontSize: 12, fontWeight: form.status === s ? 700 : 400, cursor: "pointer",
            }}>
              {s === "publiee" ? "✅ Publiée" : s === "en_attente" ? "⏳ En attente" : s === "refusee" ? "✕ Refusée" : "📦 Archivée"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Message & Bouton ── */}
      {msg && (
        <div style={{ padding: "12px 18px", borderRadius: 10, background: msg.startsWith("✅") ? C.greenBg : "#FEF2F2", border: "1px solid " + (msg.startsWith("✅") ? C.green + "44" : "#FECACA"), color: msg.startsWith("✅") ? C.green : C.accent, marginBottom: 16, fontSize: 14 }}>
          {msg}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: "12px 32px", borderRadius: 12, border: "none", background: saving ? C.border : C.accent, color: saving ? C.textSec : "#fff", fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "Enregistrement…" : (isNew ? "Créer la formation" : "Enregistrer les modifications")}
        </button>
        <Link href="/dashboard/admin" style={{ padding: "12px 20px", borderRadius: 12, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center" }}>
          Annuler
        </Link>
      </div>
    </div>
  );
}
