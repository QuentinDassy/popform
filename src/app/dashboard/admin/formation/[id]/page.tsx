"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { C, fetchDomainesAdmin, invalidateCache, DOMAIN_PHOTO_CHOICES, REGIONS_CITIES, CITY_TO_REGION } from "@/lib/data";
import { supabase, fetchOrganismes, fetchFormateurs, type Organisme, type Formateur } from "@/lib/supabase-data";
import { uploadImage } from "@/lib/upload";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionPartieRow = {
  titre: string; date_debut: string; date_fin: string;
  modalite: string; lieu: string; adresse: string; ville: string; code_postal: string; lien_visio: string;
};
type SessionRow = {
  id?: number; dates: string; date_ranges: { debut: string; fin: string }[];
  lieu: string; adresse: string; ville: string; pays: string;
  code_postal: string; modalite_session: string; lien_visio: string; is_visio: boolean;
  parties: SessionPartieRow[];
  organisme_id?: number | null; organisme_libre?: string; url_inscription?: string;
};
type FormState = {
  titre: string; sous_titre: string; description: string;
  domaine: string; domaines: string[];
  modalite: string; prise_en_charge: string[];
  duree: string;
  formateur_ids: number[]; organisme_id: number | null;
  organisme_ids: number[]; organismes_libres: string[];
  prix: number; prix_salarie: number | null; prix_liberal: number | null; prix_dpc: number | null;
  prix_extras: { label: string; value: number }[];
  prix_from: boolean;
  populations: string[]; mots_cles: string; professions: string[];
  effectif: number; url_inscription: string; video_url: string;
  sans_limite: boolean; status: string;
  photo_url: string;
};

