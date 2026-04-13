"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { C, fetchDomainesAdmin, invalidateCache, REGIONS_CITIES, CITY_TO_REGION, DOMAIN_PHOTO_CHOICES, isFormationPast, type Formation, type Organisme } from "@/lib/data";
import { StarRow, PriseTag } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase } from "@/lib/supabase-data";
import { uploadImage } from "@/lib/upload";
import FormationWizard, { type WizardFormData, type WizardSession } from "@/components/FormationWizard";
import { useRouter } from "next/navigation";

const MODALITES = ["Présentiel", "Visio", "E-learning"];
const PRISES = ["DPC", "FIF-PL"];
const PROFESSIONS_OPTS = ["Orthophonistes", "Ergothérapeutes", "Psychomotriciens", "Orthoptistes", "Neuropsychologues", "Kinésithérapeutes", "Ostéopathes", "Podologues", "Médecins", "Infirmiers"];

type PartieRow = { titre: string; jours: string[]; modalite: string; lieu: string; adresse: string; ville: string; pays: string; code_postal: string; lien_visio: string; date_debut: string; date_fin: string };
type SessionRow = { id?: number; dates: string; lieu: string; adresse: string; ville: string; code_postal: string; modalite_session?: string; lien_visio?: string; date_debut?: string; date_fin_session?: string; is_visio?: boolean; nb_parties: number; parties?: PartieRow[]; organisme_id?: number | null; organisme_libre?: string; url_inscription?: string };
type FormateurRow = { id: number; nom: string; bio: string; sexe: string; organisme_id: number | null; user_id: string | null; photo_url?: string | null };

function emptyFormation(domainesList: { nom: string; emoji: string }[] = []) {
  return {
    titre: "", sous_titre: "", description: "", domaine: "", domaine_custom: "", domaines: [] as string[],
    modalites: ["Présentiel"] as string[],
    prise_en_charge: [] as string[], prise_aucune: false,
    duree: "", prix: null as number | null, prix_salarie: null as number | null,
    prix_liberal: null as number | null, prix_dpc: null as number | null, prix_from: false,
    is_new: false, populations: [] as string[], mots_cles: "",
    professions: ["Orthophonie"], effectif: null as number | null, video_url: "", url_inscription: "", lien_elearning: "", photo_url: "" as string,
    organisme_ids: [] as number[],
    organismes_libres: [] as string[],
  };
}

