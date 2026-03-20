"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { C, fmtTitle, fetchDomainesAdmin, invalidateCache, REGIONS_CITIES, DOMAIN_PHOTO_CHOICES, isFormationPast, type Formation, type Formateur } from "@/lib/data";
import { StarRow, PriseTag } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase, notifyAdmin, fetchOrganismes, type Organisme } from "@/lib/supabase-data";

const MODALITES = ["Présentiel", "Visio", "E-learning"];
const PRISES = ["DPC", "FIF-PL"];

type SessionPartieRow = { titre: string; jours: string[]; date_debut: string; date_fin: string; modalite: string; lieu: string; adresse: string; ville: string; code_postal: string; lien_visio: string; ville_autre?: boolean };
type SessionRow = { id?: number; dates: string; lieu: string; adresse: string; ville: string; code_postal: string; modalite_session?: string; lien_visio?: string; date_debut?: string; date_fin_session?: string; is_visio?: boolean; nb_parties: number; parties: SessionPartieRow[]; organisme_id?: number | null; organisme_libre?: string; url_inscription?: string };
function emptyFormation() {
  return {
    titre: "", sous_titre: "", description: "", domaine: "", domaine_custom: "", domaines: [] as string[],
    modalites: ["Présentiel"] as string[],
    prise_en_charge: [] as string[], prise_aucune: false,
    duree: "", prix: null as number | null, prix_salarie: null as number | null,
    prix_liberal: null as number | null, prix_dpc: null as number | null, prix_from: false,
    is_new: false, populations: [] as string[], mots_cles: "",
    professions: ["Orthophonie"], effectif: null as number | null, video_url: "", url_inscription: "", photo_url: "" as string,
    organisme_id: null as number | null,
    organisme_ids: [] as number[],
    organismes_libres: [] as string[],
  };
}

