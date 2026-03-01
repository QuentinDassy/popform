"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { C, fmtTitle, fetchDomainesAdmin, invalidateCache, type Formation, type Formateur } from "@/lib/data";
import { StarRow, PriseTag } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase, notifyAdmin, fetchOrganismes, type Organisme } from "@/lib/supabase-data";

const MODALITES = ["Présentiel", "Visio", "Mixte"];
const PRISES = ["DPC", "FIF-PL"];

type SessionPartieRow = { titre: string; jours: string[]; date_debut: string; date_fin: string; modalite: string; lieu: string; adresse: string; ville: string; code_postal: string; lien_visio: string };
type SessionRow = { id?: number; dates: string; lieu: string; adresse: string; ville: string; code_postal: string; modalite_session?: string; lien_visio?: string; date_debut?: string; date_fin_session?: string; is_visio?: boolean; nb_parties: number; parties: SessionPartieRow[] };
function emptyFormation() {
  return {
    titre: "", sous_titre: "", description: "", domaine: "", domaine_custom: "",
    modalite: MODALITES[0],
    prise_en_charge: [] as string[], prise_aucune: false,
    duree: "", prix: null as number | null, prix_salarie: null as number | null,
    prix_liberal: null as number | null, prix_dpc: null as number | null,
    is_new: false, populations: [] as string[], mots_cles: "",
    professions: ["Orthophonie"], effectif: null as number | null, video_url: "", url_inscription: "", photo_url: "" as string,
    organisme_id: null as number | null,
  };
}