export default function DashboardOrganismePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const mob = useIsMobile();
  const [organisme, setOrganisme] = useState<Organisme | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "edit" | "formateurs" | "webinaires" | "congres">("list");
  const [listView, setListView] = useState<"formations" | "webinaires">("formations");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyFormation());
  const [originalForm, setOriginalForm] = useState<ReturnType<typeof emptyFormation> | null>(null);
  const [originalSessions, setOriginalSessions] = useState<SessionRow[] | null>(null);
  const defaultParty = (): PartieRow => ({ titre: "", jours: [], modalite: "Présentiel", lieu: "", adresse: "", ville: "", pays: "France", code_postal: "", lien_visio: "", date_debut: "", date_fin: "" });
  const [sessions, setSessions] = useState<SessionRow[]>([{ dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "", lien_visio: "", is_visio: false, nb_parties: 0, parties: [] }]);
  const [saving, setSaving] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Formateurs management
  const [formateurs, setFormateurs] = useState<FormateurRow[]>([]);
  const [fmtForm, setFmtForm] = useState({ prenom: "", nom: "", bio: "", sexe: "Non genré", photo_url: "" });
  const [fmtPhotoFile, setFmtPhotoFile] = useState<File | null>(null);
  const [editFmtId, setEditFmtId] = useState<number | null>(null);
  const [selFormateurIds, setSelFormateurIds] = useState<number[]>([]);
  const [inlineNewFmt, setInlineNewFmt] = useState(false);
  const [inlineFmt, setInlineFmt] = useState({ prenom: "", nom: "", sexe: "Non genré" });
  const [fmtSearchQuery, setFmtSearchQuery] = useState("");
  const [fmtSearchResults, setFmtSearchResults] = useState<FormateurRow[]>([]);
  const [fmtSearchLoading, setFmtSearchLoading] = useState(false);
  const [inlineFmtPhotoFile, setInlineFmtPhotoFile] = useState<File | null>(null);
  const [allOrganismes, setAllOrganismes] = useState<Organisme[]>([]);
  const [orgLibreInput, setOrgLibreInput] = useState("");
  const [motsClesInput, setMotsClesInput] = useState("");
  const [guidedMode, setGuidedMode] = useState(true);
  // Admin villes
  const [adminVilles, setAdminVilles] = useState<string[]>([]);
  // Domaines from admin
  const [domainesList, setDomainesList] = useState<{ nom: string; emoji: string }[]>([]);
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [extraPrix, setExtraPrix] = useState<{label: string; value: string}[]>([]);
  const [newPrixLabel, setNewPrixLabel] = useState("");
  const [newPrixValue, setNewPrixValue] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [orgSiteUrl, setOrgSiteUrl] = useState<string>("");
  const [orgNom, setOrgNom] = useState<string>("");
  const [orgDescription, setOrgDescription] = useState<string>("");
  // Webinaires
  type WbRow = { id?: number; titre: string; description: string; date_heure: string; prix: number; lien_url: string; status?: string; professions?: string[]; formateur_id?: number | null };
  const [webinaires, setWebinaires] = useState<WbRow[]>([]);
  const [wForm, setWForm] = useState<WbRow>({ titre: "", description: "", date_heure: "", prix: 0, lien_url: "", professions: [], formateur_id: null });
  const [editWId, setEditWId] = useState<number | null>(null);
  const [wSaving, setWSaving] = useState(false);
  const [wMsg, setWMsg] = useState<string | null>(null);
  const [webFmtSearch, setWebFmtSearch] = useState("");
  const [webFmtDropdown, setWebFmtDropdown] = useState(false);
  const [allFormateursForWeb, setAllFormateursForWeb] = useState<{ id: number; nom: string }[]>([]);
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

  // Doublon warning avant sauvegarde
  const [doublonWarning, setDoublonWarning] = useState<{ existing: { id: number; titre: string }[]; proceed: () => void } | null>(null);
  // Formations filter tabs
  const [formationsFilter, setFormationsFilter] = useState<"actives" | "expirees" | "supprimees">("actives");
  // Delete confirmation with message
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; message: string } | null>(null);

  // Load organisme + formations
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const safetyTimer = setTimeout(() => setLoading(false), 12000);
    (async () => {
      try {
      // Find organisme linked to this user
      const [{ data: myOrgs }, { data: orgs }] = await Promise.all([
        supabase.from("organismes").select("*").eq("user_id", user.id).order("id").limit(1),
        supabase.from("organismes").select("id,nom").order("nom"),
      ]);
      let myOrg = myOrgs?.[0] || null;
      setOrganisme(myOrg);
      setOrgSiteUrl((myOrg as any)?.site_url || "");
      setOrgNom(myOrg?.nom || "");
      setOrgDescription((myOrg as any)?.description || "");
      setAllOrganismes((orgs as any) || []);
      if (myOrg) {
        const { data: f } = await supabase.from("formations").select("*, prix_extras, domaines, sessions(*, session_parties(*))").or(`organisme_id.eq.${myOrg.id},organisme_ids.cs.{${myOrg.id}}`).order("date_ajout", { ascending: false });
        // Note: supprimées are now included so formateurs/organismes can see them in the "Supprimées" tab
        let allF: any[] = f || [];
        try {
          // Essayer le RPC d'abord (bypass RLS), sinon fallback direct
          let sessionFormationIds: number[] = [];
          const { data: sessionLinks, error: slErr } = await supabase
            .rpc("get_formation_ids_by_session_organisme", { org_id: myOrg.id });
          if (!slErr && sessionLinks) {
            sessionFormationIds = (sessionLinks as { formation_id: number }[]).map(r => r.formation_id).filter(Boolean);
          } else {
            // Fallback : query directe (fonctionne si RLS sessions autorise les authenticated users)
            if (slErr) console.error("RPC manquant, tentative directe:", slErr.message);
            const { data: directLinks } = await supabase
              .from("sessions")
              .select("formation_id")
              .eq("organisme_id", myOrg.id);
            if (directLinks) sessionFormationIds = directLinks.map((r: any) => r.formation_id).filter(Boolean);
          }
          if (sessionFormationIds.length > 0) {
            const existingIds = new Set(allF.map((fo: any) => fo.id));
            const extraIds = sessionFormationIds.filter((id, i, a) => id && !existingIds.has(id) && a.indexOf(id) === i);
            if (extraIds.length > 0) {
              const { data: extraF } = await supabase.from("formations").select("*, prix_extras, domaines, sessions(*, session_parties(*))").in("id", extraIds);
              if (extraF) allF = [...allF, ...extraF];
            }
          }
        } catch (e: any) { console.error("sessions organisme lookup exception:", e?.message); }
        setFormations(allF);
        const [{ data: fmts }, { data: wbs }, { data: cgs }, { data: allFmts }] = await Promise.all([
          supabase.from("formateurs").select("*").eq("organisme_id", myOrg.id),
          supabase.from("webinaires").select("*").eq("organisme_id", myOrg.id).order("date_heure", { ascending: true }),
          supabase.from("congres").select("*, speakers:congres_speakers(nom,titre_intervention)").eq("organisme_id", myOrg.id).order("date", { ascending: true }),
          supabase.from("formateurs").select("id, nom").order("nom"),
        ]);
        setFormateurs(fmts || []);
        setWebinaires(wbs || []);
        setCongresList((cgs || []).map((c: any) => ({ ...c, speakers: c.speakers || [] })));
        setAllFormateursForWeb(allFmts || []);
      }
      // Load admin villes + domaines in parallel
      const [{ data: villes }, domaines] = await Promise.all([
        supabase.from("villes_admin").select("nom").order("nom"),
        fetchDomainesAdmin(),
      ]);
      setAdminVilles(villes?.map((v: { nom: string }) => v.nom) || []);
      setDomainesList(domaines.map(d => ({ nom: d.nom, emoji: d.emoji })));
      } catch { /* timeout ou erreur réseau */ } finally { clearTimeout(safetyTimer); setLoading(false); }
    })();
    return () => clearTimeout(safetyTimer);
  }, [user, profile]);

  const openEdit = (f?: Formation) => {
    if (f) {
      setEditId(f.id);
      setForm({
        titre: f.titre, sous_titre: f.sous_titre || "", description: f.description,
        domaine: f.domaine, domaine_custom: "", domaines: (f as any).domaines?.length > 0 ? (f as any).domaines : (f.domaine ? [f.domaine] : []),
        modalites: (f.modalite === "Mixte" ? ["Présentiel", "Visio"] : (f.modalite || "Présentiel").split(",").map((x: string) => x.trim()).filter(Boolean)), prise_en_charge: f.prise_en_charge || [], prise_aucune: (f.prise_en_charge || []).length === 0,
        duree: f.duree, prix: f.prix, prix_salarie: f.prix_salarie, prix_liberal: f.prix_liberal,
        prix_dpc: f.prix_dpc, prix_from: ((f as any).prix_extras || []).some((e: any) => e.label === "__from__"), is_new: f.is_new, populations: f.populations || [],
        mots_cles: (f.mots_cles || []).join(", "), professions: f.professions || [],
        effectif: f.effectif, video_url: f.video_url || "", url_inscription: f.url_inscription || "", lien_elearning: (f as any).lien_elearning || "", photo_url: (f as any).photo_url || "",
        organisme_ids: (f as any).organisme_ids || [],
        organismes_libres: (f as any).organismes_libres || [],
      });
      setOriginalForm({
        titre: f.titre, sous_titre: f.sous_titre || "", description: f.description,
        domaine: f.domaine, domaine_custom: "", domaines: (f as any).domaines?.length > 0 ? (f as any).domaines : (f.domaine ? [f.domaine] : []),
        modalites: (f.modalite === "Mixte" ? ["Présentiel", "Visio"] : (f.modalite || "Présentiel").split(",").map((x: string) => x.trim()).filter(Boolean)), prise_en_charge: f.prise_en_charge || [], prise_aucune: (f.prise_en_charge || []).length === 0,
        duree: f.duree, prix: f.prix, prix_salarie: f.prix_salarie, prix_liberal: f.prix_liberal,
        prix_dpc: f.prix_dpc, prix_from: ((f as any).prix_extras || []).some((e: any) => e.label === "__from__"), is_new: f.is_new, populations: f.populations || [],
        mots_cles: (f.mots_cles || []).join(", "), professions: f.professions || [],
        effectif: f.effectif, video_url: f.video_url || "", url_inscription: f.url_inscription || "", lien_elearning: (f as any).lien_elearning || "", photo_url: (f as any).photo_url || "",
        organisme_ids: (f as any).organisme_ids || [],
        organismes_libres: (f as any).organismes_libres || [],
      });
      const loadedSessions = (f.sessions || []).map(s => { const sp = (s as any).session_parties || []; const parties = sp.map((p: any) => ({ titre: p.titre || "", jours: p.jours ? p.jours.split(",").filter(Boolean) : (p.date_debut ? [p.date_debut] : []), date_debut: p.date_debut || "", date_fin: p.date_fin || "", modalite: p.modalite || "Présentiel", lieu: p.lieu || "", adresse: p.adresse || "", ville: p.ville || "", pays: "France", code_postal: p.code_postal || "", lien_visio: p.lien_visio || "" })); return { id: s.id, dates: s.dates, lieu: s.lieu, adresse: s.adresse || "", ville: s.lieu || "", code_postal: "", modalite_session: s.modalite_session || "", lien_visio: s.lien_visio || "", is_visio: s.lieu === "Visio" || !!s.lien_visio, nb_parties: parties.length, parties }; });
      setSessions(loadedSessions);
      setOriginalSessions(loadedSessions);
      setExtraPrix(((f as any).prix_extras || []).filter((e: any) => e.label !== "__from__"));
      const existingIds: number[] = (f as any).formateur_ids?.length ? (f as any).formateur_ids : ((f as any).formateur_id ? [(f as any).formateur_id] : []);
      setSelFormateurIds(existingIds);
    } else {
      setEditId(null);
      setForm(emptyFormation());
      setSessions([{ dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "", lien_visio: "", is_visio: false, nb_parties: 0, parties: [] }]);
      setOriginalSessions(null);
      setFormPhotoFile(null);
      setExtraPrix([]);
      setSelFormateurIds([]);
    }
    setNewPrixLabel(""); setNewPrixValue("");
    setMsg(null);
    setTab("edit");
  };

  const ensureOrganismesLibres = async (libres: string[]) => {
    const noms = libres.map(n => n.trim()).filter(Boolean);
    if (!noms.length) return;
    const { data: existing } = await supabase.from("organismes").select("nom").in("nom", noms);
    const existingNoms = new Set((existing || []).map((o: any) => o.nom));
    const toCreate = noms.filter(n => !existingNoms.has(n));
    if (toCreate.length) await supabase.from("organismes").insert(toCreate.map(nom => ({ nom, logo: "", description: "", hidden: false })));
  };

  const handleSave = async () => {
    if (!organisme) return;
    if (!form.titre.trim()) { setMsg("Le titre est obligatoire."); return }
    if (!form.description.trim()) { setMsg("La description est obligatoire."); return }
    if (!form.domaines.length) { setMsg("Le domaine est obligatoire."); return }
    if (selFormateurIds.length === 0) { setMsg("Veuillez sélectionner au moins un·e formateur·rice."); return }
    const hasPresentialOrVisio = form.modalites.some((m: string) => m === "Présentiel" || m === "Visio");
    const isELearning = !hasPresentialOrVisio;
    const hasDate = !hasPresentialOrVisio || sessions.every(s => (s.parties || []).some(p => p.date_debut));
    if (hasPresentialOrVisio && sessions.length > 0 && !hasDate) { setMsg("Chaque session doit avoir au moins une date."); return }

    // Détection doublon AVANT la sauvegarde (seulement pour une nouvelle formation)
    if (!editId) {
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u00e0-\u00ff]/g, " ").replace(/\s+/g, " ").trim();
      const { data: existingForms } = await supabase.from("formations").select("id, titre").or(`organisme_id.eq.${organisme.id},organisme_ids.cs.{${organisme.id}}`).not("status", "in", '("supprimee","refusee")');
      if (existingForms && existingForms.length > 0) {
        const newNorm = norm(form.titre.trim());
        const duplicates = existingForms.filter((ef: { titre: string }) => {
          const efNorm = norm(ef.titre);
          if (efNorm === newNorm) return true;
          if (efNorm.length > 10 && newNorm.length > 10 && (efNorm.includes(newNorm) || newNorm.includes(efNorm))) return true;
          return false;
        });
        if (duplicates.length > 0) {
          setDoublonWarning({ existing: duplicates, proceed: () => { setDoublonWarning(null); actualSave(); } });
          return;
        }
      }
    }
    actualSave();
  };

  const actualSave = async () => {
    if (!organisme) return;
    setSaving(true); setMsg(null);

    const hasPresentialOrVisio = form.modalites.some((m: string) => m === "Présentiel" || m === "Visio");
    const isELearning = !hasPresentialOrVisio;
    const computedModalite = form.modalites.length > 1 ? "Mixte" : (form.modalites[0] || "Présentiel");

    // Calculer les prix supplémentaires
    const prixExtrasAll = [...extraPrix].filter(e => e.label !== "__from__");
    if (newPrixLabel.trim() && newPrixValue.trim()) {
      prixExtrasAll.push({ label: newPrixLabel.trim(), value: newPrixValue.trim() });
    }
    const prixExtrasFinal = [
      ...(form.prix_from ? [{ label: "__from__", value: 0 }] : []),
      ...prixExtrasAll.filter(e => e.label.trim() && String(e.value).trim()).map(e => ({ label: e.label.trim(), value: Number(e.value) })),
    ];

    const payload = {
      titre: form.titre.trim(),
      sous_titre: form.sous_titre.trim(),
      description: form.description.trim(),
      domaine: form.domaines[0] || form.domaine,
      domaines: form.domaines,
      modalite: computedModalite,
      modalites: form.modalites,
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
      effectif: (form.effectif != null && form.effectif > 0) ? form.effectif : null, photo_url: form.photo_url || null,
      video_url: form.video_url,
      url_inscription: form.url_inscription || "",
      lien_elearning: form.lien_elearning || null,
      organisme_id: organisme.id,
      organisme_ids: [organisme.id],
      organismes_libres: [],
      formateur_id: selFormateurIds[0] || null as number | null, formateur_ids: selFormateurIds,
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
      const currentFormation = formations.find((f: any) => f.id === editId);
      const isPublished = currentFormation?.status === "publiee";
      let modifChanges: { label: string; from: string; to: string }[] = [];
      if (isPublished && originalForm) {
        const MCHK: Record<string, string> = { titre: "Titre", sous_titre: "Sous-titre", description: "Description", duree: "Durée", prix: "Prix", prix_salarie: "Prix salarié", prix_liberal: "Prix libéral", prix_dpc: "Prix DPC", url_inscription: "URL inscription", lien_elearning: "Lien e-learning", video_url: "Vidéo", mots_cles: "Mots-clés", effectif: "Effectif" };
        (Object.keys(MCHK) as (keyof typeof MCHK)[]).forEach(k => { const f0 = String((originalForm as any)[k] ?? ""); const f1 = String((form as any)[k] ?? ""); if (f0 !== f1) modifChanges.push({ label: MCHK[k], from: f0.slice(0, 60) || "—", to: f1.slice(0, 60) || "—" }); });
        if (JSON.stringify(originalForm.modalites.slice().sort()) !== JSON.stringify(form.modalites.slice().sort())) modifChanges.push({ label: "Modalités", from: (originalForm.modalites || []).join(", ") || "—", to: (form.modalites || []).join(", ") || "—" });
        if (JSON.stringify(originalForm.domaines.slice().sort()) !== JSON.stringify(form.domaines.slice().sort())) modifChanges.push({ label: "Domaines", from: (originalForm.domaines || []).join(", ") || "—", to: (form.domaines || []).join(", ") || "—" });
        if (JSON.stringify(originalForm.populations) !== JSON.stringify(form.populations)) modifChanges.push({ label: "Populations", from: (originalForm.populations || []).join(", ") || "—", to: (form.populations || []).join(", ") || "—" });
        if (JSON.stringify(originalForm.prise_en_charge) !== JSON.stringify(form.prise_en_charge)) modifChanges.push({ label: "Prise en charge", from: (originalForm.prise_en_charge || []).join(", ") || "—", to: (form.prise_en_charge || []).join(", ") || "—" });
        if (originalForm.photo_url !== form.photo_url) modifChanges.push({ label: "Photo", from: originalForm.photo_url ? "oui" : "—", to: form.photo_url ? "oui" : "—" });
        if (originalSessions !== null) { const ok = originalSessions.map(s => JSON.stringify({ d: s.dates, l: s.lieu, p: s.parties })).join("|"); const ck = sessions.map(s => JSON.stringify({ d: s.dates, l: s.lieu, p: s.parties })).join("|"); if (ok !== ck) modifChanges.push({ label: "Sessions", from: `${originalSessions.length} session(s)`, to: `${sessions.length} session(s) (modifiées)` }); }
      }
      const pendingUpdateValue = isPublished && modifChanges.length > 0
        ? JSON.stringify({ type: "modification", changes: modifChanges, modified_at: new Date().toISOString() })
        : undefined;
      const updatePayload = isPublished
        ? { ...payload, status: "publiee" as const, ...(pendingUpdateValue ? { pending_update: pendingUpdateValue } : {}) }
        : { ...payload, status: "en_attente" as const };
      const { error } = await supabase.from("formations").update(updatePayload).eq("id", editId);
      if (error) { setMsg("Erreur: " + error.message); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from("formations").insert({ ...payload, status: "en_attente" }).select().single();
      if (error) { setMsg("Erreur: " + error.message); setSaving(false); return }
      formationId = data.id;
    }
    await ensureOrganismesLibres(form.organismes_libres || []);
    // Sessions: delete old, insert new (skip for E-learning)
    if (formationId) {
      await supabase.from("inscriptions").update({ session_id: null }).eq("formation_id", formationId);
      await supabase.from("sessions").delete().eq("formation_id", formationId);
      const validSessions = isELearning ? [] : sessions.filter(s => (s.parties && s.parties.length > 0) || (s.dates.trim() && (s.ville.trim() || s.lieu.trim() || (s.lien_visio || "").trim())));
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
          pays: (s.parties && s.parties.length > 0)
            ? (s.parties.find((p: any) => p.pays && p.pays !== "France")?.pays || "France")
            : "France",
          organisme_id: s.organisme_id != null ? s.organisme_id : organisme.id,
          organisme_libre: s.organisme_libre || null,
          url_inscription: s.url_inscription || null,
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

    // Sauvegarder les prix supplémentaires séparément (garantit la sauvegarde JSONB)
    if (formationId) {
      const { error: prixError } = await supabase
        .from("formations")
        .update({ prix_extras: prixExtrasFinal } as any)
        .eq("id", formationId);
      if (prixError) { setMsg("Formation soumise mais erreur sur les prix supplémentaires : " + prixError.message); setSaving(false); return; }
    }

    // Reload
    const { data: f } = await supabase.from("formations").select("*, prix_extras, domaines, sessions(*, session_parties(*))").or(`organisme_id.eq.${organisme.id},organisme_ids.cs.{${organisme.id}}`).order("date_ajout", { ascending: false });
    let allF: any[] = f || [];
    try {
      let sessionFormationIds: number[] = [];
      const { data: sessionLinks, error: slErr2 } = await supabase
        .rpc("get_formation_ids_by_session_organisme", { org_id: organisme.id });
      if (!slErr2 && sessionLinks) {
        sessionFormationIds = (sessionLinks as { formation_id: number }[]).map(r => r.formation_id).filter(Boolean);
      } else {
        const { data: directLinks } = await supabase.from("sessions").select("formation_id").eq("organisme_id", organisme.id);
        if (directLinks) sessionFormationIds = directLinks.map((r: any) => r.formation_id).filter(Boolean);
      }
      if (sessionFormationIds.length > 0) {
        const existingIds = new Set(allF.map((fo: any) => fo.id));
        const extraIds = sessionFormationIds.filter((id, i, a) => id && !existingIds.has(id) && a.indexOf(id) === i);
        if (extraIds.length > 0) {
          const { data: extraF } = await supabase.from("formations").select("*, prix_extras, domaines, sessions(*, session_parties(*))").in("id", extraIds);
          if (extraF) allF = [...allF, ...extraF];
        }
      }
    } catch {}
    setFormations(allF);
    setSaving(false);
    // Email à l'admin pour nouvelle soumission (pas pour les modifications)
    if (!editId) {
      fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "new_formation", titre: payload.titre, formateur_nom: organisme.nom }) }).catch(() => {});
    }
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

  const handleSearchFormateurs = async (q: string) => {
    setFmtSearchQuery(q);
    if (q.trim().length < 2) { setFmtSearchResults([]); return; }
    setFmtSearchLoading(true);
    const { data } = await supabase.from("formateurs").select("*").ilike("nom", `%${q.trim()}%`).limit(10);
    // Exclure ceux déjà dans l'organisme
    const myIds = new Set(formateurs.map(f => f.id));
    setFmtSearchResults((data || []).filter((f: FormateurRow) => !myIds.has(f.id)));
    setFmtSearchLoading(false);
  };

  const handleAddExistingFormateur = async (f: FormateurRow) => {
    if (!organisme) return;
    await supabase.from("formateurs").update({ organisme_id: organisme.id }).eq("id", f.id);
    setFormateurs(prev => [...prev, { ...f, organisme_id: organisme.id }]);
    setFmtSearchResults(prev => prev.filter(r => r.id !== f.id));
    setMsg("✅ " + f.nom + " ajouté·e à vos formateurs !");
    setTimeout(() => setMsg(null), 3000);
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

  const handleDelete = (id: number) => {
    setDeleteConfirm({ id, message: "" });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !organisme) return;
    const nomOrg = organisme.nom || "organisme";
    const { error } = await supabase.from("formations").update({ status: "supprimee", supprime_par: "organisme:" + nomOrg, suppression_message: deleteConfirm.message || null } as any).eq("id", deleteConfirm.id);
    if (error) { alert("Erreur suppression : " + error.message); setDeleteConfirm(null); return; }
    setFormations(prev => prev.map(f => f.id === deleteConfirm.id ? { ...f, status: "supprimee", supprime_par: "organisme:" + nomOrg, suppression_message: deleteConfirm.message || null } as any : f));
    invalidateCache();
    setDeleteConfirm(null);
  };

  const handleWizardSubmit = async (data: WizardFormData, wizSessions: WizardSession[], photoFile: File | null) => {
    if (!organisme) return;
    setSaving(true);
    const computedModalite = data.modalites.length > 1 ? "Mixte" : (data.modalites[0] || "Présentiel");
    let photoUrl = data.photo_url;
    if (photoFile) {
      try { photoUrl = await uploadImage(photoFile, "formations"); } catch {}
    }
    const payload: any = {
      titre: data.titre.trim(), sous_titre: data.sous_titre.trim(), description: data.description.trim(),
      domaine: data.domaines[0] || "", domaines: data.domaines,
      modalite: computedModalite, modalites: data.modalites,
      prise_en_charge: data.prise_aucune ? [] : data.prise_en_charge,
      duree: data.duree || "7h", prix: data.prix ?? 0,
      prix_salarie: null, prix_liberal: null, prix_dpc: null,
      is_new: true, populations: [],
      mots_cles: data.mots_cles.split(",").map((s: string) => s.trim()).filter(Boolean),
      professions: data.professions.length ? data.professions : ["Orthophonie"],
      effectif: data.effectif || null, photo_url: photoUrl || null,
      video_url: data.video_url, url_inscription: data.url_inscription || "",
      lien_elearning: data.lien_elearning || null,
      organisme_id: organisme.id,
      organisme_ids: [...new Set([organisme.id, ...(data.organisme_ids || [])])],
      organismes_libres: data.organismes_libres || [],
      formateur_id: (data.formateur_ids || [])[0] || null,
      formateur_ids: data.formateur_ids || [],
      note: 0, nb_avis: 0, sans_limite: false,
      date_fin: null, date_ajout: new Date().toISOString().slice(0, 10), status: "en_attente",
    };
    const { data: inserted, error } = await supabase.from("formations").insert(payload).select().single();
    if (error) { setSaving(false); alert("Erreur: " + error.message); return; }
    await ensureOrganismesLibres(data.organismes_libres || []);
    if (inserted && wizSessions.length > 0) {
      const { data: insertedSessions } = await supabase.from("sessions").insert(
        wizSessions.map((s: WizardSession) => ({
          formation_id: inserted.id,
          dates: s.date_debut + (s.date_fin ? " → " + s.date_fin : ""),
          lieu: s.modalite === "Visio" ? "Visio" : s.lieu,
          adresse: s.modalite === "Visio" ? (s.lien_visio || "") : s.lieu,
          modalite_session: s.modalite, lien_visio: s.lien_visio || null,
          organisme_id: s.organisme_id || null,
          organisme_libre: s.organisme_libre || null,
          url_inscription: s.url_inscription || null,
        }))
      ).select();
      if (insertedSessions) {
        for (let i = 0; i < wizSessions.length; i++) {
          if (insertedSessions[i]) {
            await supabase.from("session_parties").insert({
              session_id: insertedSessions[i].id,
              modalite: wizSessions[i].modalite,
              lieu: wizSessions[i].modalite === "Visio" ? "Visio" : wizSessions[i].lieu,
              ville: wizSessions[i].modalite === "Visio" ? "" : wizSessions[i].lieu,
              lien_visio: wizSessions[i].lien_visio || null,
              date_debut: wizSessions[i].date_debut || null,
              date_fin: wizSessions[i].date_fin || null,
              jours: wizSessions[i].date_debut || null,
            });
          }
        }
      }
    }
    const { data: f } = await supabase.from("formations").select("*, prix_extras, domaines, sessions(*, session_parties(*))").eq("organisme_id", organisme.id).neq("status", "supprimee").order("date_ajout", { ascending: false });
    setFormations(f || []);
    setSaving(false);
    const { invalidateCache } = await import("@/lib/supabase-data");
    invalidateCache();
    fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "new_formation", titre: payload.titre, formateur_nom: organisme.nom }) }).catch(() => {});
  };

  if (authLoading || loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  if (!user) { if (typeof window !== "undefined") window.location.href = "/"; return null }
  if (profile && profile.role !== "organisme") { if (typeof window !== "undefined") window.location.href = "/"; return null }
  if (!organisme) return (
    <div style={{ textAlign: "center", padding: 80 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>Votre espace est en cours de configuration</div>
      <div style={{ fontSize: 14, color: C.textSec }}>L&apos;administrateur doit lier votre compte à votre organisme. Revenez dans quelques instants.</div>
    </div>
  );

  const px = mob ? "0 16px" : "0 40px";
  const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" };
  const formationsActives = formations.filter(f => f.status !== "supprimee" && !(f.status === "publiee" && isFormationPast(f)));
  const formationsExpirees = formations.filter(f => f.status === "publiee" && isFormationPast(f));
  const formationsSupprimees = formations.filter(f => f.status === "supprimee");
  const displayedFormations = formationsFilter === "supprimees" ? formationsSupprimees : formationsFilter === "expirees" ? formationsExpirees : formationsActives;

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
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: C.textTer, marginTop: 6 }}>📝</span>
                <textarea
                  value={orgDescription}
                  onChange={e => setOrgDescription(e.target.value)}
                  onBlur={async () => {
                    if (!organisme) return;
                    await supabase.from("organismes").update({ description: orgDescription || null }).eq("id", organisme.id);
                    setOrganisme(prev => prev ? { ...prev, description: orgDescription } : prev);
                    invalidateCache();
                  }}
                  placeholder="Description de votre organisme (visible sur votre profil public)"
                  rows={3}
                  style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid " + C.borderLight, background: "transparent", color: C.textSec, width: 260, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                />
              </div>
            </div>
          </div>
        </div>
        {tab === "list" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setTab("formateurs")} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🎤 Formateur·rice·s ({formateurs.length})</button>
            <button onClick={() => setTab("webinaires")} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>💻 Créer un webinaire</button>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => guidedMode ? setWizardOpen(true) : openEdit()} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {guidedMode ? "✨ " : "+ "}Créer une formation
              </button>
              <button onClick={() => setGuidedMode((g: boolean) => !g)} title={guidedMode ? "Passer en mode classique" : "Passer en mode guidé"} style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid " + (guidedMode ? C.accent + "55" : C.border), background: guidedMode ? C.accentBg : C.surface, color: guidedMode ? C.accent : C.textTer, fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                {guidedMode ? "✨ guidé" : "⚙️ expert"}
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ===== CONTACT ===== */}
      <div style={{ marginBottom: 12, padding: "12px 16px", background: "rgba(212,43,43,0.04)", borderRadius: 10, border: "1px solid " + C.borderLight, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16 }}>💬</span>
        <span style={{ fontSize: 13, color: C.textSec }}>Une question ? Écrivez-nous à <a href="mailto:contact@popform.fr" style={{ color: C.accent, fontWeight: 700, textDecoration: "none" }}>contact@popform.fr</a></span>
      </div>



      {/* ===== PROFIL PUBLIC ===== */}
      {tab === "list" && organisme && (
        <div style={{ marginBottom: 12, padding: "16px 20px", background: `linear-gradient(135deg, ${C.accentBg} 0%, #f0f4ff 100%)`, borderRadius: 14, border: "1.5px solid " + C.accent + "33", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Mon profil public</div>
            <div style={{ fontSize: 13, color: C.textSec, marginBottom: 2 }}>Partagez votre profil sur les réseaux sociaux pour promouvoir vos formations.</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.accent, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>popform.fr/organisme/{organisme.id}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => navigator.clipboard.writeText(`https://popform.fr/organisme/${organisme.id}`)} style={{ padding: "9px 16px", borderRadius: 10, border: "1.5px solid " + C.accent + "55", background: "#fff", color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Copier le lien</button>
            <a href={`/organisme/${organisme.id}`} target="_blank" rel="noopener noreferrer" style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>Voir mon profil</a>
          </div>
        </div>
      )}

      {/* ===== STATS ===== */}
      {tab === "list" && (
        <>
          {/* ===== LISTE / WEBINAIRES SUB-TABS ===== */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, background: C.bgAlt, borderRadius: 12, width: "fit-content" }}>
            {([
              { v: "formations", l: "📋 Mes formations" },
              { v: "webinaires", l: `💻 Mes webinaires (${webinaires.length})` },
            ] as const).map(t => (
              <button key={t.v} onClick={() => setListView(t.v)} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: listView === t.v ? C.surface : "transparent", color: listView === t.v ? C.text : C.textTer, fontSize: 12, fontWeight: listView === t.v ? 700 : 500, cursor: "pointer", boxShadow: listView === t.v ? "0 1px 4px rgba(0,0,0,0.06)" : "none" }}>
                {t.l}
              </button>
            ))}
          </div>

          {/* ===== WEBINAIRES LIST VIEW ===== */}
          {listView === "webinaires" && (
            <div style={{ paddingBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: C.text }}>💻 Mes webinaires</h2>
                <button onClick={() => setTab("webinaires")} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Créer un webinaire</button>
              </div>
              {webinaires.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60, color: C.textTer }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💻</div>
                  <p>Aucun webinaire pour l&apos;instant.</p>
                  <button onClick={() => setTab("webinaires")} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Créer votre premier webinaire</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {webinaires.map(w => (
                    <div key={w.id} style={{ padding: mob ? 14 : 18, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 4 }}>{w.titre}</div>
                        <div style={{ fontSize: 12, color: C.textTer }}>{w.date_heure ? new Date(w.date_heure).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) : "—"} · {w.prix === 0 ? "Gratuit" : w.prix + " €"}</div>
                        <div style={{ marginTop: 6 }}>
                          {w.status === "en_attente" && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: C.yellowBg, color: C.yellowDark }}>⏳ En attente</span>}
                          {w.status === "publie" && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: C.greenBg, color: C.green }}>✓ Publié</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setTab("webinaires"); setTimeout(() => { setEditWId(w.id!); setWForm({ titre: w.titre, description: w.description, date_heure: w.date_heure, prix: w.prix, lien_url: w.lien_url, professions: w.professions || [] }); }, 50); }} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 12, cursor: "pointer" }}>✏️ Modifier</button>
                        <button onClick={async () => { if (!confirm("Supprimer ce webinaire ?")) return; await supabase.from("webinaire_inscriptions").delete().eq("webinaire_id", w.id); const { error } = await supabase.from("webinaires").delete().eq("id", w.id); if (error) { alert("Erreur suppression : " + error.message); return; } setWebinaires(prev => prev.filter(x => x.id !== w.id)); }} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 12, cursor: "pointer" }}>🗑 Supprimer</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== FORMATIONS LIST VIEW ===== */}
          {listView === "formations" && <>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Formations actives", value: formationsActives.length, icon: "🎬" },
              { label: "Sessions", value: formationsActives.reduce((s, f) => s + (f.sessions?.length || 0), 0), icon: "📅" },
              { label: "Note moyenne", value: (() => { const rated = formationsActives.filter(f => f.nb_avis > 0); return rated.length ? (rated.reduce((s, f) => s + f.note, 0) / rated.length).toFixed(1) : "—"; })(), icon: "⭐" },
            ].map(s => (
              <div key={s.label} style={{ padding: mob ? 12 : 16, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontSize: mob ? 20 : 24, fontWeight: 800, color: C.text }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.textTer }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, padding: 4, background: C.bgAlt, borderRadius: 12, width: "fit-content", flexWrap: "wrap" }}>
            {([
              { v: "actives", l: `📋 Actives (${formationsActives.length})` },
              { v: "expirees", l: `📅 Expirées (${formationsExpirees.length})` },
              { v: "supprimees", l: `🗑️ Supprimées (${formationsSupprimees.length})` },
            ] as const).map(t => (
              <button key={t.v} onClick={() => setFormationsFilter(t.v)} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: formationsFilter === t.v ? C.surface : "transparent", color: formationsFilter === t.v ? C.text : C.textTer, fontSize: 11, fontWeight: formationsFilter === t.v ? 700 : 500, cursor: "pointer", boxShadow: formationsFilter === t.v ? "0 1px 4px rgba(0,0,0,0.06)" : "none" }}>
                {t.l}
              </button>
            ))}
          </div>

          {/* ===== LIST ===== */}
          {displayedFormations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textTer }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{formationsFilter === "supprimees" ? "🗑️" : formationsFilter === "expirees" ? "📅" : "🎬"}</div>
              <p>{formationsFilter === "supprimees" ? "Aucune formation supprimée." : formationsFilter === "expirees" ? "Aucune formation expirée." : "Aucune formation. Créez votre première !"}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 40 }}>
              {displayedFormations.map(f => {
                const isSupprimee = f.status === "supprimee";
                const isExpired = f.status === "publiee" && isFormationPast(f);
                const suppressedBy = (f as any).supprime_par as string | undefined;
                const suppressedMsg = (f as any).suppression_message as string | undefined;
                let suppressedLabel = "";
                if (suppressedBy === "admin") suppressedLabel = "Supprimée par l'admin";
                else if (suppressedBy?.startsWith("formateur:")) suppressedLabel = "Supprimée par " + suppressedBy.replace("formateur:", "");
                else if (suppressedBy?.startsWith("organisme:")) suppressedLabel = "Supprimée par " + suppressedBy.replace("organisme:", "");
                else if (suppressedBy) suppressedLabel = "Supprimée par " + suppressedBy;
                return (
                <div key={f.id} style={{ padding: mob ? 12 : 18, background: isSupprimee ? C.bgAlt : C.surface, borderRadius: 14, border: "1px solid " + (isSupprimee ? C.border : isExpired ? C.yellow + "44" : C.borderLight) }}>
                  <div style={{ display: "flex", gap: mob ? 8 : 16, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: mob ? 14 : 16, fontWeight: 700, color: isSupprimee ? C.textSec : C.text }}>{f.titre}</span>
                        {f.status === "en_attente" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.yellowBg, color: C.yellowDark }}>⏳ En attente</span>}
                        {f.status === "refusee" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.pinkBg, color: C.pink }}>✕ Refusée</span>}
                        {f.status === "publiee" && !isExpired && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.greenBg, color: C.green }}>✓ Publiée</span>}
                        {isExpired && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.yellowBg, color: C.yellowDark }}>📅 Dates passées</span>}
                        {isSupprimee && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.pinkBg, color: C.pink }}>🗑️ Supprimée</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: C.textTer }}>
                        <span>{f.domaine}</span><span>·</span><span>{f.modalite}</span><span>·</span><span>{f.prix}€</span><span>·</span>{f.modalite === "E-learning" || (f.modalite || "").split(",").every(m => m.trim() === "E-learning") ? <span>📺 E-learning</span> : <span>{(f.sessions || []).length} session{(f.sessions || []).length > 1 ? "s" : ""}</span>}
                      </div>
                      {(f.prise_en_charge || []).length > 0 && !isSupprimee && <div style={{ display: "flex", gap: 3, marginTop: 4 }}>{f.prise_en_charge.map(p => <PriseTag key={p} label={p} />)}</div>}
                      {isSupprimee && suppressedLabel && (
                        <div style={{ marginTop: 6, fontSize: 11, color: C.pink, fontWeight: 600 }}>{suppressedLabel}</div>
                      )}
                      {isSupprimee && suppressedMsg && (
                        <div style={{ marginTop: 2, fontSize: 11, color: C.textSec, fontStyle: "italic" }}>« {suppressedMsg} »</div>
                      )}
                    </div>
                    {!isSupprimee && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <StarRow rating={Math.round(f.note)} />
                        <span style={{ fontSize: 12, color: C.textSec }}>{f.note}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {f.status === "publiee" && !isExpired && <Link href={`/formation/${f.id}`} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, textDecoration: "none", cursor: "pointer" }}>👁️ Voir</Link>}
                      {isExpired && <button onClick={() => openEdit(f)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🔄 Remettre sur le site</button>}
                      {!isSupprimee && <button onClick={() => openEdit(f)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, cursor: "pointer" }}>✏️ Modifier</button>}
                      {!isSupprimee && <button onClick={() => handleDelete(f.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>🗑</button>}
                      {isSupprimee && <button onClick={() => openEdit(f)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, cursor: "pointer" }}>🔄 Modifier & re-soumettre</button>}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
          </>}
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

          {/* Rechercher un formateur existant */}
          <div style={{ padding: mob ? 14 : 20, background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>🔍 Ajouter un·e formateur·rice existant·e</h3>
            <p style={{ fontSize: 12, color: C.textTer, marginBottom: 10 }}>Recherchez parmi les formateurs déjà présents sur PopForm pour éviter les doublons.</p>
            <input
              type="text"
              placeholder="Rechercher par nom…"
              value={fmtSearchQuery}
              onChange={e => handleSearchFormateurs(e.target.value)}
              style={{ width: "100%", padding: "9px 14px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 13, fontFamily: "inherit", outline: "none", background: C.surface, boxSizing: "border-box" as const }}
            />
            {fmtSearchLoading && <p style={{ fontSize: 12, color: C.textTer, marginTop: 8 }}>Recherche…</p>}
            {fmtSearchResults.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {fmtSearchResults.map(f => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.surface, borderRadius: 10, border: "1px solid " + C.borderLight }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, background: C.gradient, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700 }}>
                      {f.photo_url ? <img src={f.photo_url} alt={f.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (f.nom?.[0]?.toUpperCase() || "?")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{f.nom}</div>
                      {f.bio && <div style={{ fontSize: 11, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.bio.slice(0, 60)}{f.bio.length > 60 ? "…" : ""}</div>}
                    </div>
                    <button
                      onClick={() => handleAddExistingFormateur(f)}
                      style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                    >
                      + Ajouter
                    </button>
                  </div>
                ))}
              </div>
            )}
            {fmtSearchQuery.trim().length >= 2 && !fmtSearchLoading && fmtSearchResults.length === 0 && (
              <p style={{ fontSize: 12, color: C.textTer, marginTop: 8 }}>Aucun formateur trouvé — créez-en un nouveau ci-dessous.</p>
            )}
          </div>

          {/* Formulaire ajout/édition */}
          <div style={{ padding: mob ? 16 : 24, background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 }}>{editFmtId ? "Modifier le·la formateur·rice" : "Créer un·e nouveau·elle formateur·rice"}</h3>
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
            <div style={{ gridColumn: "1 / -1", height: 1, background: C.borderLight }} />

            {/* Sous-titre */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Sous-titre</label>
              <input value={form.sous_titre} onChange={e => setForm({ ...form, sous_titre: e.target.value })} placeholder="Ex: Approche fondée sur les preuves" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1", height: 1, background: C.borderLight }} />

            {/* Description */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Description *</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez la formation..." style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} />
            </div>
            <div style={{ gridColumn: "1 / -1", height: 1, background: C.borderLight }} />

            {/* Formateur */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Formateur(s) *</label>
              {formateurs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {formateurs.map(f => {
                    const isSelected = selFormateurIds.includes(f.id);
                    return (
                      <div key={f.id} onClick={() => setSelFormateurIds(prev => isSelected ? prev.filter(id => id !== f.id) : [...prev, f.id])}
                        style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px solid " + (isSelected ? C.accent + "55" : C.border), background: isSelected ? C.accentBg : C.bgAlt, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 16, background: C.gradient, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700 }}>
                          {f.photo_url ? <img src={f.photo_url} alt={f.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (f.nom?.[0]?.toUpperCase() || "?")}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? C.accent : C.text }}>{f.nom}</div>
                          <div style={{ fontSize: 11, color: C.textTer }}>{f.sexe === "Femme" ? "Formatrice" : f.sexe === "Homme" ? "Formateur" : "Formateur·rice"}</div>
                        </div>
                        <div style={{ width: 18, height: 18, borderRadius: 9, border: "2px solid " + (isSelected ? C.accent : C.border), background: isSelected ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", flexShrink: 0 }}>
                          {isSelected ? "✓" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Recherche formateur existant */}
              <div style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="🔍 Rechercher un·e formateur·rice existant·e…"
                  value={fmtSearchQuery}
                  onChange={e => handleSearchFormateurs(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 9, border: "1.5px solid " + C.border, fontSize: 12, fontFamily: "inherit", outline: "none", background: C.bgAlt, boxSizing: "border-box" as const }}
                />
                {fmtSearchResults.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, padding: 8, background: C.surface, borderRadius: 10, border: "1px solid " + C.borderLight }}>
                    {fmtSearchResults.map(f => (
                      <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: C.bgAlt }}>
                        <div style={{ width: 28, height: 28, borderRadius: 14, background: C.gradient, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700 }}>
                          {f.photo_url ? <img src={f.photo_url} alt={f.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (f.nom?.[0]?.toUpperCase() || "?")}
                        </div>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text }}>{f.nom}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleAddExistingFormateur(f);
                            setSelFormateurIds(prev => [...prev, f.id]);
                            setFmtSearchQuery("");
                            setFmtSearchResults([]);
                          }}
                          style={{ padding: "4px 10px", borderRadius: 7, border: "none", background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                        >
                          + Sélectionner
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => { setInlineNewFmt(!inlineNewFmt); setInlineFmt({ prenom: "", nom: "", sexe: "Non genré" }); setInlineFmtPhotoFile(null); }} style={{ padding: "8px 12px", borderRadius: 9, border: "1.5px dashed " + C.border, background: "transparent", color: C.textTer, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>+ Créer un·e formateur·rice</button>
              {inlineNewFmt && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, padding: 14, background: C.bgAlt, borderRadius: 10, border: "1px solid " + C.borderLight }}>
                  {/* Photo */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <label style={{ cursor: "pointer", flexShrink: 0 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 26, background: C.gradient, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", fontWeight: 700, border: "2px dashed " + C.border }}>
                        {inlineFmtPhotoFile
                          ? <img src={URL.createObjectURL(inlineFmtPhotoFile)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 20 }}>📷</span>}
                      </div>
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setInlineFmtPhotoFile(e.target.files[0]); }} />
                    </label>
                    <span style={{ fontSize: 11, color: C.textTer }}>Photo (optionnel)</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={inlineFmt.prenom} onChange={e => setInlineFmt({ ...inlineFmt, prenom: e.target.value })} placeholder="Prénom" style={{ ...inputStyle, flex: 1 }} />
                    <input value={inlineFmt.nom} onChange={e => setInlineFmt({ ...inlineFmt, nom: e.target.value })} placeholder="Nom *" style={{ ...inputStyle, flex: 1 }} />
                  </div>
                  <select value={inlineFmt.sexe} onChange={e => setInlineFmt({ ...inlineFmt, sexe: e.target.value })} style={inputStyle}>
                    <option value="Non genré">Formateur·rice</option>
                    <option value="Homme">Formateur</option>
                    <option value="Femme">Formatrice</option>
                  </select>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => { setInlineNewFmt(false); setInlineFmt({ prenom: "", nom: "", sexe: "Non genré" }); setInlineFmtPhotoFile(null); }} style={{ padding: "8px 12px", borderRadius: 9, border: "1.5px solid " + C.border, background: "transparent", color: C.textTer, fontSize: 12, cursor: "pointer" }}>Annuler</button>
                    <button type="button" onClick={async () => {
                      const fullName = [inlineFmt.prenom.trim(), inlineFmt.nom.trim()].filter(Boolean).join(" ");
                      if (!fullName || !organisme) return;
                      const sexeVal = inlineFmt.sexe === "Non genré" ? null : inlineFmt.sexe || null;
                      let photoUrl: string | null = null;
                      if (inlineFmtPhotoFile) { try { const { uploadImage } = await import("@/lib/upload"); photoUrl = await uploadImage(inlineFmtPhotoFile, "profils"); } catch {} }
                      const { data, error } = await supabase.from("formateurs").insert({ nom: fullName, organisme_id: organisme.id, bio: "", sexe: sexeVal, photo_url: photoUrl }).select().single();
                      if (error) { setMsg("Erreur création formateur : " + error.message); return; }
                      if (data) { setFormateurs(prev => [...prev, data]); setSelFormateurIds(prev => [...prev, data.id]); }
                      setInlineNewFmt(false); setInlineFmt({ prenom: "", nom: "", sexe: "Non genré" }); setInlineFmtPhotoFile(null);
                    }} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Créer et sélectionner</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1", height: 1, background: C.borderLight }} />
            {/* Domaine */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Domaine(s) *</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {domainesList.map(d => (
                  <button key={d.nom} type="button" onClick={() => {
                    const sel = form.domaines.includes(d.nom) ? form.domaines.filter(x => x !== d.nom) : [...form.domaines, d.nom];
                    setForm({ ...form, domaines: sel, domaine: sel[0] || "" });
                  }} style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + (form.domaines.includes(d.nom) ? C.accent + "55" : C.border), background: form.domaines.includes(d.nom) ? C.accentBg : C.bgAlt, color: form.domaines.includes(d.nom) ? C.accent : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: form.domaines.includes(d.nom) ? 700 : 400 }}>
                    {d.nom}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", height: 1, background: C.borderLight }} />
            {/* Modalité */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Modalité(s) *</label>
              <div style={{ display: "flex", gap: 8 }}>
                {MODALITES.map(m => {
                  const active = form.modalites.includes(m);
                  return (
                    <button key={m} type="button" onClick={() => {
                      const next = active ? form.modalites.filter((x: string) => x !== m) : [...form.modalites, m];
                      setForm({ ...form, modalites: next.length > 0 ? next : [m] });
                    }} style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid " + (active ? C.accent + "55" : C.border), background: active ? C.accentBg : C.bgAlt, color: active ? C.accent : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: active ? 700 : 400 }}>
                      {m}
                    </button>
                  );
                })}
              </div>
              {(form.modalites || []).includes("E-learning") && (
                <div style={{ marginTop: 10, padding: "10px 14px", background: "#EFF6FF", borderRadius: 10, border: "1px solid #BFDBFE", fontSize: 12, color: "#1D4ED8", lineHeight: 1.5 }}>
                  💡 Vous pouvez créer une formation e-learning avec des sessions (visio ou présentiel) ou séparer en deux formations distinctes.
                </div>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1", height: 1, background: C.borderLight }} />
            {/* Durée */}
            <div>
              <label style={labelStyle}>Durée</label>
              <input value={form.duree} onChange={e => setForm({ ...form, duree: e.target.value })} placeholder="Ex: 14h (2j)" style={inputStyle} />
            </div>

            {/* Prix */}
            <div>
              <label style={labelStyle}>Prix (€)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 9, border: "1.5px solid " + (form.prix === 0 ? "#16A34A55" : C.border), background: form.prix === 0 ? "#F0FDF4" : C.bgAlt, color: form.prix === 0 ? "#16A34A" : C.textSec, fontSize: 12, fontWeight: form.prix === 0 ? 700 : 400, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.prix === 0} onChange={e => setForm({ ...form, prix: e.target.checked ? 0 : null })} style={{ margin: 0 }} />
                  Gratuit
                </label>
                {form.prix !== 0 && <input type="number" min="0" value={form.prix ?? ""} onChange={e => setForm({ ...form, prix: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Ex: 450" style={{ ...inputStyle, flex: 1 }} />}
                {form.prix !== 0 && <button type="button" onClick={() => setForm({ ...form, prix_from: !form.prix_from })} style={{ padding: "8px 12px", borderRadius: 9, border: "1.5px solid " + (form.prix_from ? C.accent + "55" : C.border), background: form.prix_from ? C.accentBg : C.bgAlt, color: form.prix_from ? C.accent : C.textSec, fontSize: 12, fontWeight: form.prix_from ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>{form.prix_from ? "✓ " : ""}à partir de</button>}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", height: 1, background: C.borderLight }} />
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

            <div style={{ gridColumn: "1 / -1", height: 1, background: C.borderLight }} />
            {/* Mots-clés */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Mots-clés (max 4)</label>
              {(() => {
                const tags = form.mots_cles.split(",").map((s: string) => s.trim()).filter(Boolean);
                const canAdd = tags.length < 4;
                return (
                  <div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: tags.length ? 8 : 0 }}>
                      {tags.map((tag: string, i: number) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 99, background: C.accentBg, border: "1px solid " + C.accent + "44", color: C.accent, fontSize: 12, fontWeight: 600 }}>
                          {tag}
                          <button type="button" onClick={() => { const next = tags.filter((_: string, j: number) => j !== i); setForm({ ...form, mots_cles: next.join(", ") }); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.accent, fontSize: 12, padding: "0 2px", lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                    {canAdd && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={motsClesInput} onChange={e => setMotsClesInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); const v = motsClesInput.trim().replace(/,$/, ""); if (v && !tags.includes(v) && tags.length < 4) { setForm({ ...form, mots_cles: [...tags, v].join(", ") }); setMotsClesInput(""); } } }} placeholder={tags.length === 0 ? "Ex: aphasie, dyslexie…" : "Ajouter un mot-clé…"} style={{ ...inputStyle, flex: 1 }} />
                        <button type="button" onClick={() => { const v = motsClesInput.trim(); if (v && !tags.includes(v) && tags.length < 4) { setForm({ ...form, mots_cles: [...tags, v].join(", ") }); setMotsClesInput(""); } }} style={{ padding: "8px 14px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Ajouter</button>
                      </div>
                    )}
                    {!canAdd && <p style={{ fontSize: 11, color: C.textTer, marginTop: 4 }}>Maximum 4 mots-clés atteint.</p>}
                  </div>
                );
              })()}
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

            {/* Professions ciblées */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Professions ciblées</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PROFESSIONS_OPTS.map(p => (
                  <button key={p} onClick={() => setForm({ ...form, professions: form.professions.includes(p) ? form.professions.filter(x => x !== p) : [...form.professions, p] })}
                    style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + (form.professions.includes(p) ? C.green + "55" : C.border), background: form.professions.includes(p) ? C.greenBg : C.bgAlt, color: form.professions.includes(p) ? C.green : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: form.professions.includes(p) ? 700 : 400 }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", height: 1, background: C.borderLight }} />
            {/* Photo upload */}
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Photo de la formation</label>
              {/* Domain photo picker */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {DOMAIN_PHOTO_CHOICES.map(p => {
                  const isSelected = !formPhotoFile && form.photo_url === p.src;
                  return (
                    <button key={p.src} type="button" onClick={() => { setForm({ ...form, photo_url: p.src }); setFormPhotoFile(null); }}
                      title={p.label}
                      style={{ padding: 0, border: "2.5px solid " + (isSelected ? C.accent : C.borderLight), borderRadius: 8, cursor: "pointer", background: "none", overflow: "hidden", flexShrink: 0 }}>
                      <img src={p.src} alt={p.label} style={{ width: 68, height: 44, objectFit: "cover", display: "block" }} />
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.textSec, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                  📷 {formPhotoFile ? "✓ " + formPhotoFile.name.slice(0, 24) : "Importer une photo"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setFormPhotoFile(e.target.files[0]); }} />
                </label>
                {formPhotoFile && (
                  <>
                    <img src={URL.createObjectURL(formPhotoFile)} alt="" style={{ width: 80, height: 50, borderRadius: 8, objectFit: "cover" }} />
                    <button type="button" onClick={() => setFormPhotoFile(null)} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>✕ Annuler</button>
                  </>
                )}
                {form.photo_url && !formPhotoFile && !DOMAIN_PHOTO_CHOICES.some(p => p.src === form.photo_url) && (
                  <>
                    <img src={form.photo_url} alt="" style={{ width: 80, height: 50, borderRadius: 8, objectFit: "cover" }} />
                  </>
                )}
                {(formPhotoFile || form.photo_url) && (
                  <button type="button" onClick={() => { setForm({ ...form, photo_url: "" }); setFormPhotoFile(null); }} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>✕ Supprimer</button>
                )}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", height: 1, background: C.borderLight }} />
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

            {(form.modalites || []).includes("E-learning") && (
              <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                <label style={labelStyle}>📺 Lien E-learning</label>
                <input value={form.lien_elearning || ""} onChange={e => setForm({ ...form, lien_elearning: e.target.value })} placeholder="https://… (lien vers le contenu en ligne)" style={inputStyle} />
              </div>
            )}

          </div>

          {/* ===== SESSIONS ===== */}
          {form.modalites.includes("E-learning") && (
            <div style={{ marginTop: 24, padding: "14px 18px", background: C.accentBg, borderRadius: 12, border: "1.5px solid " + C.accent + "33" }}>
              <p style={{ fontSize: 13, color: C.accent, fontWeight: 600, margin: 0 }}>📺 E-learning — contenu accessible en autonomie à tout moment.</p>
              {form.modalites.length === 1 && <p style={{ fontSize: 12, color: C.textSec, marginTop: 4, marginBottom: 0 }}>Pas de session ni de date requise.</p>}
            </div>
          )}
          {form.modalites.some((m: string) => m === "Présentiel" || m === "Visio") && (
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
                                parts.push({ titre: n === 1 ? "" : "Partie " + (k + 1), jours: [], modalite: "Présentiel", lieu: "", adresse: "", ville: "", pays: "France", code_postal: "", lien_visio: "", date_debut: "", date_fin: "" });
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

                    {/* Organisme par session — seulement si 2+ orgs (soi-même + co-organismes) */}
                    {(() => {
                      const coOrgIds = (form.organisme_ids || []).filter((id: number) => id !== organisme?.id);
                      const coOrgLibres = form.organismes_libres || [];
                      const totalCoOrgs = coOrgIds.length + coOrgLibres.length;
                      if (totalCoOrgs < 1) return null;
                      const coOrgs = allOrganismes.filter(o => coOrgIds.includes(o.id));
                      const selfOrg = organisme ? [{ id: organisme.id, nom: organisme.nom }] : [];
                      const allSelOrgs = [...selfOrg, ...coOrgs];
                      return (
                        <div style={{ marginBottom: 14, padding: "12px 14px", background: C.surface, borderRadius: 10, border: "1px solid " + C.borderLight }}>
                          <label style={{ ...labelStyle, marginBottom: 8 }}>Organisme pour cette session (optionnel)</label>
                          <select value={s.organisme_id != null ? String(s.organisme_id) : (s.organisme_libre ? "__libre__:" + s.organisme_libre : "")}
                            onChange={e => {
                              const n = [...sessions];
                              if (e.target.value === "") { n[i].organisme_id = null; n[i].organisme_libre = ""; }
                              else if (e.target.value.startsWith("__libre__:")) { n[i].organisme_id = null; n[i].organisme_libre = e.target.value.slice(10); }
                              else { n[i].organisme_id = Number(e.target.value); n[i].organisme_libre = ""; }
                              setSessions(n);
                            }}
                            style={inputStyle}>
                            <option value="">— Aucun organisme —</option>
                            {allSelOrgs.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
                            {coOrgLibres.map((ol: string, li: number) => <option key={"libre_" + li} value={"__libre__:" + ol}>{ol}</option>)}
                          </select>
                          {(s.organisme_id != null || (s.organisme_libre !== undefined && s.organisme_libre !== "")) && (
                            <input value={s.url_inscription || ""} onChange={e => { const n = [...sessions]; n[i].url_inscription = e.target.value; setSessions(n); }}
                              placeholder="URL directe vers cette formation (optionnel)"
                              style={{ ...inputStyle, marginTop: 8, fontSize: 12 }} />
                          )}
                        </div>
                      );
                    })()}

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
                              {["Présentiel", "Visio"].map(m => (
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
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <div>
                                <label style={labelStyle}>Date de début *</label>
                                <input type="date" value={p.date_debut} min={today} onChange={e => { const n = [...sessions]; n[i].parties![pi].date_debut = e.target.value; n[i].parties![pi].jours = e.target.value ? [e.target.value] : []; setSessions(n); }} style={{ ...inputStyle, fontSize: 12 }} />
                              </div>
                              <div>
                                <label style={labelStyle}>Date de fin (si différent)</label>
                                <input type="date" value={p.date_fin} min={p.date_debut || today} onChange={e => { const n = [...sessions]; n[i].parties![pi].date_fin = e.target.value; setSessions(n); }} style={{ ...inputStyle, fontSize: 12 }} />
                              </div>
                            </div>
                            {p.date_debut && (
                              <div style={{ fontSize: 11, color: C.textSec, marginTop: 4, background: C.bgAlt, borderRadius: 7, padding: "4px 8px", display: "inline-block" }}>
                                📅 {p.date_debut}{p.date_fin && p.date_fin !== p.date_debut ? " → " + p.date_fin : ""}
                              </div>
                            )}
                          </div>
                          {p.modalite !== "Visio" && (
                            <div>
                              <label style={labelStyle}>Pays</label>
                              <select value={p.pays || "France"} onChange={e => {
                                const n = [...sessions];
                                n[i].parties![pi].pays = e.target.value;
                                n[i].parties![pi].ville = "";
                                n[i].parties![pi].lieu = "";
                                setSessions(n);
                              }} style={{ ...inputStyle, marginBottom: 8 }}>
                                <option value="France">France</option>
                                <option value="Belgique">Belgique</option>
                                <option value="Suisse">Suisse</option>
                                <option value="Monde">Monde (autre pays)</option>
                              </select>
                              <label style={labelStyle}>{p.pays === "Monde" ? "Pays (préciser)" : "Ville"}</label>
                              {p.pays === "Monde" ? (
                                <input value={p.ville} onChange={e => { const n = [...sessions]; n[i].parties![pi].ville = e.target.value; n[i].parties![pi].lieu = e.target.value; setSessions(n); }} placeholder="Ex: Allemagne, Espagne, Canada…" style={inputStyle} />
                              ) : (p.pays || "France") === "France" && adminVilles.length > 0 ? (
                                <>
                                  <select value={adminVilles.includes(p.ville) ? p.ville : (p.ville ? "__OTHER__" : "")} onChange={e => {
                                    const val = e.target.value;
                                    const n = [...sessions];
                                    if (val !== "__OTHER__") { n[i].parties![pi].ville = val; n[i].parties![pi].lieu = val; }
                                    else { n[i].parties![pi].ville = ""; n[i].parties![pi].lieu = ""; }
                                    setSessions(n);
                                  }} style={inputStyle}>
                                    <option value="">— Choisir une ville —</option>
                                    {(() => {
                                      const seen = new Set<string>();
                                      return Object.entries(REGIONS_CITIES).filter(([r]) => r !== "Belgique" && r !== "Suisse").flatMap(([region, cities]) => {
                                        const avail = cities.filter(c => adminVilles.includes(c));
                                        avail.forEach(c => seen.add(c));
                                        if (avail.length === 0) return [];
                                        return [<optgroup label={region} key={region}>{avail.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>];
                                      }).concat((() => {
                                        const other = adminVilles.filter(c => !seen.has(c));
                                        return other.length > 0 ? [<optgroup label="Autre" key="__other_group">{other.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>] : [];
                                      })());
                                    })()}
                                    <option value="__OTHER__">✏️ Autre ville...</option>
                                  </select>
                                  {(!adminVilles.includes(p.ville)) && (
                                    <input value={p.ville} onChange={e => { const n = [...sessions]; n[i].parties![pi].ville = e.target.value; n[i].parties![pi].lieu = e.target.value; setSessions(n); }} placeholder="Entrez la ville" style={{ ...inputStyle, marginTop: 8 }} />
                                  )}
                                </>
                              ) : (
                                <>
                                  <select value={(REGIONS_CITIES[p.pays || "France"] || []).includes(p.ville) ? p.ville : (p.ville ? "__OTHER__" : "")} onChange={e => {
                                    const val = e.target.value;
                                    const n = [...sessions];
                                    if (val !== "__OTHER__") { n[i].parties![pi].ville = val; n[i].parties![pi].lieu = val; }
                                    else { n[i].parties![pi].ville = ""; n[i].parties![pi].lieu = ""; }
                                    setSessions(n);
                                  }} style={inputStyle}>
                                    <option value="">— Choisir une ville —</option>
                                    {(REGIONS_CITIES[p.pays || "France"] || []).map(c => <option key={c} value={c}>{c}</option>)}
                                    <option value="__OTHER__">✏️ Autre ville…</option>
                                  </select>
                                  {(!(REGIONS_CITIES[p.pays || "France"] || []).includes(p.ville)) && (
                                    <input value={p.ville} onChange={e => { const n = [...sessions]; n[i].parties![pi].ville = e.target.value; n[i].parties![pi].lieu = e.target.value; setSessions(n); }} placeholder={p.pays === "Belgique" ? "Ex: Bruxelles" : "Ex: Genève"} style={{ ...inputStyle, marginTop: 8 }} />
                                  )}
                                </>
                              )}
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
              <button onClick={() => setSessions([...sessions, { dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "Présentiel", lien_visio: "", is_visio: false, nb_parties: 1, parties: [{ titre: "", jours: [], modalite: "Présentiel", lieu: "", adresse: "", ville: "", pays: "France", code_postal: "", lien_visio: "", date_debut: "", date_fin: "" }] }])} style={{ padding: "11px 22px", borderRadius: 10, border: "2px solid " + C.accent + "44", background: C.accentBg, color: C.accent, fontSize: 13, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6 }}>+ Ajouter une session</button>
            </div>
          </div>
          )}

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
          <button onClick={() => { setTab("list"); setWMsg(null); setEditWId(null); setWForm({ titre: "", description: "", date_heure: "", prix: 0, lien_url: "", professions: [], formateur_id: null }); setWebFmtSearch(""); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer", marginBottom: 16 }}>← Retour</button>
          <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>📡 Webinaires</h2>
          <p style={{ fontSize: 12, color: C.textTer, marginBottom: 16 }}>Vos webinaires sont publiés immédiatement.</p>

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
                    <button onClick={() => { setEditWId(w.id!); setWForm({ titre: w.titre, description: w.description, date_heure: w.date_heure, prix: w.prix, lien_url: w.lien_url, formateur_id: (w as any).formateur_id || null, professions: w.professions || [] }); setWebFmtSearch(allFormateursForWeb.find(f => f.id === (w as any).formateur_id)?.nom || ""); }} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, cursor: "pointer" }}>✏️</button>
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
                <input type="text" inputMode="numeric" value={wForm.prix === 0 ? "" : String(wForm.prix)} placeholder="0" onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ""); setWForm({ ...wForm, prix: v === "" ? 0 : Number(v) }); }} style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
              </div>
              <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Lien de connexion (Zoom, Teams…)</label>
                <input value={wForm.lien_url} onChange={e => setWForm({ ...wForm, lien_url: e.target.value })} placeholder="https://zoom.us/j/..." style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Destiné à</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Orthophonistes", "Kinésithérapeutes"].map(p => {
                    const sel = (wForm.professions || []).includes(p);
                    return <button key={p} type="button" onClick={() => setWForm({ ...wForm, professions: sel ? (wForm.professions || []).filter(x => x !== p) : [...(wForm.professions || []), p] })} style={{ padding: "7px 14px", borderRadius: 9, border: "1.5px solid " + (sel ? C.accent + "55" : C.border), background: sel ? C.accentBg : C.bgAlt, color: sel ? C.accent : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: sel ? 700 : 400 }}>{p === "Orthophonistes" ? "🗣️ " : "✋ "}{p}</button>;
                  })}
                </div>
              </div>
              <div style={{ gridColumn: mob ? "1" : "1 / -1", position: "relative" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4, textTransform: "uppercase" as const }}>Formateur (optionnel)</label>
                <div style={{ position: "relative" }}>
                  <input
                    value={webFmtSearch}
                    onChange={e => { setWebFmtSearch(e.target.value); setWebFmtDropdown(true); if (!e.target.value) setWForm({ ...wForm, formateur_id: null }); }}
                    onFocus={() => setWebFmtDropdown(true)}
                    placeholder="Rechercher un·e formateur·rice…"
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "inherit" }}
                  />
                  {webFmtDropdown && webFmtSearch.length >= 1 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: "1.5px solid " + C.border, borderRadius: 10, zIndex: 50, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", marginTop: 4 }}>
                      {allFormateursForWeb.filter(f => f.nom.toLowerCase().includes(webFmtSearch.toLowerCase())).slice(0, 10).map(f => (
                        <div key={f.id} onClick={() => { setWForm({ ...wForm, formateur_id: f.id }); setWebFmtSearch(f.nom); setWebFmtDropdown(false); }}
                          style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, color: C.text, borderBottom: "1px solid " + C.borderLight }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.bgAlt)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          {f.nom}
                        </div>
                      ))}
                      {allFormateursForWeb.filter(f => f.nom.toLowerCase().includes(webFmtSearch.toLowerCase())).length === 0 && (
                        <div onClick={async () => {
                          const nom = webFmtSearch.trim();
                          if (!nom) return;
                          const { data: newFmt } = await supabase.from("formateurs").insert({ nom, bio: "", sexe: "Non genré", organisme_id: organisme?.id || null }).select().single();
                          if (newFmt) { setAllFormateursForWeb(prev => [...prev, newFmt].sort((a, b) => a.nom.localeCompare(b.nom))); setWForm({ ...wForm, formateur_id: newFmt.id }); setWebFmtSearch(newFmt.nom); }
                          setWebFmtDropdown(false);
                        }} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, color: C.accent, fontWeight: 600 }}>
                          + Créer « {webFmtSearch} »
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {wForm.formateur_id && (
                  <button type="button" onClick={() => { setWForm({ ...wForm, formateur_id: null }); setWebFmtSearch(""); }} style={{ marginTop: 4, background: "none", border: "none", cursor: "pointer", color: C.textTer, fontSize: 11 }}>✕ Retirer le formateur</button>
                )}
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
                  const { data: wb } = await supabase.from("webinaires").insert({ ...wForm, organisme_id: organisme?.id, status: "publie" }).select().single();
                  if (wb) setWebinaires(prev => [...prev, wb]);
                }
                setWForm({ titre: "", description: "", date_heure: "", prix: 0, lien_url: "", professions: [], formateur_id: null }); setWebFmtSearch("");
                setWSaving(false); setWMsg("✅ Webinaire publié !");
                setTimeout(() => setWMsg(null), 3000);
              }} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: wSaving ? 0.5 : 1 }}>
                {wSaving ? "⏳ ..." : editWId ? "Enregistrer" : "💻 Créer le webinaire"}
              </button>
              {editWId && <button onClick={() => { setEditWId(null); setWForm({ titre: "", description: "", date_heure: "", prix: 0, lien_url: "", professions: [], formateur_id: null }); setWebFmtSearch(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 13, cursor: "pointer" }}>Annuler</button>}
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

      <FormationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleWizardSubmit}
        context={{
          mode: "organisme",
          domainesList,
          organismes: allOrganismes,
          formateurs: formateurs.map(f => ({ id: f.id, nom: f.nom })),
          adminVilles,
          initialData: undefined,
          initialSessions: undefined,
        }}
      />

      {/* ===== DOUBLON WARNING MODAL ===== */}
      {doublonWarning && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 18, padding: 28, maxWidth: 460, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 8 }}>Formation similaire existante</h3>
            <p style={{ fontSize: 13, color: C.textSec, marginBottom: 14, lineHeight: 1.5 }}>
              PopForm n&apos;accepte pas les doublons. Une formation avec un titre proche existe déjà dans votre espace :
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {doublonWarning.existing.map(e => (
                <div key={e.id} style={{ padding: "8px 12px", background: C.yellowBg, borderRadius: 9, border: "1px solid " + C.yellow + "44", fontSize: 13, fontWeight: 600, color: C.yellowDark }}>
                  📌 {e.titre}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: C.textTer, marginBottom: 16 }}>Si c&apos;est la même formation avec de nouvelles dates ou sessions, modifiez la formation existante plutôt que d&apos;en créer une nouvelle.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDoublonWarning(null)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 13, cursor: "pointer" }}>← Annuler</button>
              <button onClick={doublonWarning.proceed} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.yellowDark, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Créer quand même</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 18, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 8 }}>Supprimer cette formation ?</h3>
            <p style={{ fontSize: 13, color: C.textSec, marginBottom: 16 }}>Elle sera conservée dans l&apos;historique admin. Seul l&apos;admin peut la supprimer définitivement.</p>
            <label style={labelStyle}>Raison (optionnel)</label>
            <textarea
              value={deleteConfirm.message}
              onChange={e => setDeleteConfirm({ ...deleteConfirm, message: e.target.value })}
              placeholder="Ex: formation obsolète, dates passées…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 13, cursor: "pointer" }}>Annuler</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.pink, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🗑️ Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