export default function DashboardFormateurPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const mob = useIsMobile();
  const [formateur, setFormateur] = useState<Formateur | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [organismes, setOrganismes] = useState<Organisme[]>([]);
  const [domainesList, setDomainesList] = useState<{ nom: string; emoji: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "edit" | "profil">("list");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyFormation());
  const [sessions, setSessions] = useState<SessionRow[]>([{ dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "Présentiel", lien_visio: "", is_visio: false, nb_parties: 0, parties: [] }]);
  const [saving, setSaving] = useState(false);
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [extraPrix, setExtraPrix] = useState<{label: string; value: string}[]>([]);
  const [newPrixLabel, setNewPrixLabel] = useState("");
  const [newPrixValue, setNewPrixValue] = useState("");
  const [profilPhotoFile, setProfilPhotoFile] = useState<File | null>(null);
  const [fmtSiteUrl, setFmtSiteUrl] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [profilSaved, setProfilSaved] = useState(false);
  const [adminVilles, setAdminVilles] = useState<string[]>([]);
  const [originalForm, setOriginalForm] = useState<ReturnType<typeof emptyFormation> | null>(null);

  const [fmtPrenom, setFmtPrenom] = useState("");
  const [fmtNom, setFmtNom] = useState("");
  const [fmtBio, setFmtBio] = useState("");
  const [fmtSexe, setFmtSexe] = useState("Non genré");
  const [profilPhotoRemoved, setProfilPhotoRemoved] = useState(false);
  const [orphanFmts, setOrphanFmts] = useState<{ id: number; nom: string; count: number }[]>([]);
  const [merging, setMerging] = useState(false);
  const [orgLibreInput, setOrgLibreInput] = useState("");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const safetyTimer = setTimeout(() => setLoading(false), 12000);
    (async () => {
      try {
      const orgs = await fetchOrganismes();
      setOrganismes(orgs);
      
      // Load domaines from admin
      const domaines = await fetchDomainesAdmin();
      setDomainesList(domaines.map(d => ({ nom: d.nom, emoji: d.emoji })));
      
      const { data: existing } = await supabase.from("formateurs").select("*").eq("user_id", user.id);
      let fmt = existing?.[0] || null;
      if (!fmt) {
        const userName = profile?.full_name || user.email?.split("@")[0] || "Mon nom";
        // Try to find an unlinked formateur with the same name and claim it
        const { data: unlinked } = await supabase.from("formateurs").select("*").is("user_id", null);
        const match = unlinked?.find((f: any) => f.nom?.toLowerCase().trim() === userName?.toLowerCase().trim());
        if (match) {
          await supabase.from("formateurs").update({ user_id: user.id }).eq("id", match.id);
          fmt = { ...match, user_id: user.id };
        } else {
          const { data: newFmt } = await supabase.from("formateurs").insert({ nom: userName, bio: "", sexe: "Non genré", organisme_id: null, user_id: user.id }).select().single();
          fmt = newFmt;
        }
      }
      // Merge any unlinked records with the same name → reassign their formations
      if (fmt) {
        const { data: orphans } = await supabase.from("formateurs").select("id").is("user_id", null).ilike("nom", fmt.nom);
        for (const orphan of orphans || []) {
          if (orphan.id !== fmt.id) {
            await supabase.from("formations").update({ formateur_id: fmt.id }).eq("formateur_id", orphan.id);
            await supabase.from("formateurs").delete().eq("id", orphan.id);
          }
        }
      }
      setFormateur(fmt);
      if (fmt) {
        const parts = (fmt.nom || "").trim().split(" ");
        const nom = parts.pop() || "";
        const prenom = parts.join(" ");
        setFmtPrenom(prenom); setFmtNom(nom); setFmtBio(fmt.bio || ""); setFmtSexe(fmt.sexe || "Non genré"); setFmtSiteUrl((fmt as any).site_url || "");
        const { data: f } = await supabase.from("formations").select("*, prix_extras, domaines, sessions(*, session_parties(*))").eq("formateur_id", fmt.id).neq("status", "supprimee").order("date_ajout", { ascending: false });
        setFormations(f || []);
        // Fetch unlinked formateurs with formations (candidates for manual merge)
        const { data: unlinkedFmts } = await supabase.from("formateurs").select("id, nom").is("user_id", null);
        if (unlinkedFmts && unlinkedFmts.length > 0) {
          const orphansWithCounts: { id: number; nom: string; count: number }[] = [];
          for (const u of unlinkedFmts) {
            const { count } = await supabase.from("formations").select("id", { count: "exact", head: true }).eq("formateur_id", u.id);
            if (count && count > 0) orphansWithCounts.push({ id: u.id, nom: u.nom, count });
          }
          setOrphanFmts(orphansWithCounts);
        }
      }
      // Load admin villes
      supabase.from("villes_admin").select("nom").order("nom").then(({ data }: { data: { nom: string }[] | null }) => {
        if (data) setAdminVilles(data.map((v: { nom: string }) => v.nom));
      });
      } catch { /* timeout ou erreur réseau */ } finally { clearTimeout(safetyTimer); setLoading(false); }
    })();
    return () => clearTimeout(safetyTimer);
  }, [user, profile]);

  const openEdit = (f?: Formation) => {
    if (f) {
      setEditId(f.id);
      const rawModalite = f.modalite || "Présentiel";
      const loadedModalites = (f as any).modalites?.length > 0 ? (f as any).modalites : (rawModalite === "Mixte" ? ["Présentiel", "Visio"] : rawModalite.split(",").map((x: string) => x.trim()).filter(Boolean));
      const loadedForm = { titre: f.titre, sous_titre: f.sous_titre || "", description: f.description, domaine: f.domaine, domaine_custom: "", domaines: (f as any).domaines?.length > 0 ? (f as any).domaines : (f.domaine ? [f.domaine] : []), modalites: loadedModalites, prise_en_charge: f.prise_en_charge || [], prise_aucune: (f.prise_en_charge || []).length === 0, duree: f.duree, prix: f.prix, prix_salarie: f.prix_salarie, prix_liberal: f.prix_liberal, prix_dpc: f.prix_dpc, prix_from: ((f as any).prix_extras || []).some((e: any) => e.label === "__from__"), is_new: f.is_new, populations: f.populations || [], mots_cles: (f.mots_cles || []).join(", "), professions: f.professions || [], effectif: f.effectif, video_url: f.video_url || "", url_inscription: f.url_inscription || "", organisme_id: f.organisme_id,
organisme_ids: (f as any).organisme_ids || (f.organisme_id ? [f.organisme_id] : []),
organismes_libres: (f as any).organismes_libres || [],
photo_url: (f as any).photo_url || "" };
      setForm(loadedForm);
      setOriginalForm(loadedForm);
      setSessions((f.sessions || []).map(s => { const sp = (s as any).session_parties || []; return { id: s.id, dates: s.dates, lieu: s.lieu, adresse: s.adresse || "", ville: s.lieu || "", code_postal: s.code_postal || "", modalite_session: s.modalite_session || "Présentiel", lien_visio: s.lien_visio || "", is_visio: s.lieu === "Visio" || !!s.lien_visio, nb_parties: sp.length || 1, parties: sp.map((p: any) => ({ titre: p.titre || "", jours: p.jours ? p.jours.split(",").filter(Boolean) : (p.date_debut ? [p.date_debut] : []), date_debut: p.date_debut || "", date_fin: p.date_fin || "", modalite: p.modalite || "Présentiel", lieu: p.lieu || "", adresse: p.adresse || "", ville: p.ville || "", code_postal: "", lien_visio: p.lien_visio || "" })), organisme_id: (s as any).organisme_id || null, organisme_libre: (s as any).organisme_libre || "", url_inscription: (s as any).url_inscription || "" }; }));
      setExtraPrix(((f as any).prix_extras || []).filter((e: any) => e.label !== "__from__"));
    } else {
      setEditId(null);
      setForm(emptyFormation());
      setOriginalForm(null);
      setSessions([{ dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "Présentiel", lien_visio: "", is_visio: false, nb_parties: 0, parties: [] }]);
      setFormPhotoFile(null);
      setExtraPrix([]);
    }
    setNewPrixLabel(""); setNewPrixValue("");
    setMsg(null);
    setTab("edit");
  };

  const handleSave = async () => {
    if (!formateur) { setMsg("Erreur: profil formateur non trouvé."); return; }
    if (!form.titre.trim()) { setMsg("Le titre est obligatoire."); return; }
    if (!form.description.trim()) { setMsg("La description est obligatoire."); return; }
    if (!form.domaines.length) { setMsg("Le domaine est obligatoire."); return; }
    const hasPresentialOrVisio = form.modalites.some((m: string) => m === "Présentiel" || m === "Visio");
    const isELearning = !hasPresentialOrVisio;
    const hasDate = !hasPresentialOrVisio || sessions.every(s => (s.parties || []).some(p => p.date_debut));
    if (hasPresentialOrVisio && sessions.length > 0 && !hasDate) { setMsg("Chaque session doit avoir au moins une date."); return; }
    setSaving(true); setMsg(null);

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
      titre: form.titre.trim(), sous_titre: form.sous_titre.trim(), description: form.description.trim(),
      domaine: form.domaines[0] || form.domaine,
      domaines: form.domaines,
      modalite: computedModalite, modalites: form.modalites, prise_en_charge: form.prise_aucune ? [] : form.prise_en_charge,
      duree: form.duree || "7h", prix: form.prix ?? 0, prix_salarie: form.prix_salarie || null,
      prix_liberal: form.prix_liberal || null, prix_dpc: form.prix_dpc || null,
      is_new: true, populations: form.populations,
      mots_cles: form.mots_cles.split(",").map((s: string) => s.trim()).filter(Boolean),
      professions: form.professions.length ? form.professions : ["Orthophonie"],
      effectif: form.effectif || null, video_url: form.video_url, photo_url: form.photo_url || null,
      url_inscription: form.url_inscription || "",
      formateur_id: formateur.id,
      organisme_id: (form.organisme_ids || [])[0] || form.organisme_id || null,
      organisme_ids: form.organisme_ids || [],
      organismes_libres: form.organismes_libres || [],
      note: 0, nb_avis: 0, sans_limite: false, date_fin: null as string | null,
      date_ajout: new Date().toISOString().slice(0, 10), status: "en_attente",
    };

    let formationId = editId;

    // Upload photo si présente
    let formPhotoUrl2: string | null = form.photo_url || null;
    if (formPhotoFile) {
      try {
        const { uploadImage } = await import("@/lib/upload");
        const url2 = await uploadImage(formPhotoFile, "formations");
        if (url2) formPhotoUrl2 = url2;
      } catch (_) {
        setMsg("⚠️ Photo non uploadée (créez un bucket \"images\" dans Supabase Storage) — formation soumise sans photo.");
      }
    }
    if (formPhotoUrl2) payload.photo_url = formPhotoUrl2;

    if (editId) {
      // Modification: repasse en attente de validation
      const { error } = await supabase.from("formations").update({ ...payload, status: "en_attente" }).eq("id", editId);
      if (error) { setMsg("Erreur: " + error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("formations").insert(payload).select().single();
      if (error) { setMsg("Erreur: " + error.message); setSaving(false); return; }
      formationId = data.id;
    }

    if (formationId) {
      // Sauvegarder les IDs des anciennes sessions AVANT toute modification
      const oldSessionIds = sessions.filter(s => s.id != null).map(s => s.id as number);
      const validSessions = isELearning ? [] : sessions.filter(s => (s.parties && s.parties.length > 0) || (s.dates.trim() && (s.ville.trim() || s.lieu.trim() || (s.lien_visio || "").trim())));
      if (validSessions.length > 0) {
        // INSERT d'abord — si ça échoue, les anciennes sessions sont préservées
        const { data: insertedSessions, error: sessErr } = await supabase.from("sessions").insert(validSessions.map(s => ({
          formation_id: formationId,
          dates: s.parties && s.parties.length > 0
            ? s.parties.map((p, pi) => { const lbl = p.titre || ("Partie " + (pi+1)); const d = p.jours && p.jours.length > 0 ? (p.jours.length === 1 ? p.jours[0] : p.jours[0] + " → " + p.jours[p.jours.length-1]) : (p.date_debut || ""); return `${lbl}: ${d}`; }).join(" | ")
            : (s.date_debut ? (s.date_debut + (s.date_fin_session ? " → " + s.date_fin_session : "")) : s.dates.trim()),
          lieu: s.parties && s.parties.length > 0
            ? [...new Set(s.parties.map(p => p.modalite === "Visio" ? "Visio" : p.ville).filter(Boolean))].join(", ")
            : (s.is_visio ? "Visio" : (s.ville.trim() || s.lieu.trim())),
          adresse: s.parties && s.parties.length > 0
            ? s.parties.map(p => p.modalite === "Visio" ? (p.lien_visio || "Visio") : [p.adresse, p.ville, p.code_postal].filter(Boolean).join(", ")).join(" | ")
            : (s.is_visio ? ((s.lien_visio || "").trim()) : [s.adresse.trim(), s.ville.trim(), s.code_postal.trim()].filter(Boolean).join(", ")),
          modalite_session: s.modalite_session || null,
          lien_visio: s.lien_visio || null,
          code_postal: s.code_postal || null,
          organisme_id: s.organisme_id || null,
          organisme_libre: s.organisme_libre || null,
          url_inscription: s.url_inscription || null,
        }))).select();
        if (sessErr) { setMsg("Erreur lors de la sauvegarde des sessions : " + sessErr.message); setSaving(false); return; }
        if (insertedSessions) {
          for (let si = 0; si < validSessions.length; si++) {
            const parties = validSessions[si].parties || [];
            if (parties.length > 0 && insertedSessions[si]) {
              await supabase.from("session_parties").insert(
                parties.map(p => ({ session_id: insertedSessions[si].id, titre: p.titre, modalite: p.modalite, lieu: p.lieu || p.ville, adresse: [p.adresse, p.code_postal].filter(Boolean).join(", ") || null, ville: p.ville, lien_visio: p.lien_visio || null, date_debut: p.jours?.[0] || p.date_debut || null, date_fin: p.jours?.[p.jours.length-1] || p.date_fin || null, jours: (p.jours || []).join(",") || null }))
              );
            }
          }
          // Supprimer les ANCIENNES sessions seulement après que les nouvelles sont insérées avec succès
          if (oldSessionIds.length > 0) {
            await supabase.from("sessions").delete().in("id", oldSessionIds);
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

    const { data: f } = await supabase.from("formations").select("*, prix_extras, domaines, sessions(*, session_parties(*))").eq("formateur_id", formateur.id).neq("status", "supprimee").order("date_ajout", { ascending: false });
    setFormations(f || []);
    setSaving(false);
    // Email à l'admin pour nouvelle soumission (pas pour les modifications)
    if (!editId) {
      fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "new_formation", titre: payload.titre, formateur_nom: formateur.nom }) }).catch(() => {});
      // Détection de doublons : chercher si une formation du même formateur avec un titre similaire existe déjà
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u00e0-\u00ff]/g, " ").replace(/\s+/g, " ").trim();
      const { data: existingForms } = await supabase.from("formations").select("titre").eq("formateur_id", formateur.id).neq("status", "supprimee").neq("status", "refusee");
      if (existingForms) {
        const newNorm = norm(payload.titre);
        const duplicate = existingForms.find(ef => {
          const efNorm = norm(ef.titre);
          if (efNorm === newNorm) return true;
          // Vérifier si l'un contient l'autre (titre similaire)
          if (efNorm.length > 10 && newNorm.length > 10 && (efNorm.includes(newNorm) || newNorm.includes(efNorm))) return true;
          return false;
        });
        if (duplicate) {
          fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "duplicate_formation", titre: payload.titre, formateur_nom: formateur.nom, existing_titre: duplicate.titre }) }).catch(() => {});
        }
      }
    }
    setFormPhotoFile(null);
    setExtraPrix([]);
    setNewPrixLabel(""); setNewPrixValue("");
    setTab("list");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette formation ? Elle sera conservée dans l'historique admin.")) return;
    const { error } = await supabase.from("formations").update({ status: "supprimee", supprime_par: "formateur" } as any).eq("id", id);
    if (error) { alert("Erreur suppression : " + error.message + "\n\nVérifiez les droits RLS dans Supabase."); return; }
    setFormations(prev => prev.filter(f => f.id !== id));
    invalidateCache();
  };

  const handleSaveProfil = async () => {
    if (!formateur) return;
    setSaving(true); setMsg(null);
    const fullName = [fmtPrenom.trim(), fmtNom.trim()].filter(Boolean).join(" ") || fmtNom.trim();
    let photoUrl: string | null = profilPhotoRemoved ? null : ((formateur as any).photo_url || null);
    if (profilPhotoFile) {
      try {
        const { uploadImage } = await import("@/lib/upload");
        photoUrl = await uploadImage(profilPhotoFile, "profils");
        setProfilPhotoFile(null);
      } catch (e: any) { setMsg("Erreur photo: " + e.message); setSaving(false); return; }
    }
    const { error } = await supabase.from("formateurs").update({ nom: fullName, bio: fmtBio, sexe: fmtSexe, photo_url: photoUrl, site_url: fmtSiteUrl || null }).eq("id", formateur.id);
    if (error) { setMsg("Erreur: " + error.message); setSaving(false); return; }
    setFormateur({ ...formateur, nom: fullName, bio: fmtBio, sexe: fmtSexe, photo_url: photoUrl } as any);
    setProfilPhotoRemoved(false);
    invalidateCache();
    setSaving(false); setProfilSaved(true); setMsg("✅ Profil enregistré !");
    setTimeout(() => { setMsg(null); setProfilSaved(false); }, 3000);
  };

  const handleMerge = async (orphanId: number) => {
    if (!formateur) return;
    if (!confirm("Fusionner ce profil avec le vôtre ? Toutes ses formations vous seront attribuées et l'ancien profil sera supprimé.")) return;
    setMerging(true);
    await supabase.from("formations").update({ formateur_id: formateur.id }).eq("formateur_id", orphanId);
    await supabase.from("formateurs").delete().eq("id", orphanId);
    setOrphanFmts(prev => prev.filter(o => o.id !== orphanId));
    const { data: f } = await supabase.from("formations").select("*, prix_extras, domaines, sessions(*, session_parties(*))").eq("formateur_id", formateur.id).neq("status", "supprimee").order("date_ajout", { ascending: false });
    setFormations(f || []);
    invalidateCache();
    setMerging(false);
  };

  if (authLoading || loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  if (!user) { if (typeof window !== "undefined") window.location.href = "/"; return null; }

  const px = mob ? "0 16px" : "0 40px";
  const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" };
  const published = formations.filter(f => f.status === "publiee").length;
  const pending = formations.filter(f => f.status === "en_attente").length;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: px }}>
      <div style={{ padding: "18px 0 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
          <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>🎤 Dashboard {fmtTitle(formateur)}</h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {tab === "list" && (
            <>
              <button onClick={() => setTab("profil")} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✏️ Mon profil</button>
              <button onClick={() => openEdit()} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nouvelle formation</button>
            </>
          )}
        </div>
      </div>

      {/* ===== CONTACT ===== */}
      <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(212,43,43,0.04)", borderRadius: 10, border: "1px solid " + C.borderLight, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16 }}>💬</span>
        <span style={{ fontSize: 13, color: C.textSec }}>Une question ? Écrivez-nous à <a href="mailto:contact@popform.fr" style={{ color: C.accent, fontWeight: 700, textDecoration: "none" }}>contact@popform.fr</a></span>
      </div>

      {tab === "list" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Formations", value: formations.length, icon: "🎬" },
              { label: "Publiées", value: published, icon: "✅" },
              { label: "En attente", value: pending, icon: "⏳" },
              { label: "Note moyenne", value: (() => { const rated = formations.filter(f => f.nb_avis > 0); return rated.length ? (rated.reduce((s, f) => s + f.note, 0) / rated.length).toFixed(1) : "—"; })(), icon: "⭐" },
            ].map(s => (
              <div key={s.label} style={{ padding: mob ? 12 : 16, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontSize: mob ? 20 : 24, fontWeight: 800, color: C.text }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.textTer }}>{s.label}</div>
              </div>
            ))}
          </div>
          {formations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textTer }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎤</div>
              <p>Aucune formation. Proposez votre première !</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 40 }}>
              {formations.map(f => {
                const past = f.status === "publiee" && isFormationPast(f);
                return (
                <div key={f.id} style={{ padding: mob ? 12 : 18, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, display: "flex", gap: mob ? 8 : 16, alignItems: "center", flexWrap: "wrap", opacity: past ? 0.5 : 1 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: mob ? 14 : 16, fontWeight: 700, color: C.text }}>{f.titre}</span>
                      {f.status === "en_attente" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.yellowBg, color: C.yellowDark }}>⏳ En attente</span>}
                      {f.status === "refusee" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.pinkBg, color: C.pink }}>✕ Refusée</span>}
                      {f.status === "publiee" && !past && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.greenBg, color: C.green }}>✓ Publiée</span>}
                      {past && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.borderLight, color: C.textTer }}>📅 Dates passées</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: C.textTer }}>
                      <span>{f.domaine}</span><span>·</span><span>{f.modalite}</span><span>·</span><span>{f.prix}€</span><span>·</span>{f.modalite === "E-learning" || (f.modalite || "").split(",").every(m => m.trim() === "E-learning") ? <span>📺 E-learning</span> : <span>{(f.sessions || []).length} session{(f.sessions || []).length > 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {f.status === "publiee" && !past && <Link href={`/formation/${f.id}`} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, textDecoration: "none" }}>👁️ Voir</Link>}
                    <button onClick={() => openEdit(f)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, cursor: "pointer" }}>✏️</button>
                    <button onClick={() => handleDelete(f.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "profil" && (
        <div style={{ maxWidth: 500, paddingBottom: 40 }}>
          <button onClick={() => setTab("list")} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer", marginBottom: 16 }}>← Retour</button>
          <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text, marginBottom: 16 }}>Mon profil formateur</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Photo de profil</label>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <label style={{ cursor: "pointer" }}>
                  <div style={{ width: 80, height: 80, borderRadius: 40, background: (!profilPhotoRemoved && (profilPhotoFile || (formateur as any)?.photo_url)) ? "transparent" : C.bgAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: C.textTer, fontWeight: 700, overflow: "hidden", border: "2px dashed " + C.border }}>
                    {profilPhotoFile && !profilPhotoRemoved ? (
                      <img src={URL.createObjectURL(profilPhotoFile)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (!profilPhotoRemoved && (formateur as any)?.photo_url) ? (
                      <img src={(formateur as any).photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 26, fontWeight: 800, color: C.textSec }}>{(fmtPrenom || fmtNom)?.[0]?.toUpperCase() || "?"}</span>
                    )}
                  </div>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) { setProfilPhotoFile(e.target.files[0]); setProfilPhotoRemoved(false); } }} />
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12, color: C.textTer }}>Cliquez sur l&apos;avatar pour changer la photo</span>
                  {(!profilPhotoRemoved && ((formateur as any)?.photo_url || profilPhotoFile)) && (
                    <button type="button" onClick={() => { setProfilPhotoRemoved(true); setProfilPhotoFile(null); }} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>✕ Supprimer la photo</button>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={labelStyle}>Prénom</label><input value={fmtPrenom} onChange={e => setFmtPrenom(e.target.value)} placeholder="Ex: Marie" style={inputStyle} /></div>
              <div><label style={labelStyle}>Nom *</label><input value={fmtNom} onChange={e => setFmtNom(e.target.value)} placeholder="Ex: Lefort" style={inputStyle} /></div>
            </div>
            <div><label style={labelStyle}>Biographie</label><textarea value={fmtBio} onChange={e => setFmtBio(e.target.value)} style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} /></div>
            <div>
              <label style={labelStyle}>Genre</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ v: "Homme", l: "Formateur" }, { v: "Femme", l: "Formatrice" }, { v: "Non genré", l: "Formateur·rice" }].map(g => (
                  <button key={g.v} onClick={() => setFmtSexe(g.v)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1.5px solid " + (fmtSexe === g.v ? C.accent + "55" : C.border), background: fmtSexe === g.v ? C.accentBg : C.bgAlt, color: fmtSexe === g.v ? C.accent : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: fmtSexe === g.v ? 700 : 400 }}>{g.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Site web</label>
              <input value={fmtSiteUrl} onChange={e => setFmtSiteUrl(e.target.value)} placeholder="https://monsite.fr" style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={handleSaveProfil} disabled={saving} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: profilSaved ? C.green : C.gradient, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.5 : 1, transition: "background 0.3s" }}>
                {saving ? "⏳ ..." : profilSaved ? "✅ Enregistré !" : "Enregistrer"}
              </button>
              {msg && <span style={{ fontSize: 13, color: C.green }}>{msg}</span>}
            </div>
          </div>
          {orphanFmts.length > 0 && (
            <div style={{ marginTop: 28, padding: "16px 18px", background: C.accentBg, borderRadius: 14, border: "1.5px solid " + C.accent + "33" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: C.accent, marginBottom: 4 }}>🔗 Fusionner avec un profil existant</h3>
              <p style={{ fontSize: 12, color: C.textSec, marginBottom: 12, lineHeight: 1.5 }}>Des formations sont associées à d&apos;anciens profils non liés à un compte. Vous pouvez les fusionner avec votre profil pour les récupérer.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {orphanFmts.map(o => (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: C.surface, borderRadius: 10, border: "1px solid " + C.borderLight, gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{o.nom}</div>
                      <div style={{ fontSize: 11, color: C.textTer }}>{o.count} formation{o.count > 1 ? "s" : ""}</div>
                    </div>
                    <button onClick={() => handleMerge(o.id)} disabled={merging} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: merging ? 0.5 : 1, whiteSpace: "nowrap" }}>
                      {merging ? "⏳..." : "Fusionner →"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "edit" && (
        <div style={{ paddingBottom: 40 }}>
          <button onClick={() => { setTab("list"); setMsg(null); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer", marginBottom: 16 }}>← Retour à la liste</button>
          <h2 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>{editId ? "Modifier la formation" : "Proposer une formation"}</h2>
          <p style={{ fontSize: 12, color: C.textTer, marginBottom: 16 }}>⏳ Votre formation sera soumise à validation avant publication.</p>

          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}><label style={labelStyle}>Titre *</label><input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} style={inputStyle} /></div>
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}><label style={labelStyle}>Sous-titre</label><input value={form.sous_titre} onChange={e => setForm({ ...form, sous_titre: e.target.value })} style={inputStyle} /></div>
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}><label style={labelStyle}>Description *</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} /></div>

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
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
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
            </div>
            <div><label style={labelStyle}>Durée</label><input value={form.duree} onChange={e => setForm({ ...form, duree: e.target.value })} placeholder="Ex: 14h (2j)" style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>Prix (€)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="number" value={form.prix ?? ""} onChange={e => setForm({ ...form, prix: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Ex: 450" style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={() => setForm({ ...form, prix_from: !form.prix_from })} style={{ padding: "8px 12px", borderRadius: 9, border: "1.5px solid " + (form.prix_from ? C.accent + "55" : C.border), background: form.prix_from ? C.accentBg : C.bgAlt, color: form.prix_from ? C.accent : C.textSec, fontSize: 12, fontWeight: form.prix_from ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>{form.prix_from ? "✓ " : ""}à partir de</button>
              </div>
            </div>

            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Prise en charge</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setForm({ ...form, prise_aucune: !form.prise_aucune, prise_en_charge: [] })}
                  style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px solid " + (form.prise_aucune ? C.textTer + "88" : C.border), background: form.prise_aucune ? "#F5F5F5" : C.bgAlt, color: C.textSec, fontSize: 12, cursor: "pointer", fontWeight: form.prise_aucune ? 700 : 400 }}>Aucune</button>
                {!form.prise_aucune && PRISES.map(p => (
                  <button key={p} onClick={() => setForm({ ...form, prise_en_charge: form.prise_en_charge.includes(p) ? form.prise_en_charge.filter(x => x !== p) : [...form.prise_en_charge, p] })}
                    style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px solid " + (form.prise_en_charge.includes(p) ? C.accent + "55" : C.border), background: form.prise_en_charge.includes(p) ? C.accentBg : C.bgAlt, color: form.prise_en_charge.includes(p) ? C.accent : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: form.prise_en_charge.includes(p) ? 700 : 400 }}>{p}</button>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}><label style={labelStyle}>Mots-clés (virgules)</label><input value={form.mots_cles} onChange={e => setForm({ ...form, mots_cles: e.target.value })} placeholder="Ex: aphasie, dyslexie, tdl" style={inputStyle} /></div>

            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
              <label style={labelStyle}>Populations</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Nourrisson/bébé", "Enfant", "Adolescent", "Adulte", "Senior"].map(p => (
                  <button key={p} onClick={() => setForm({ ...form, populations: form.populations.includes(p) ? form.populations.filter(x => x !== p) : [...form.populations, p] })}
                    style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + (form.populations.includes(p) ? C.blue + "55" : C.border), background: form.populations.includes(p) ? C.blueBg : C.bgAlt, color: form.populations.includes(p) ? C.blue : C.textSec, fontSize: 12, cursor: "pointer", fontWeight: form.populations.includes(p) ? 700 : 400 }}>{p}</button>
                ))}
              </div>
            </div>

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
                {formPhotoFile
                  ? <img src={URL.createObjectURL(formPhotoFile)} alt="" style={{ width: 80, height: 50, borderRadius: 8, objectFit: "cover" }} />
                  : (!DOMAIN_PHOTO_CHOICES.some(p => p.src === form.photo_url) && form.photo_url) ? <img src={form.photo_url} alt="" style={{ width: 80, height: 50, borderRadius: 8, objectFit: "cover" }} /> : null}
                {(form.photo_url || formPhotoFile) && <button type="button" onClick={() => { setForm({ ...form, photo_url: "" }); setFormPhotoFile(null); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 12, cursor: "pointer" }}>✕ Supprimer</button>}
              </div>
            </div>

            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}><label style={labelStyle}>URL vidéo (YouTube)</label><input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} style={inputStyle} /></div>
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}><label style={labelStyle}>URL d&apos;inscription</label><input value={form.url_inscription || ""} onChange={e => setForm({ ...form, url_inscription: e.target.value })} placeholder="https://monsite.fr/inscription" style={inputStyle} /></div>

            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
  <label style={labelStyle}>Organismes rattachés (optionnel)</label>
  <p style={{ fontSize: 11, color: C.textTer, margin: "0 0 8px" }}>La formation sera visible dans le(s) espace(s) organisme(s) sélectionné(s).</p>
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
    {organismes.map(o => {
      const selected = (form.organisme_ids || []).includes(o.id);
      return (
        <button key={o.id} type="button" onClick={() => {
          const ids = form.organisme_ids || [];
          setForm({ ...form, organisme_ids: selected ? ids.filter(id => id !== o.id) : [...ids, o.id] });
        }} style={{ padding: "5px 12px", borderRadius: 20, border: "1.5px solid " + (selected ? C.accent : C.border), background: selected ? C.accentBg : C.surface, color: selected ? C.accent : C.textSec, fontSize: 12, fontWeight: selected ? 700 : 400, cursor: "pointer" }}>
          {selected ? "✓ " : ""}{o.nom}
        </button>
      );
    })}
  </div>
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
    {(form.organismes_libres || []).map((ol, i) => (
      <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: C.yellowBg, border: "1.5px solid " + C.yellowDark + "33", fontSize: 12, color: C.yellowDark, fontWeight: 600 }}>
        🏢 {ol}
        <button type="button" onClick={() => setForm({ ...form, organismes_libres: (form.organismes_libres || []).filter((_, j) => j !== i) })} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSec, fontSize: 14, padding: "0 2px", lineHeight: 1 }}>×</button>
      </span>
    ))}
  </div>
  <div style={{ display: "flex", gap: 6 }}>
    <input value={orgLibreInput} onChange={e => setOrgLibreInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (orgLibreInput.trim()) { setForm({ ...form, organismes_libres: [...(form.organismes_libres || []), orgLibreInput.trim()] }); setOrgLibreInput(""); } } }} placeholder="Ajouter un organisme non répertorié..." style={{ ...inputStyle, flex: 1 }} />
    <button type="button" onClick={() => { if (orgLibreInput.trim()) { setForm({ ...form, organismes_libres: [...(form.organismes_libres || []), orgLibreInput.trim()] }); setOrgLibreInput(""); } }} style={{ padding: "0 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 13, cursor: "pointer" }}>+ Ajouter</button>
  </div>
</div>
          </div>

          {/* ===== SESSIONS STRUCTURÉES ===== */}
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
                        <button onClick={() => { const copy = JSON.parse(JSON.stringify(sessions[i])); delete (copy as any).id; setSessions([...sessions.slice(0, i + 1), copy, ...sessions.slice(i + 1)]); }} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, cursor: "pointer" }}>⧉ Dupliquer</button>
                        {sessions.length > 1 && <button onClick={() => setSessions(sessions.filter((_, j) => j !== i))} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>✕ Supprimer</button>}
                      </div>
                    </div>
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
                                parts.push({ titre: n === 1 ? "" : "Partie " + (k + 1), jours: [], date_debut: "", date_fin: "", modalite: "Présentiel", lieu: "", adresse: "", ville: "", code_postal: "", lien_visio: "" });
                              }
                            } else { parts.splice(n); }
                            nSessions[i].parties = parts;
                            setSessions(nSessions);
                          }} style={{ width: 40, height: 40, borderRadius: 10, border: "2px solid " + (s.nb_parties === n ? C.accent : C.border), background: s.nb_parties === n ? C.accentBg : C.surface, color: s.nb_parties === n ? C.accent : C.textSec, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{n}</button>
                        ))}
                      </div>
                    </div>
                    {(s.parties || []).slice(0, s.nb_parties).map((p, pi) => (
                      <div key={pi} style={{ marginBottom: 10, padding: "12px 14px", background: C.surface, borderRadius: 10, border: "1.5px solid " + (s.nb_parties > 1 ? C.accent + "33" : C.borderLight) }}>
                        {s.nb_parties > 1 && <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" as const }}>Partie {pi + 1}</div>}
                        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 8 }}>
                          {s.nb_parties > 1 && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={labelStyle}>Titre</label>
                              <input value={p.titre} onChange={e => { const n = [...sessions]; n[i].parties[pi].titre = e.target.value; setSessions(n); }} placeholder="ex: Journée théorique" style={{ ...inputStyle, fontSize: 12 }} />
                            </div>
                          )}
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Modalité</label>
                            <div style={{ display: "flex", gap: 6 }}>
                              {["Présentiel", "Visio"].map(m => (
                                <button key={m} type="button" onClick={() => {
                                  const n = [...sessions];
                                  n[i].parties[pi].modalite = m;
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
                                <input type="date" value={p.date_debut} min={today} onChange={e => { const n = [...sessions]; n[i].parties[pi].date_debut = e.target.value; n[i].parties[pi].jours = e.target.value ? [e.target.value] : []; setSessions(n); }} style={{ ...inputStyle, fontSize: 12 }} />
                              </div>
                              <div>
                                <label style={labelStyle}>Date de fin (si différent)</label>
                                <input type="date" value={p.date_fin} min={p.date_debut || today} onChange={e => { const n = [...sessions]; n[i].parties[pi].date_fin = e.target.value; setSessions(n); }} style={{ ...inputStyle, fontSize: 12 }} />
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
                              <label style={labelStyle}>Ville</label>
                              {adminVilles.length > 0 ? (
                                <>
                                  <select value={adminVilles.includes(p.ville) ? p.ville : (p.ville_autre || (p.ville && !adminVilles.includes(p.ville)) ? "__OTHER__" : "")} onChange={e => {
                                    const val = e.target.value;
                                    const n = [...sessions];
                                    if (val !== "__OTHER__") { n[i].parties[pi].ville = val; n[i].parties[pi].lieu = val; n[i].parties[pi].ville_autre = false; }
                                    else { n[i].parties[pi].ville_autre = true; }
                                    setSessions(n);
                                  }} style={inputStyle}>
                                    <option value="">— Choisir une ville —</option>
                                    {(() => {
                                      const seen = new Set<string>();
                                      return Object.entries(REGIONS_CITIES).flatMap(([region, cities]) => {
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
                                  {(p.ville_autre || (p.ville && !adminVilles.includes(p.ville))) && (
                                    <input value={p.ville_autre ? (adminVilles.includes(p.ville) ? "" : p.ville) : p.ville} onChange={e => { const n = [...sessions]; n[i].parties[pi].ville = e.target.value; n[i].parties[pi].lieu = e.target.value; setSessions(n); }} placeholder="Entrez la ville" style={{ ...inputStyle, marginTop: 8 }} autoFocus />
                                  )}
                                </>
                              ) : (
                                <input value={p.ville} onChange={e => { const n = [...sessions]; n[i].parties[pi].ville = e.target.value; n[i].parties[pi].lieu = e.target.value; setSessions(n); }} placeholder="Ex: Paris" style={inputStyle} />
                              )}
                            </div>
                          )}
                          {p.modalite !== "Présentiel" && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={labelStyle}>Lien visio</label>
                              <input value={p.lien_visio} onChange={e => { const n = [...sessions]; n[i].parties[pi].lien_visio = e.target.value; setSessions(n); }} placeholder="https://zoom.us/j/..." style={inputStyle} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Organisme par session */}
                    <div style={{ marginTop: 12, padding: "12px 14px", background: C.surface, borderRadius: 10, border: "1px solid " + C.borderLight }}>
                      <label style={{ ...labelStyle, marginBottom: 8 }}>Organisme pour cette session (optionnel)</label>
                      <select value={s.organisme_id != null ? String(s.organisme_id) : (s.organisme_libre ? "__libre__" : "")}
                        onChange={e => {
                          const n = [...sessions];
                          if (e.target.value === "") { n[i].organisme_id = null; n[i].organisme_libre = ""; }
                          else if (e.target.value === "__libre__") { n[i].organisme_id = null; n[i].organisme_libre = n[i].organisme_libre || " "; }
                          else { n[i].organisme_id = Number(e.target.value); n[i].organisme_libre = ""; }
                          setSessions(n);
                        }}
                        style={inputStyle}>
                        <option value="">— Aucun organisme —</option>
                        {organismes.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
                        <option value="__libre__">✏️ Autre (nom libre)…</option>
                      </select>
                      {s.organisme_id == null && s.organisme_libre !== undefined && s.organisme_libre !== "" && (
                        <input value={s.organisme_libre} onChange={e => { const n = [...sessions]; n[i].organisme_libre = e.target.value; setSessions(n); }}
                          placeholder="Nom de l'organisme (non référencé sur PopForm)"
                          style={{ ...inputStyle, marginTop: 8, fontSize: 12 }} />
                      )}
                      {(s.organisme_id != null || (s.organisme_libre !== undefined && s.organisme_libre !== "")) && (
                        <input value={s.url_inscription || ""} onChange={e => { const n = [...sessions]; n[i].url_inscription = e.target.value; setSessions(n); }}
                          placeholder="URL directe vers cette formation (optionnel)"
                          style={{ ...inputStyle, marginTop: 8, fontSize: 12 }} />
                      )}
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setSessions([...sessions, { dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "Présentiel", lien_visio: "", is_visio: false, nb_parties: 1, parties: [{ titre: "", jours: [], date_debut: "", date_fin: "", modalite: "Présentiel", lieu: "", adresse: "", ville: "", code_postal: "", lien_visio: "" }] }])} style={{ padding: "11px 22px", borderRadius: 10, border: "2px solid " + C.accent + "44", background: C.accentBg, color: C.accent, fontSize: 13, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6 }}>＋ Ajouter une session</button>
            </div>
          </div>
          )}

                    {msg && <p style={{ color: C.pink, fontSize: 13, marginTop: 14, textAlign: "center" }}>{msg}</p>}

          {/* ── Résumé des modifications ── */}
          {editId && originalForm && (() => {
            const LABELS: Record<string, string> = { titre: "Titre", sous_titre: "Sous-titre", description: "Description", duree: "Durée", prix: "Prix", prix_salarie: "Prix salarié", prix_liberal: "Prix libéral", url_inscription: "URL inscription", video_url: "Vidéo", mots_cles: "Mots-clés" };
            const changes: { label: string; from: string; to: string }[] = [];
            (Object.keys(LABELS) as (keyof typeof LABELS)[]).forEach(k => {
              const orig = String((originalForm as any)[k] ?? "");
              const curr = String((form as any)[k] ?? "");
              if (orig !== curr) changes.push({ label: LABELS[k], from: orig.slice(0, 50) || "—", to: curr.slice(0, 50) || "—" });
            });
            if (JSON.stringify(originalForm.domaines) !== JSON.stringify(form.domaines)) changes.push({ label: "Domaine(s)", from: (originalForm.domaines || []).join(", ") || "—", to: (form.domaines || []).join(", ") || "—" });
            if (JSON.stringify(originalForm.modalites) !== JSON.stringify(form.modalites)) changes.push({ label: "Modalité(s)", from: (originalForm.modalites || []).join(", ") || "—", to: (form.modalites || []).join(", ") || "—" });
            if (JSON.stringify(originalForm.populations) !== JSON.stringify(form.populations)) changes.push({ label: "Populations", from: (originalForm.populations || []).join(", ") || "—", to: (form.populations || []).join(", ") || "—" });
            if (JSON.stringify(originalForm.prise_en_charge) !== JSON.stringify(form.prise_en_charge)) changes.push({ label: "Prise en charge", from: (originalForm.prise_en_charge || []).join(", ") || "—", to: (form.prise_en_charge || []).join(", ") || "—" });
            if (originalForm.organisme_id !== form.organisme_id) {
              const fromOrg = organismes.find(o => o.id === originalForm.organisme_id)?.nom || "Aucun";
              const toOrg = organismes.find(o => o.id === form.organisme_id)?.nom || "Aucun";
              changes.push({ label: "Organisme", from: fromOrg, to: toOrg });
            }
            if (JSON.stringify(originalForm.organisme_ids) !== JSON.stringify(form.organisme_ids)) {
              const fromOrgs = (originalForm.organisme_ids || []).map((id: number) => organismes.find(o => o.id === id)?.nom || id).join(", ") || "Aucun";
              const toOrgs = (form.organisme_ids || []).map((id: number) => organismes.find(o => o.id === id)?.nom || id).join(", ") || "Aucun";
              changes.push({ label: "Organismes", from: fromOrgs, to: toOrgs });
            }
            if (JSON.stringify(originalForm.organismes_libres) !== JSON.stringify(form.organismes_libres)) {
              changes.push({ label: "Organismes libres", from: (originalForm.organismes_libres || []).join(", ") || "Aucun", to: (form.organismes_libres || []).join(", ") || "Aucun" });
            }
            if (originalForm.photo_url !== form.photo_url) changes.push({ label: "Photo", from: originalForm.photo_url ? "oui" : "—", to: form.photo_url ? "oui" : "—" });
            if (changes.length === 0) return null;
            return (
              <div style={{ marginTop: 16, padding: "14px 16px", background: C.yellowBg, borderRadius: 12, border: "1.5px solid " + C.yellow + "55" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.yellowDark, marginBottom: 10 }}>✏️ Modifications</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {changes.map(({ label, from, to }) => (
                    <div key={label} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: C.text, minWidth: 110, flexShrink: 0 }}>{label}</span>
                      <span style={{ color: C.pink, textDecoration: "line-through", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{from}</span>
                      <span style={{ color: C.textTer, flexShrink: 0 }}>→</span>
                      <span style={{ color: C.green, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{to}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
              {saving ? "⏳ ..." : editId ? "Soumettre les modifications" : "Soumettre la formation 🍿"}
            </button>
            <button onClick={() => { setTab("list"); setMsg(null); }} style={{ padding: "12px 28px", borderRadius: 12, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 14, cursor: "pointer" }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