const MODALITES = ["Présentiel", "Visio", "E-learning"];
const PRISES = ["DPC", "FIF-PL"];
const POPULATIONS_OPTS = ["Nourrisson/bébé", "Enfant", "Adolescent", "Adulte", "Senior"];
const PROFESSIONS_OPTS = ["Orthophonistes", "Ergothérapeutes", "Psychomotriciens", "Orthoptistes", "Neuropsychologues", "Kinésithérapeutes", "Médecins", "Infirmiers", "Tous professionnels"];
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
  return { dates: "", date_ranges: [{ debut: "", fin: "" }], lieu: "", adresse: "", ville: "", pays: "France", code_postal: "", modalite_session: "Présentiel", lien_visio: "", is_visio: false, parties: [], organisme_id: null, organisme_libre: "", url_inscription: "" };
}
function emptyForm(): FormState {
  return {
    titre: "", sous_titre: "", description: "", domaine: "", domaines: [],
    modalite: "Présentiel", prise_en_charge: [],
    duree: "", formateur_ids: [], organisme_id: null,
    organisme_ids: [], organismes_libres: [],
    prix: 0, prix_salarie: null, prix_liberal: null, prix_dpc: null, prix_extras: [], prix_from: false,
    populations: [], mots_cles: "", professions: ["Orthophonistes"],
    effectif: 0, url_inscription: "", video_url: "",
    sans_limite: false, status: "publiee", photo_url: "",
  };
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminFormationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [adminOrgLibreInput, setAdminOrgLibreInput] = useState("");

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

        if (isNew) {
          const orgId = searchParams.get("organisme_id");
          const fmtId = searchParams.get("formateur_id");
          if (orgId) setForm(prev => ({ ...prev, organisme_id: Number(orgId) }));
          if (fmtId) setForm(prev => ({ ...prev, formateur_ids: [Number(fmtId)] }));
        }

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
              organisme_ids: (f as any).organisme_ids || (f.organisme_id ? [f.organisme_id] : []),
              organismes_libres: (f as any).organismes_libres || [],
              prix: f.prix ?? 0,
              prix_salarie: f.prix_salarie,
              prix_liberal: f.prix_liberal,
              prix_dpc: f.prix_dpc,
              prix_extras: ((f as any).prix_extras || []).filter((e: any) => e.label !== "__from__"),
              prix_from: ((f as any).prix_extras || []).some((e: any) => e.label === "__from__"),
              populations: f.populations || [],
              mots_cles: (f.mots_cles || []).join(", "),
              professions: f.professions || [],
              effectif: f.effectif ?? 0,
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
                pays: s.pays || CITY_TO_REGION[s.lieu || ""] || "France",
                code_postal: s.code_postal || "",
                modalite_session: s.modalite_session || "Présentiel",
                lien_visio: s.lien_visio || "",
                is_visio: s.lieu === "Visio" || !!s.lien_visio,
                organisme_id: (s as any).organisme_id || null,
                organisme_libre: (s as any).organisme_libre || "",
                url_inscription: (s as any).url_inscription || "",
                parties: sp.filter((p: any) => !!p.titre).map((p: any) => ({
                  titre: p.titre || "",
                  date_debut: p.date_debut || "",
                  date_fin: p.date_fin || "",
                  modalite: p.modalite || "Présentiel",
                  lieu: "",
                  adresse: p.adresse || "",
                  ville: p.lieu || p.ville || "",
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
    const { data, error } = await supabase.from("formateurs").insert({ nom: fullNom, sexe: newFmt.sexe, bio: newFmt.bio.trim() || "", organisme_id: null, photo_url: photoUrl }).select().single();
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
  const ensureOrganismesLibres = async (libres: string[]) => {
    const noms = libres.map(n => n.trim()).filter(Boolean);
    if (!noms.length) return;
    const { data: existing } = await supabase.from("organismes").select("nom").in("nom", noms);
    const existingNoms = new Set((existing || []).map((o: any) => o.nom));
    const toCreate = noms.filter(n => !existingNoms.has(n));
    if (toCreate.length) await supabase.from("organismes").insert(toCreate.map(nom => ({ nom, logo: "", description: "", hidden: false })));
  };

  const handleSave = async () => {
    if (!form.titre.trim()) { setMsg("Le titre est obligatoire."); return; }
    setSaving(true); setMsg(null);

    let photoUrl = form.photo_url;
    if (photoFile) {
      try { photoUrl = await uploadImage(photoFile, "formations"); }
      catch (e: any) { setMsg("⚠️ Photo non uploadée : " + e.message); }
    }

    const prixExtras = [
      ...(form.prix_from ? [{ label: "__from__", value: 0 }] : []),
      ...form.prix_extras.filter(e => e.label !== "__from__"),
      ...(newPrixLabel.trim() && newPrixValue ? [{ label: newPrixLabel.trim(), value: Number(newPrixValue) }] : []),
    ].filter(e => e.label && !isNaN(e.value));

    const payload: Record<string, unknown> = {
      titre: form.titre.trim(),
      sous_titre: form.sous_titre.trim(),
      description: form.description.trim(),
      domaine: form.domaines[0] || form.domaine || "",
      domaines: form.domaines,
      modalite: (() => { const parts = (form.modalite || "").split(",").map((m: string) => m.trim()).filter(Boolean); return parts.length > 1 ? "Mixte" : (parts[0] || "Présentiel"); })(),
      modalites: (form.modalite || "").split(",").map((m: string) => m.trim()).filter(Boolean),
      prise_en_charge: form.prise_en_charge,
      duree: form.duree || "",
      formateur_id: form.formateur_ids[0] || null,
      formateur_ids: form.formateur_ids,
      organisme_id: form.organisme_id,
      organisme_ids: form.organisme_ids || [],
      organismes_libres: form.organismes_libres || [],
      prix: form.prix ?? 0,
      prix_salarie: form.prix_salarie,
      prix_liberal: form.prix_liberal,
      prix_dpc: form.prix_dpc,
      prix_extras: prixExtras,
      populations: form.populations,
      mots_cles: form.mots_cles.split(",").map(s => s.trim()).filter(Boolean),
      professions: form.professions,
      effectif: (form.effectif != null && form.effectif > 0) ? form.effectif : null,
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
    await ensureOrganismesLibres(form.organismes_libres || []);

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
            lieu: s.is_visio ? "Visio" :
              (s.parties.length > 0 && s.parties.some(p => p.lieu || p.ville)
                ? [...new Set(s.parties.map(p => p.modalite === "Visio" ? "Visio" : (p.lieu || p.ville)).filter(Boolean))].join(", ")
                : (s.ville.trim() || s.lieu.trim())),
            adresse: s.is_visio ? (s.lien_visio || "") : s.adresse.trim() || null,
            code_postal: s.code_postal || null,
            modalite_session: s.modalite_session || null,
            lien_visio: s.lien_visio || null,
            pays: s.pays || "France",
            organisme_id: s.organisme_id || null,
            organisme_libre: s.organisme_libre || null,
            url_inscription: s.url_inscription || null,
          }))
        ).select();

        if (insertedSessions) {
          for (let si = 0; si < validSessions.length; si++) {
            const sess = validSessions[si];
            const parties = sess.parties.filter(p => p.date_debut || p.titre);
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
            } else if (parties.length === 0 && insertedSessions[si]) {
              // Save a single session_party with ISO dates so the calendar can find them
              const validRanges = sess.date_ranges.filter(r => r.debut);
              if (validRanges.length > 0) {
                await supabase.from("session_parties").insert(
                  validRanges.map(r => ({
                    session_id: insertedSessions[si].id,
                    titre: "",
                    date_debut: r.debut,
                    date_fin: r.fin || r.debut,
                  }))
                );
              }
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
            <input style={inp} type="number" min="0" value={form.effectif || ""} onChange={e => setF("effectif", e.target.value === "" ? null : Math.max(0, Number(e.target.value)))} placeholder="20" />
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
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lbl}>Modalité(s)</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {MODALITES.map(m => {
                const cur = (form.modalite || "").split(",").map((x: string) => x.trim());
                const active = cur.includes(m) || (m === "Présentiel" && form.modalite === "Mixte") || (m === "Visio" && form.modalite === "Mixte");
                return (
                  <button key={m} type="button" onClick={() => {
                    const list = (form.modalite || "").split(",").map((x: string) => x.trim()).filter((x: string) => x && x !== "Mixte");
                    const next = active ? list.filter((x: string) => x !== m) : [...list, m];
                    setF("modalite", (next.length > 0 ? next : [m]).join(","));
                  }} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid " + (active ? "#D42B2B44" : "#ddd"), background: active ? "rgba(212,43,43,0.07)" : "#fff", color: active ? "#D42B2B" : "#888", fontSize: 12, cursor: "pointer", fontWeight: active ? 700 : 400 }}>
                    {m}
                  </button>
                );
              })}
              {form.modalite && !MODALITES.some(m => (form.modalite || "").split(",").map((x: string) => x.trim()).includes(m)) && (
                <span style={{ fontSize: 11, color: "#888", alignSelf: "center" }}>Valeur actuelle : {form.modalite}</span>
              )}
            </div>
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
                {formateurs.filter(f => !form.formateur_ids.includes(f.id)).map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
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
            {/* Organismes co-organisateurs */}
            <div style={{ marginTop: 14 }}>
              <label style={lbl}>Organismes co-organisateurs</label>
              <select style={{ ...inp, marginBottom: 8 }} value="" onChange={e => {
                const val = e.target.value;
                if (val && !form.organisme_ids.includes(Number(val))) {
                  setF("organisme_ids", [...form.organisme_ids, Number(val)]);
                }
              }}>
                <option value="">— Ajouter un organisme co-organisateur —</option>
                {organismes.filter(o => !form.organisme_ids.includes(o.id)).map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
              </select>
              {form.organisme_ids.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {form.organisme_ids.map(oid => {
                    const org = organismes.find(o => o.id === oid);
                    return org ? (
                      <span key={oid} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: C.accentBg, border: "1.5px solid " + C.accent + "44", fontSize: 12, color: C.accent, fontWeight: 600 }}>
                        {org.nom}
                        <button onClick={() => setF("organisme_ids", form.organisme_ids.filter(id => id !== oid))} style={{ background: "none", border: "none", cursor: "pointer", color: C.accent, fontSize: 14, padding: "0 2px", lineHeight: 1 }}>×</button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input style={{ ...inp, flex: 1 }} value={adminOrgLibreInput} onChange={e => setAdminOrgLibreInput(e.target.value)} placeholder="Ou saisir un nom libre…" />
                <button onClick={() => {
                  if (adminOrgLibreInput.trim()) {
                    setF("organismes_libres", [...form.organismes_libres, adminOrgLibreInput.trim()]);
                    setAdminOrgLibreInput("");
                  }
                }} style={{ padding: "6px 12px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>+ Ajouter</button>
              </div>
              {form.organismes_libres.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {form.organismes_libres.map((ol, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: "rgba(245,183,49,0.1)", border: "1.5px solid rgba(212,154,26,0.2)", fontSize: 12, color: "#D49A1A", fontWeight: 600 }}>
                      🏢 {ol}
                      <button onClick={() => setF("organismes_libres", form.organismes_libres.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSec, fontSize: 14, padding: "0 2px", lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Prix ── */}
      <div style={section}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 16, fontSize: 15 }}>Tarif</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={lbl}>Prix (€)</label>
            <input style={inp} type="number" value={form.prix || ""} onChange={e => setF("prix", e.target.value === "" ? 0 : Number(e.target.value))} placeholder="Ex: 450" />
          </div>
          <button type="button" onClick={() => setF("prix_from", !form.prix_from)} style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid " + (form.prix_from ? C.accent + "55" : C.border), background: form.prix_from ? C.accentBg : C.surface, color: form.prix_from ? C.accent : C.textSec, fontSize: 13, fontWeight: form.prix_from ? 700 : 400, cursor: "pointer", marginBottom: 2 }}>
            {form.prix_from ? "✓ " : ""}à partir de
          </button>
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
        {/* Domain photo picker */}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Images de domaine</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DOMAIN_PHOTO_CHOICES.map(p => {
              const isSelected = !photoFile && form.photo_url === p.src;
              return (
                <button key={p.src} onClick={() => { setF("photo_url", p.src); setPhotoFile(null); }}
                  title={p.label}
                  style={{ padding: 0, border: "2.5px solid " + (isSelected ? C.accent : C.borderLight), borderRadius: 10, cursor: "pointer", background: "none", overflow: "hidden", flexShrink: 0, transition: "border-color 0.15s" }}>
                  <img src={p.src} alt={p.label} style={{ width: 76, height: 50, objectFit: "cover", display: "block" }} />
                </button>
              );
            })}
          </div>
        </div>
        {/* Upload or URL */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          {(photoFile ? URL.createObjectURL(photoFile) : (!DOMAIN_PHOTO_CHOICES.some(p => p.src === form.photo_url) ? form.photo_url : null)) && (
            <img src={photoFile ? URL.createObjectURL(photoFile) : form.photo_url} alt="" style={{ width: 100, height: 66, borderRadius: 10, objectFit: "cover", border: "1px solid " + C.border }} />
          )}
          <div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
            <button onClick={() => photoInputRef.current?.click()} style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.textSec, fontSize: 13, cursor: "pointer" }}>
              📷 {photoFile ? photoFile.name.slice(0, 24) : "Importer une photo"}
            </button>
            {(photoFile || form.photo_url) && (
              <button onClick={() => { setPhotoFile(null); setF("photo_url", ""); }} style={{ marginLeft: 8, padding: "8px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.pink, fontSize: 12, cursor: "pointer" }}>✕ Supprimer</button>
            )}
          </div>
        </div>
        <div>
          <label style={lbl}>Ou URL directe</label>
          <input style={inp} value={form.photo_url} onChange={e => { setF("photo_url", e.target.value); setPhotoFile(null); }} placeholder="https://…" />
        </div>
      </div>

      {/* ── Sessions ── */}
      {(form.modalite || "").split(",").every(m => m.trim() === "E-learning") && (
        <div style={{ ...section, background: "#f0f9ff", border: "1.5px solid #bae6fd", color: "#0369a1", fontSize: 13, textAlign: "center", padding: "14px 20px" }}>
          📱 E-learning — pas de sessions à configurer
        </div>
      )}
      {(form.modalite || "").split(",").some(m => m.trim() === "Présentiel" || m.trim() === "Visio" || m.trim() === "Mixte") && <div style={section}>
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
              <select style={inp} value={s.modalite_session} onChange={e => {
                const val = e.target.value;
                setSessions(ss => ss.map((sess, idx) => idx !== si ? sess : { ...sess, modalite_session: val, is_visio: val === "Visio" }));
              }}>
                {MODALITES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            {s.modalite_session === "Visio" ? (
              <div>
                <label style={lbl}>Lien visio</label>
                <input style={inp} value={s.lien_visio} onChange={e => setSession(si, "lien_visio", e.target.value)} placeholder="https://zoom.us/…" />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <div>
                  <label style={lbl}>Pays</label>
                  <select style={inp} value={s.pays || "France"} onChange={e => setSessions(ss => ss.map((sess, idx) => idx !== si ? sess : { ...sess, pays: e.target.value, ville: "" }))}>
                    <option value="France">France</option>
                    <option value="Belgique">Belgique</option>
                    <option value="Suisse">Suisse</option>
                    <option value="Monde">Monde (autre pays)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>{s.pays === "Monde" ? "Pays (préciser)" : "Ville"}</label>
                  {(s.pays || "France") === "France" ? (
                    <input
                      style={inp}
                      list={`villes-session-${si}`}
                      value={s.ville}
                      onChange={e => {
                        const v = e.target.value;
                        setSessions(ss => ss.map((sess, idx) => idx !== si ? sess : { ...sess, ville: v, parties: sess.parties.map(p => ({ ...p, ville: v })) }));
                      }}
                      placeholder="Paris, Lyon, Bordeaux…"
                    />
                  ) : s.pays === "Monde" ? (
                    <input style={inp} value={s.ville} onChange={e => {
                      const v = e.target.value;
                      setSessions(ss => ss.map((sess, idx) => idx !== si ? sess : { ...sess, ville: v, parties: sess.parties.map(p => ({ ...p, ville: v })) }));
                    }} placeholder="Ex: Allemagne, Espagne, Canada…" />
                  ) : (
                    <>
                      <select style={inp} value={REGIONS_CITIES[s.pays || "France"]?.includes(s.ville) ? s.ville : (s.ville ? "__OTHER__" : "")} onChange={e => {
                        const val = e.target.value;
                        const v = val === "__OTHER__" ? "" : val;
                        setSessions(ss => ss.map((sess, idx) => idx !== si ? sess : { ...sess, ville: v, parties: sess.parties.map(p => ({ ...p, ville: v })) }));
                      }}>
                        <option value="">— Choisir une ville —</option>
                        {(REGIONS_CITIES[s.pays || "France"] || []).map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__OTHER__">✏️ Autre ville…</option>
                      </select>
                      {!REGIONS_CITIES[s.pays || "France"]?.includes(s.ville) && (
                        <input style={{ ...inp, marginTop: 6 }} value={s.ville} onChange={e => {
                          const v = e.target.value;
                          setSessions(ss => ss.map((sess, idx) => idx !== si ? sess : { ...sess, ville: v, parties: sess.parties.map(p => ({ ...p, ville: v })) }));
                        }} placeholder={s.pays === "Belgique" ? "Ex: Bruxelles" : "Ex: Genève"} />
                      )}
                    </>
                  )}
                  <datalist id={`villes-session-${si}`}>
                    {Object.entries(REGIONS_CITIES).filter(([r]) => r !== "Belgique" && r !== "Suisse").flatMap(([, cities]) => cities).map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
            )}

            {/* Organisme de session */}
            <div style={{ marginTop: 10 }}>
              <label style={lbl}>Organisme (session)</label>
              <select style={inp} value={s.organisme_id != null ? String(s.organisme_id) : ""} onChange={e => setSession(si, "organisme_id", e.target.value ? Number(e.target.value) : null)}>
                <option value="">— Aucun organisme —</option>
                {organismes.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
              </select>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={lbl}>Organisme libre (si hors liste)</label>
              <input style={inp} value={s.organisme_libre || ""} onChange={e => setSession(si, "organisme_libre", e.target.value)} placeholder="Nom libre d'organisme" />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={lbl}>URL d&apos;inscription (session)</label>
              <input style={inp} value={s.url_inscription || ""} onChange={e => setSession(si, "url_inscription", e.target.value)} placeholder="URL de la session (organisateur)" />
            </div>

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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
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