export default function DashboardFormateurPage() {
  const { user, profile } = useAuth();
  const mob = useIsMobile();
  const [formateur, setFormateur] = useState<Formateur | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [organismes, setOrganismes] = useState<Organisme[]>([]);
  const [domainesList, setDomainesList] = useState<{ nom: string; emoji: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "edit" | "profil">("list");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyFormation());
  const [sessions, setSessions] = useState<SessionRow[]>([{ dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "Présentiel", lien_visio: "", is_visio: false, nb_parties: 1, parties: [{ titre: "", jours: [], date_debut: "", date_fin: "", modalite: "Présentiel", lieu: "", adresse: "", ville: "", code_postal: "", lien_visio: "" }] }]);
  const [saving, setSaving] = useState(false);
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [showExtraPrix, setShowExtraPrix] = useState(false);
  const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [profilPhotoFile, setProfilPhotoFile] = useState<File | null>(null);
  const [fmtSiteUrl, setFmtSiteUrl] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [profilSaved, setProfilSaved] = useState(false);
  const [adminVilles, setAdminVilles] = useState<string[]>([]);

  const [fmtPrenom, setFmtPrenom] = useState("");
  const [fmtNom, setFmtNom] = useState("");
  const [fmtBio, setFmtBio] = useState("");
  const [fmtSexe, setFmtSexe] = useState("Non genré");
  const [profilPhotoRemoved, setProfilPhotoRemoved] = useState(false);
  const [orphanFmts, setOrphanFmts] = useState<{ id: number; nom: string; count: number }[]>([]);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
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
        const { data: f } = await supabase.from("formations").select("*, sessions(*, session_parties(*))").eq("formateur_id", fmt.id).order("date_ajout", { ascending: false });
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
      setLoading(false);
      // Load admin villes
      supabase.from("villes_admin").select("nom").order("nom").then(({ data }: { data: { nom: string }[] | null }) => {
        if (data) setAdminVilles(data.map((v: { nom: string }) => v.nom));
      });
    })();
  }, [user, profile]);

  const openEdit = (f?: Formation) => {
    if (f) {
      setEditId(f.id);
      setForm({ titre: f.titre, sous_titre: f.sous_titre || "", description: f.description, domaine: f.domaine, domaine_custom: "", modalite: f.modalite, prise_en_charge: f.prise_en_charge || [], prise_aucune: (f.prise_en_charge || []).length === 0, duree: f.duree, prix: f.prix, prix_salarie: f.prix_salarie, prix_liberal: f.prix_liberal, prix_dpc: f.prix_dpc, is_new: f.is_new, populations: f.populations || [], mots_cles: (f.mots_cles || []).join(", "), professions: f.professions || [], effectif: f.effectif, video_url: f.video_url || "", url_inscription: f.url_inscription || "", organisme_id: f.organisme_id, photo_url: (f as any).photo_url || "" });
      setSessions((f.sessions || []).map(s => { const sp = (s as any).session_parties || []; return { id: s.id, dates: s.dates, lieu: s.lieu, adresse: s.adresse || "", ville: s.lieu || "", code_postal: s.code_postal || "", modalite_session: s.modalite_session || "Présentiel", lien_visio: s.lien_visio || "", is_visio: s.lieu === "Visio" || !!s.lien_visio, nb_parties: sp.length || 1, parties: sp.map((p: any) => ({ titre: p.titre || "", jours: p.jours ? p.jours.split(",").filter(Boolean) : (p.date_debut ? [p.date_debut] : []), date_debut: p.date_debut || "", date_fin: p.date_fin || "", modalite: p.modalite || "Présentiel", lieu: p.lieu || "", adresse: p.adresse || "", ville: p.ville || "", code_postal: "", lien_visio: p.lien_visio || "" })) }; }));
      setShowExtraPrix(!!(f.prix_salarie || f.prix_liberal));
    } else {
      setEditId(null);
      setForm(emptyFormation());
      setSessions([{ dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "Présentiel", lien_visio: "", is_visio: false, nb_parties: 1, parties: [{ titre: "", jours: [], date_debut: "", date_fin: "", modalite: "Présentiel", lieu: "", adresse: "", ville: "", code_postal: "", lien_visio: "" }] }]);
      setFormPhotoFile(null);
      setShowExtraPrix(false);
    }
    setMsg(null);
    setTab("edit");
  };

  const handleSave = async () => {
    if (!formateur) { setMsg("Erreur: profil formateur non trouvé."); return; }
    if (!form.titre.trim()) { setMsg("Le titre est obligatoire."); return; }
    if (!form.description.trim()) { setMsg("La description est obligatoire."); return; }
    if (!form.domaine) { setMsg("Le domaine est obligatoire."); return; }
    const hasDate = sessions.every(s => (s.parties || []).some(p => (p.jours || []).length > 0 || p.date_debut));
    if (sessions.length > 0 && !hasDate) { setMsg("Chaque session doit avoir au moins une date."); return; }
    setSaving(true); setMsg(null);

    // Déterminer la modalité en fonction des sessions
    const allVisio = sessions.length > 0 && sessions.every(s => s.is_visio);
    const someVisio = sessions.some(s => s.is_visio) && !allVisio;
    const computedModalite = allVisio ? "Visio" : someVisio ? "Mixte" : (form.modalite || "Présentiel");

    const payload = {
      titre: form.titre.trim(), sous_titre: form.sous_titre.trim(), description: form.description.trim(),
      domaine: form.domaine,
      modalite: computedModalite, prise_en_charge: form.prise_aucune ? [] : form.prise_en_charge,
      duree: form.duree || "7h", prix: form.prix ?? 0, prix_salarie: form.prix_salarie || null,
      prix_liberal: form.prix_liberal || null, prix_dpc: form.prix_dpc || null,
      is_new: true, populations: form.populations,
      mots_cles: form.mots_cles.split(",").map((s: string) => s.trim()).filter(Boolean),
      professions: form.professions.length ? form.professions : ["Orthophonie"],
      effectif: form.effectif || 20, video_url: form.video_url, photo_url: form.photo_url || null,
      url_inscription: form.url_inscription || "",
      formateur_id: formateur.id, organisme_id: form.organisme_id || null,
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
      await supabase.from("sessions").delete().eq("formation_id", formationId);
const validSessions = sessions.filter(s => (s.parties && s.parties.length > 0) || (s.dates.trim() && (s.ville.trim() || s.lieu.trim() || (s.lien_visio || "").trim())));      if (validSessions.length > 0) {
        const { data: insertedSessions } = await supabase.from("sessions").insert(validSessions.map(s => ({
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
        }))).select();
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

    const { data: f } = await supabase.from("formations").select("*, sessions(*, session_parties(*))").eq("formateur_id", formateur.id).order("date_ajout", { ascending: false });
    setFormations(f || []);
    setSaving(false);
    setFormPhotoFile(null);
    setTab("list");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette formation ?")) return;
    await supabase.from("sessions").delete().eq("formation_id", id);
    await supabase.from("formations").delete().eq("id", id);
    setFormations(prev => prev.filter(f => f.id !== id));
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
    const { data: f } = await supabase.from("formations").select("*, sessions(*, session_parties(*))").eq("formateur_id", formateur.id).order("date_ajout", { ascending: false });
    setFormations(f || []);
    invalidateCache();
    setMerging(false);
  };

  if (!user) { if (typeof window !== "undefined") window.location.href = "/"; return null; }
  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

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
              {formations.map(f => (
                <div key={f.id} style={{ padding: mob ? 12 : 18, background: C.surface, borderRadius: 14, border: "1px solid " + C.borderLight, display: "flex", gap: mob ? 8 : 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: mob ? 14 : 16, fontWeight: 700, color: C.text }}>{f.titre}</span>
                      {f.status === "en_attente" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.yellowBg, color: C.yellowDark }}>⏳ En attente</span>}
                      {f.status === "refusee" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.pinkBg, color: C.pink }}>✕ Refusée</span>}
                      {f.status === "publiee" && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.greenBg, color: C.green }}>✓ Publiée</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: C.textTer }}>
                      <span>{f.domaine}</span><span>·</span><span>{f.modalite}</span><span>·</span><span>{f.prix}€</span><span>·</span><span>{(f.sessions || []).length} session{(f.sessions || []).length > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {f.status === "publiee" && <Link href={`/formation/${f.id}`} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, textDecoration: "none" }}>👁️ Voir</Link>}
                    <button onClick={() => openEdit(f)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, cursor: "pointer" }}>✏️</button>
                    <button onClick={() => handleDelete(f.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
              ))}
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

            <div>
              <label style={labelStyle}>Domaine *</label>
              <select value={form.domaine} onChange={e => setForm({ ...form, domaine: e.target.value })} style={inputStyle}>
                <option value="">— Sélectionner un domaine * —</option>
                {domainesList.map(d => <option key={d.nom} value={d.nom}>{d.nom}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Modalité</label><select value={form.modalite} onChange={e => setForm({ ...form, modalite: e.target.value })} style={inputStyle}>{MODALITES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label style={labelStyle}>Organisme (optionnel)</label>
              <select value={form.organisme_id ?? ""} onChange={e => setForm({ ...form, organisme_id: e.target.value ? Number(e.target.value) : null })} style={inputStyle}>
                <option value="">Indépendant</option>
                {organismes.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Prix (€)</label><input type="number" value={form.prix ?? ""} onChange={e => setForm({ ...form, prix: e.target.value === "" ? null : Number(e.target.value) })} style={inputStyle} /></div>
            <div><label style={labelStyle}>Durée</label><input value={form.duree} onChange={e => setForm({ ...form, duree: e.target.value })} placeholder="Ex: 14h (2j)" style={inputStyle} /></div>
            {!showExtraPrix ? (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="button" onClick={() => setShowExtraPrix(true)} style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px dashed " + C.border, background: "transparent", color: C.textTer, fontSize: 12, cursor: "pointer" }}>+ Ajouter types de prix</button>
              </div>
            ) : (
              <>
                <div><label style={labelStyle}>Prix salarié (€)</label><input type="number" value={form.prix_salarie ?? ""} onChange={e => setForm({ ...form, prix_salarie: e.target.value ? Number(e.target.value) : null })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Prix libéral (€)</label><input type="number" value={form.prix_liberal ?? ""} onChange={e => setForm({ ...form, prix_liberal: e.target.value ? Number(e.target.value) : null })} style={inputStyle} /></div>
              </>
            )}

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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.textSec, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                  📷 {formPhotoFile ? "✓ " + formPhotoFile.name.slice(0, 24) : form.photo_url ? "Changer la photo" : "Ajouter une photo"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setFormPhotoFile(e.target.files[0]); }} />
                </label>
                {formPhotoFile
                  ? <img src={URL.createObjectURL(formPhotoFile)} alt="" style={{ width: 80, height: 50, borderRadius: 8, objectFit: "cover" }} />
                  : form.photo_url ? <img src={form.photo_url} alt="" style={{ width: 80, height: 50, borderRadius: 8, objectFit: "cover" }} /> : null}
                {(form.photo_url || formPhotoFile) && <button type="button" onClick={() => { setForm({ ...form, photo_url: "" }); setFormPhotoFile(null); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 12, cursor: "pointer" }}>✕ Supprimer</button>}
              </div>
            </div>

            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}><label style={labelStyle}>URL vidéo (YouTube)</label><input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} style={inputStyle} /></div>
            <div style={{ gridColumn: mob ? "1" : "1 / -1" }}><label style={labelStyle}>URL d&apos;inscription</label><input value={form.url_inscription || ""} onChange={e => setForm({ ...form, url_inscription: e.target.value })} placeholder="https://monsite.fr/inscription" style={inputStyle} /></div>
          </div>

          {/* ===== SESSIONS STRUCTURÉES ===== */}
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
                              {["Présentiel", "Visio", "Mixte"].map(m => (
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
                            <label style={labelStyle}>Jours de formation</label>
                            <p style={{ fontSize: 11, color: C.textTer, marginBottom: 6 }}>Cliquez sur chaque jour (ex: 4, 7 et 9 mars — discontinus possible)</p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              {(p.jours || []).map((j, ji) => (
                                <div key={ji} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: C.accentBg, border: "1.5px solid " + C.accent + "44" }}>
                                  <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{j}</span>
                                  <button type="button" onClick={() => { const n = [...sessions]; const nj = p.jours.filter((_, jk) => jk !== ji); n[i].parties[pi].jours = nj; n[i].parties[pi].date_debut = nj[0] || ""; n[i].parties[pi].date_fin = nj[nj.length - 1] || ""; setSessions(n); }} style={{ background: "none", border: "none", color: C.pink, fontSize: 12, cursor: "pointer", padding: 0 }}>✕</button>
                                </div>
                              ))}
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <input ref={el => { dateInputRefs.current[`${i}-${pi}`] = el; }} type="date" min={today} style={{ ...inputStyle, fontSize: 12, width: "auto", minWidth: 140 }}
                                  onBlur={() => {
                                    const el = dateInputRefs.current[`${i}-${pi}`];
                                    const val = el?.value;
                                    if (!val) return;
                                    const n = [...sessions];
                                    const cur = n[i].parties[pi].jours || [];
                                    if (!cur.includes(val)) {
                                      const sorted = [...cur, val].sort();
                                      n[i].parties[pi].jours = sorted;
                                      n[i].parties[pi].date_debut = sorted[0];
                                      n[i].parties[pi].date_fin = sorted[sorted.length - 1];
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
                                  const cur = n[i].parties[pi].jours || [];
                                  if (!cur.includes(val)) {
                                    const sorted = [...cur, val].sort();
                                    n[i].parties[pi].jours = sorted;
                                    n[i].parties[pi].date_debut = sorted[0];
                                    n[i].parties[pi].date_fin = sorted[sorted.length - 1];
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
                              <input value={p.ville} onChange={e => { const n = [...sessions]; n[i].parties[pi].ville = e.target.value; n[i].parties[pi].lieu = e.target.value; setSessions(n); }} placeholder="Ex: Paris" style={inputStyle} />
                            </div>
                          )}
                          {p.modalite !== "Visio" && (
                            <div>
                              <label style={labelStyle}>Adresse</label>
                              <input value={p.adresse} onChange={e => { const n = [...sessions]; n[i].parties[pi].adresse = e.target.value; setSessions(n); }} placeholder="Ex: 12 rue de la Paix" style={inputStyle} />
                            </div>
                          )}
                          {p.modalite !== "Visio" && (
                            <div>
                              <label style={labelStyle}>Code postal</label>
                              <input value={p.code_postal || ""} onChange={e => { const n = [...sessions]; n[i].parties[pi].code_postal = e.target.value; setSessions(n); }} placeholder="Ex: 75001" style={inputStyle} />
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
                  </div>
                );
              })}
              <button onClick={() => setSessions([...sessions, { dates: "", lieu: "", adresse: "", ville: "", code_postal: "", modalite_session: "Présentiel", lien_visio: "", is_visio: false, nb_parties: 1, parties: [{ titre: "", jours: [], date_debut: "", date_fin: "", modalite: "Présentiel", lieu: "", adresse: "", ville: "", code_postal: "", lien_visio: "" }] }])} style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px dashed " + C.border, background: "transparent", color: C.textTer, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>+ Ajouter une session</button>
            </div>
          </div>

                    {msg && <p style={{ color: C.pink, fontSize: 13, marginTop: 14, textAlign: "center" }}>{msg}</p>}
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
