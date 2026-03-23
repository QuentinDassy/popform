"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { C, fetchDomainesAdmin, createDomaineAdmin, updateDomaineAdmin, deleteDomaineAdmin, isFormationPast, type Formation, type DomaineAdmin } from "@/lib/data";
import { StarRow, PriseTag } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase, fetchAdminNotifications, type AdminNotification } from "@/lib/supabase-data";
import { uploadImage } from "@/lib/upload";


export default function DashboardAdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const mob = useIsMobile();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("publiee");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [adminTab, setAdminTab] = useState<"formations" | "doublons" | "affiche" | "villes" | "domaines" | "webinaires" | "congres" | "utilisateurs" | "clics">("formations");
  const [clickStats, setClickStats] = useState<{ formation_id: number; titre: string; nb: number }[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<{ organismes: any[]; formateurs: any[] }>({ organismes: [], formateurs: [] });
  const [linkingOrg, setLinkingOrg] = useState<number | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkMsg, setLinkMsg] = useState<{ id: number; msg: string; ok: boolean } | null>(null);
  const [orgSearch, setOrgSearch] = useState("");
  const [formSearch, setFormSearch] = useState("");
  const [formSort, setFormSort] = useState<"default" | "alpha" | "organisme" | "recent">("default");
  const [selfRegisteredOrgs, setSelfRegisteredOrgs] = useState<any[]>([]);
  const [validatingOrg, setValidatingOrg] = useState<string | null>(null);
  const [assocRequests, setAssocRequests] = useState<{ id: number; formation_id: number; formateur_id: number; user_id: string; status: string; created_at: string; formation?: { titre: string }; formateur?: { nom: string } }[]>([]);
  const [mergeRequests, setMergeRequests] = useState<{ id: number; orphan_id: number; target_id: number; user_id: string; created_at: string; orphan?: { nom: string }; target?: { nom: string } }[]>([]);
  const [ignoredDoublonKeys, setIgnoredDoublonKeys] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem("admin_ignored_doublons"); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });

  // Villes management
  const [villesList, setVillesList] = useState<{ id?: number; nom: string; image: string }[]>([]);
  const [newVille, setNewVille] = useState("");
  const [newVilleFile, setNewVilleFile] = useState<File | null>(null);

  // Domaines management
  const [domainesList, setDomainesList] = useState<DomaineAdmin[]>([]);
  const [newDomaine, setNewDomaine] = useState({ nom: "", emoji: "📚", afficher_sur_accueil: true, afficher_dans_filtres: true });
  const [editingDomaine, setEditingDomaine] = useState<DomaineAdmin | null>(null);

  // Webinaires management
  const [webinaires, setWebinaires] = useState<any[]>([]);

  // Congrès management
  const [congresList, setCongresList] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const safetyTimer = setTimeout(() => setLoading(false), 12000);
    (async () => {
      try {
        const { data: f, error: fErr } = await supabase
          .from("formations")
          .select("*, sessions(*, session_parties(*)), formateur:formateurs(*), organisme:organismes(*)")
          .order("date_ajout", { ascending: false });
        if (fErr?.message?.includes("refresh") || fErr?.message?.includes("JWT")) { setLoading(false); return; }
        if (fErr) { console.error("Admin formations query error:", fErr.message, fErr.details, fErr.hint); }
        setFormations(f || []);
        const notifs = await fetchAdminNotifications();
        setNotifications(notifs);
        // Load villes config
        try {
          const { data: villes } = await supabase.from("villes_admin").select("*").order("nom");
          setVillesList(villes?.map((v: Record<string, string | number>) => ({ id: v.id as number, nom: v.nom as string, image: (v.image as string) || "" })) || []);
        } catch { /* table may not exist yet */ }
        // Load domaines config
        try {
          const domaines = await fetchDomainesAdmin();
          setDomainesList(domaines);
        } catch { /* table may not exist yet */ }
        // Load webinaires
        const { data: wbs } = await supabase.from("webinaires").select("*, organisme:organismes(nom), formateur:formateurs(nom)").order("date_heure", { ascending: true });
        setWebinaires(wbs || []);
        const { data: cgs } = await supabase.from("congres").select("*, organisme:organismes(nom), speakers:congres_speakers(nom,titre_intervention)").order("date", { ascending: true });
        setCongresList(cgs || []);
        // Load utilisateurs
        try {
          const { data: orgs } = await supabase.from("organismes").select("id, nom, user_id, logo, description, hidden").order("nom");
          const { data: fmts } = await supabase.from("formateurs").select("id, nom, user_id, organisme_id, bio, photo, hidden, merged_into_id").order("nom");
          setUtilisateurs({ organismes: orgs || [], formateurs: fmts || [] });
        } catch { /* ignore */ }
        // Load self-registered organisms (not admin-invited)
        try {
          const res = await fetch("/api/admin/self-registered-orgs");
          if (res.ok) { const data = await res.json(); setSelfRegisteredOrgs(data.orgs || []); }
        } catch { /* ignore */ }
        // Load association requests
        try {
          const { data: ar } = await supabase.from("formation_association_requests").select("*, formation:formations(titre), formateur:formateurs(nom)").eq("status", "pending").order("created_at", { ascending: false });
          setAssocRequests((ar || []) as any);
        } catch { /* table may not exist yet */ }
        // Load merge requests
        try {
          const { data: mr } = await supabase.from("formateur_merge_requests").select("*, orphan:formateurs!orphan_id(nom), target:formateurs!target_id(nom)").eq("status", "pending").order("created_at", { ascending: false });
          setMergeRequests((mr || []) as any);
        } catch { /* table may not exist yet */ }
      } catch (e: any) {
        if (e?.message?.includes("refresh") || e?.message?.includes("JWT") || e?.message?.includes("Refresh Token")) {
          window.location.href = "/";
        }
      } finally { clearTimeout(safetyTimer); setLoading(false); }
    })();
    return () => clearTimeout(safetyTimer);
  }, [user]);

  const handleStatus = async (id: number, status: string) => {
    const update: Record<string, any> = { status };
    if (status === "supprimee") update.supprime_par = "admin";
    await supabase.from("formations").update(update).eq("id", id);
    setFormations(prev => prev.map(f => f.id === id ? { ...f, status, ...(status === "supprimee" ? { supprime_par: "admin" } : {}) } as any : f));
    const { invalidateCache } = await import("@/lib/data");
    invalidateCache();
    if (status === "publiee") {
      const f = formations.find(f => f.id === id);
      if (f) {
        const userId = (f as any).formateur?.user_id || (f as any).organisme?.user_id;
        fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "formation_accepted", user_id: userId, formation_id: id, titre: f.titre }) }).catch(() => {});
      }
    }
  };

  const handleHardDelete = async (id: number, titre: string) => {
    if (!confirm(`Supprimer DÉFINITIVEMENT "${titre}" ?\n\nCette action est irréversible.`)) return;
    // Supprimer les enfants d'abord
    const { data: sessIds } = await supabase.from("sessions").select("id").eq("formation_id", id);
    if (sessIds && sessIds.length > 0) {
      await supabase.from("session_parties").delete().in("session_id", sessIds.map((s: any) => s.id));
    }
    await supabase.from("sessions").delete().eq("formation_id", id);
    await supabase.from("formations").delete().eq("id", id);
    setFormations(prev => prev.filter(f => f.id !== id));
    const { invalidateCache } = await import("@/lib/data");
    invalidateCache();
  };

  const handleApprovePendingUpdate = async (id: number) => {
    const f = formations.find(f => f.id === id);
    if (!f || !(f as any).pending_update) return;
    try {
      const pending = JSON.parse((f as any).pending_update);
      const { sessions: pendingSessions, status: _status, ...pendingData } = pending;
      await supabase.from("formations").update({ ...pendingData, pending_update: false }).eq("id", id);
      if (pendingSessions) {
        await supabase.from("sessions").delete().eq("formation_id", id);
        if (pendingSessions.length > 0) {
          await supabase.from("sessions").insert(pendingSessions.map((s: any) => ({
            formation_id: id,
            dates: s.date_debut ? (s.date_debut + (s.date_fin_session ? " → " + s.date_fin_session : "")) : s.dates,
            lieu: s.is_visio ? "Visio" : (s.ville || s.lieu || ""),
            adresse: s.is_visio ? (s.lien_visio || "") : [s.adresse, s.ville, s.code_postal].filter(Boolean).join(", "),
            modalite_session: s.modalite_session || null,
            lien_visio: s.lien_visio || null,
            parties: s.parties || null,
          })));
        }
      }
      setFormations(prev => prev.map(f => f.id === id ? { ...f, ...pendingData, status: f.status, pending_update: false } : f));
      const { invalidateCache } = await import("@/lib/data");
      invalidateCache();
    } catch(e) { console.error("Approve update error:", e); }
  };

  const handleRefusePendingUpdate = async (id: number) => {
    await supabase.from("formations").update({ pending_update: false }).eq("id", id);
    setFormations(prev => prev.map(f => f.id === id ? { ...f, pending_update: false } : f));
  };

  const handleAfficheOrder = async (id: number, order: number | null) => {
    await supabase.from("formations").update({ affiche_order: order }).eq("id", id);
    setFormations(prev => prev.map(f => f.id === id ? { ...f, affiche_order: order } : f));
  };

  const handleAddVille = async () => {
    if (!newVille.trim()) return;
    const { data: inserted } = await supabase.from("villes_admin").insert({ nom: newVille.trim(), image: "" }).select().single();
    if (inserted) {
      if (newVilleFile) {
        try {
          const url = await uploadImage(newVilleFile, "villes");
          await supabase.from("villes_admin").update({ image: url }).eq("id", inserted.id);
          setVillesList(prev => [...prev, { id: inserted.id, nom: newVille.trim(), image: url }]);
        } catch (e: any) {
          alert("Erreur upload image : " + e.message);
          setVillesList(prev => [...prev, { id: inserted.id, nom: newVille.trim(), image: "" }]);
        }
      } else {
        setVillesList(prev => [...prev, { id: inserted.id, nom: newVille.trim(), image: "" }]);
      }
    }
    setNewVille(""); setNewVilleFile(null);
  };

  const handleDeleteVille = async (nom: string) => {
    if (!confirm(`Supprimer la ville "${nom}" ?`)) return;
    await supabase.from("villes_admin").delete().eq("nom", nom);
    setVillesList(prev => prev.filter(v => v.nom !== nom));
  };

  const handleRenameVille = async (oldNom: string, newNom: string) => {
    if (!newNom.trim() || newNom === oldNom) return;
    await supabase.from("villes_admin").update({ nom: newNom.trim() }).eq("nom", oldNom);
    setVillesList(prev => prev.map(v => v.nom === oldNom ? { ...v, nom: newNom.trim() } : v));
  };

  const handleUpdateVilleImage = async (nom: string, image: string) => {
    await supabase.from("villes_admin").update({ image }).eq("nom", nom);
    setVillesList(prev => prev.map(v => v.nom === nom ? { ...v, image } : v));
  };

  const handleUploadVilleImage = async (nom: string, file: File) => {
    try {
      const url = await uploadImage(file, "villes");
      handleUpdateVilleImage(nom, url);
    } catch (e: any) {
      alert("Erreur upload image : " + e.message);
    }
  };

  const handleWebStatus = async (id: number, status: string) => {
    await supabase.from("webinaires").update({ status }).eq("id", id);
    setWebinaires(prev => prev.map(w => w.id === id ? { ...w, status } : w));
  };

  const handleDeleteWeb = async (id: number) => {
    if (!confirm("Supprimer ce webinaire ?")) return;
    await supabase.from("webinaires").delete().eq("id", id);
    setWebinaires(prev => prev.filter(w => w.id !== id));
  };

  const markRead = async (id: number) => {
    await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleApproveAssoc = async (req: { id: number; formation_id: number; formateur_id: number }) => {
    // Add formateur_id to formation's formateur_ids array
    const { data: f } = await supabase.from("formations").select("formateur_ids").eq("id", req.formation_id).single();
    const existing: number[] = (f as any)?.formateur_ids || [];
    if (!existing.includes(req.formateur_id)) {
      const updated = [...existing, req.formateur_id];
      await supabase.from("formations").update({ formateur_ids: updated }).eq("id", req.formation_id);
      const { invalidateCache } = await import("@/lib/data");
      invalidateCache();
    }
    await supabase.from("formation_association_requests").update({ status: "approved" }).eq("id", req.id);
    setAssocRequests(prev => prev.filter(r => r.id !== req.id));
  };

  const handleRejectAssoc = async (id: number) => {
    await supabase.from("formation_association_requests").update({ status: "rejected" }).eq("id", id);
    setAssocRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleApproveMerge = async (req: { id: number; orphan_id: number; target_id: number }) => {
    // Migrer formations via formateur_id
    await supabase.from("formations").update({ formateur_id: req.target_id }).eq("formateur_id", req.orphan_id);
    // Migrer formations via formateur_ids
    const { data: fmtIdsRows } = await supabase.from("formations").select("id, formateur_ids").contains("formateur_ids", [req.orphan_id]);
    for (const row of (fmtIdsRows || []) as { id: number; formateur_ids: number[] }[]) {
      const deduped = [...new Set(row.formateur_ids.map((id: number) => id === req.orphan_id ? req.target_id : id))];
      await supabase.from("formations").update({ formateur_ids: deduped }).eq("id", row.id);
    }
    // Soft-delete l'orphan
    await supabase.from("formateurs").update({ hidden: true, merged_into_id: req.target_id }).eq("id", req.orphan_id);
    await supabase.from("formateur_merge_requests").update({ status: "approved" }).eq("id", req.id);
    setMergeRequests(prev => prev.filter(r => r.id !== req.id));
    const { invalidateCache } = await import("@/lib/data");
    invalidateCache();
  };

  const handleRejectMerge = async (id: number) => {
    await supabase.from("formateur_merge_requests").update({ status: "rejected" }).eq("id", id);
    setMergeRequests(prev => prev.filter(r => r.id !== id));
  };

  // Domaines management handlers
  const [domaineError, setDomaineError] = useState<string | null>(null);
  
  const handleAddDomaine = async () => {
    if (!newDomaine.nom.trim()) return;
    setDomaineError(null);
    try {
      const domaine = await createDomaineAdmin({
        nom: newDomaine.nom.trim(),
        emoji: newDomaine.emoji || "📚",
        afficher_sur_accueil: newDomaine.afficher_sur_accueil,
        afficher_dans_filtres: newDomaine.afficher_dans_filtres,
        ordre_affichage: domainesList.length + 1,
      });
      if (domaine) {
        setDomainesList(prev => [...prev, domaine]);
        setNewDomaine({ nom: "", emoji: "📚", afficher_sur_accueil: true, afficher_dans_filtres: true });
      }
    } catch (e: any) {
      setDomaineError(e.message || "Erreur lors de l'ajout du domaine");
    }
  };

  const handleDeleteDomaine = async (id: number) => {
    if (!confirm("Supprimer ce domaine ? Les formations associées ne seront pas supprimées.")) return;
    const success = await deleteDomaineAdmin(id);
    if (success) {
      setDomainesList(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleUpdateDomaine = async (id: number, updates: Partial<DomaineAdmin>) => {
    const success = await updateDomaineAdmin(id, updates);
    if (success) {
      setDomainesList(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    }
  };

  const handleMoveDomaine = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === domainesList.length - 1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newList = [...domainesList];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    
    // Update ordre_affichage for all
    for (let i = 0; i < newList.length; i++) {
      await updateDomaineAdmin(newList[i].id, { ordre_affichage: i + 1 });
    }
    setDomainesList(newList);
  };

  if (authLoading || loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  function ManualValidateOrg() {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [nom, setNom] = useState("");
    const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
    const [busy, setBusy] = useState(false);

    const handle = async () => {
      if (!email.trim() || !nom.trim()) { setStatus({ msg: "Email et nom obligatoires", ok: false }); return; }
      setBusy(true); setStatus(null);
      // Trouver le user_id via l'API link-organisme (recherche par email)
      const res = await fetch("/api/admin/find-user-by-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      if (!res.ok) { setStatus({ msg: "Utilisateur introuvable pour cet email", ok: false }); setBusy(false); return; }
      const { user_id } = await res.json();
      const res2 = await fetch("/api/admin/validate-organisme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id, organisme_nom: nom.trim() }) });
      if (!res2.ok) { const d = await res2.json(); setStatus({ msg: d.error || "Erreur", ok: false }); setBusy(false); return; }
      await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "organisme_validated", user_id, nom: nom.trim() }) }).catch(() => {});
      setStatus({ msg: "✅ Organisme créé et email envoyé !", ok: true });
      setEmail(""); setNom(""); setBusy(false);
    };

    return (
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setOpen(o => !o)} style={{ padding: "7px 14px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer" }}>
          🔧 Valider manuellement un organisme
        </button>
        {open && (
          <div style={{ marginTop: 10, padding: 16, background: C.bgAlt, borderRadius: 12, border: "1px solid " + C.borderLight, display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 }}>
            <p style={{ fontSize: 12, color: C.textTer, margin: 0 }}>Pour les cas où l'utilisateur ne s'est pas inscrit en tant qu'organisme (ex : inscrit comme formateur puis organisme).</p>
            <input type="email" placeholder="Email du compte *" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
            <input type="text" placeholder="Nom de l'organisme *" value={nom} onChange={e => setNom(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
            <button onClick={handle} disabled={busy} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Création…" : "✅ Créer l'organisme & notifier"}
            </button>
            {status && <p style={{ fontSize: 12, color: status.ok ? C.green : C.accent, margin: 0, fontWeight: 600 }}>{status.msg}</p>}
          </div>
        )}
      </div>
    );
  }
  if (!user) { if (typeof window !== "undefined") window.location.href = "/"; return null }
  if (profile && profile.role !== "admin") { if (typeof window !== "undefined") window.location.href = "/"; return null }

  const normS = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const normTitle = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9\u00e0-\u00ff]/g, " ").replace(/\s+/g, " ").trim();
  const isDeleted = (f: Formation) => f.status === "supprimee" || f.status === "refusee";

  // Organismes libres saisis dans des formations mais pas encore créés dans la table
  const orphanOrganismesLibres = (() => {
    const allLibres = [...new Set(formations.flatMap(f => ((f as any).organismes_libres as string[] | null) || []).filter(Boolean))];
    const existingNoms = new Set(utilisateurs.organismes.map((o: any) => (o.nom || "").toLowerCase().trim()));
    return allLibres.filter(nom => !existingNoms.has(nom.toLowerCase().trim()));
  })();

  const handleCreateOrganismeLibre = async (nom: string) => {
    const { data, error } = await supabase.from("organismes").insert({ nom, logo: "", description: "", hidden: false }).select().single();
    if (!error && data) setUtilisateurs(prev => ({ ...prev, organismes: [...prev.organismes, data] }));
  };

  // Détection des doublons potentiels côté admin
  const potentialDoublons = (() => {
    const active = formations.filter(f => !isDeleted(f));
    const groups: { key: string; formations: Formation[] }[] = [];
    const seen = new Set<number>();
    for (const f of active) {
      if (seen.has(f.id)) continue;
      const fNorm = normTitle(f.titre);
      if (fNorm.length < 8) continue;
      const similar = active.filter(g => {
        if (g.id === f.id || seen.has(g.id)) return false;
        const gNorm = normTitle(g.titre);
        return gNorm === fNorm || (gNorm.length > 8 && (gNorm.includes(fNorm) || fNorm.includes(gNorm)));
      });
      if (similar.length > 0) {
        const group = [f, ...similar];
        group.forEach(g => seen.add(g.id));
        groups.push({ key: f.id + "", formations: group });
      }
    }
    return groups;
  })();
  const filteredBase = filter === "all" ? formations.filter(f => !isDeleted(f)) : filter === "supprimee" ? formations.filter(isDeleted) : formations.filter(f => f.status === filter);
  const filteredSearched = formSearch.trim()
    ? filteredBase.filter(f => {
        const q = normS(formSearch);
        return normS(f.titre).includes(q)
          || normS((f as any).organisme?.nom || "").includes(q)
          || normS((f as any).formateur?.nom || "").includes(q);
      })
    : filteredBase;
  const filtered = [...filteredSearched].sort((a, b) => {
    if (formSort === "alpha") return normS(a.titre).localeCompare(normS(b.titre));
    if (formSort === "organisme") return normS((a as any).organisme?.nom || "").localeCompare(normS((b as any).organisme?.nom || ""));
    if (formSort === "recent") return new Date(b.date_ajout).getTime() - new Date(a.date_ajout).getTime();
    return 0; // default: order from DB (already date_ajout desc)
  });
  const deletedCount = formations.filter(isDeleted).length;
  const pendingCount = formations.filter(f => f.status === "en_attente").length;
  const pendingWebCount = webinaires.filter(w => w.status === "en_attente").length;
  const pendingFormationIds = new Set(formations.filter(f => f.status === "en_attente").map(f => f.id));
  const pendingNotifs = notifications.filter(n => !n.is_read && pendingFormationIds.has(n.formation_id));
  const unreadNotifs = pendingNotifs.length;

  const statusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      en_attente: { bg: C.yellowBg, color: C.yellowDark, label: "⏳ En attente" },
      publiee: { bg: C.greenBg, color: C.green, label: "✓ Publiée" },
      refusee: { bg: C.pinkBg, color: C.pink, label: "🗑️ Supprimée" },
      archivee: { bg: C.bgAlt, color: C.textTer, label: "📦 Archivée" },
    };
    const s = styles[status] || styles.en_attente;
    return <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>🛡️ Administration PopForm</h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total", value: formations.filter(f => f.status !== "supprimee").length, icon: "🎬" },
          { label: "En attente", value: pendingCount, icon: "⏳", highlight: pendingCount > 0 },
          { label: "Publiées", value: formations.filter(f => f.status === "publiee").length, icon: "✅" },
          { label: "Webinaires ⏳", value: pendingWebCount, icon: "📡", highlight: pendingWebCount > 0 },
          { label: "Notifications", value: unreadNotifs + assocRequests.length + mergeRequests.length, icon: "🔔", highlight: unreadNotifs > 0 || assocRequests.length > 0 || mergeRequests.length > 0 },
        ].map(s => (
          <div key={s.label} style={{ padding: mob ? 10 : 14, background: s.highlight ? C.yellowBg : C.surface, borderRadius: 14, border: "1px solid " + (s.highlight ? C.yellow + "44" : C.borderLight), textAlign: "center" }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: s.highlight ? C.yellowDark : C.text }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textTer }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Admin section tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: 4, background: C.bgAlt, borderRadius: 12, width: "fit-content", flexWrap: "wrap" }}>
        <button onClick={() => setAdminTab("formations")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: adminTab === "formations" ? C.surface : "transparent", color: adminTab === "formations" ? C.text : C.textTer, fontSize: 12, fontWeight: adminTab === "formations" ? 700 : 500, cursor: "pointer" }}>🎬 Formations</button>
        <button onClick={() => setAdminTab("doublons")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: adminTab === "doublons" ? C.surface : "transparent", color: adminTab === "doublons" ? C.text : C.textTer, fontSize: 12, fontWeight: adminTab === "doublons" ? 700 : 500, cursor: "pointer", position: "relative" as const }}>
          🔁 Doublons
          {potentialDoublons.filter(g => !ignoredDoublonKeys.has(g.key)).length > 0 && <span style={{ position: "absolute" as const, top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: C.orange, color: "#fff", fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{potentialDoublons.filter(g => !ignoredDoublonKeys.has(g.key)).length}</span>}
        </button>
        <button onClick={() => setAdminTab("villes")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: adminTab === "villes" ? C.surface : "transparent", color: adminTab === "villes" ? C.text : C.textTer, fontSize: 12, fontWeight: adminTab === "villes" ? 700 : 500, cursor: "pointer" }}>📍 Villes</button>
        <button onClick={() => setAdminTab("domaines")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: adminTab === "domaines" ? C.surface : "transparent", color: adminTab === "domaines" ? C.text : C.textTer, fontSize: 12, fontWeight: adminTab === "domaines" ? 700 : 500, cursor: "pointer" }}>🏷️ Domaines</button>
        <button onClick={() => setAdminTab("utilisateurs")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: adminTab === "utilisateurs" ? C.surface : "transparent", color: adminTab === "utilisateurs" ? C.text : C.textTer, fontSize: 12, fontWeight: adminTab === "utilisateurs" ? 700 : 500, cursor: "pointer", position: "relative" as const }}>
          👥 Utilisateurs
          {selfRegisteredOrgs.length > 0 && (
            <span style={{ position: "absolute" as const, top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: C.green, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
              {selfRegisteredOrgs.length}
            </span>
          )}
        </button>
        <button onClick={async () => { setAdminTab("clics"); if (clickStats.length === 0) { const { data } = await supabase.rpc("formation_click_stats"); if (data) setClickStats(data); } }} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: adminTab === "clics" ? C.surface : "transparent", color: adminTab === "clics" ? C.text : C.textTer, fontSize: 12, fontWeight: adminTab === "clics" ? 700 : 500, cursor: "pointer" }}>📊 Clics</button>
        <Link href="/dashboard/admin/import" style={{ padding: "7px 14px", borderRadius: 9, background: "transparent", color: C.textTer, fontSize: 12, fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center" }}>📥 Import Excel</Link>
      </div>

      {/* ===== WEBINAIRES TAB ===== */}
      {adminTab === "webinaires" && (
        <div style={{ paddingBottom: 40 }}>
          <p style={{ fontSize: 13, color: C.textTer, marginBottom: 16 }}>Webinaires soumis par les organismes et formateurs. Publiez-les pour les rendre visibles sur le site.</p>

          {/* Filtre par statut */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, padding: 4, background: C.bgAlt, borderRadius: 10, width: "fit-content" }}>
            {[
              { v: "en_attente", l: "⏳ En attente (" + pendingWebCount + ")" },
              { v: "publie", l: "✅ Publiés" },
              { v: "refuse", l: "✕ Refusés" },
              { v: "all", l: "📋 Tous" },
            ].map(t => {
              const wFilter = t.v;
              const isActive = webinaires.filter(w => t.v === "all" ? true : w.status === t.v).length > 0 || t.v === "all";
              return (
                <button key={t.v} onClick={() => (document.getElementById("wfilter") as any).value = t.v}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "transparent", color: C.textTer, fontSize: 11, cursor: "pointer" }}>
                  {t.l}
                </button>
              );
            })}
          </div>

          {webinaires.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50, color: C.textTer }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
              <p>Aucun webinaire soumis pour le moment.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {webinaires.map(w => {
                const d = new Date(w.date_heure);
                const isPast = d < new Date();
                return (
                  <div key={w.id} style={{ background: C.surface, borderRadius: 14, border: "1px solid " + (w.status === "en_attente" ? "#7C3AED33" : C.borderLight), overflow: "hidden" }}>
                    <div style={{ padding: mob ? 14 : 18 }}>
                      <div style={{ display: "flex", gap: mob ? 8 : 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: mob ? 14 : 15, fontWeight: 700, color: C.text }}>{w.titre}</span>
                            {w.status === "en_attente" && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: "#7C3AED22", color: "#7C3AED" }}>⏳ EN ATTENTE</span>}
                            {w.status === "publie" && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.greenBg, color: C.green }}>✓ PUBLIÉ</span>}
                            {w.status === "refuse" && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.pinkBg, color: C.pink }}>✕ REFUSÉ</span>}
                            {isPast && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.bgAlt, color: C.textTer }}>Passé</span>}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: C.textTer, marginBottom: 6 }}>
                            <span>📅 {d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} à {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                            <span>·</span>
                            <span>{w.prix === 0 ? "🆓 Gratuit" : "💶 " + w.prix + "€"}</span>
                          </div>
                          {(w.organisme || w.formateur) && (
                            <div style={{ fontSize: 11, color: C.textTer, marginBottom: 6 }}>
                              {w.organisme && <span>🏢 {w.organisme.nom}</span>}
                              {w.formateur && <span>🎤 {w.formateur.nom}</span>}
                            </div>
                          )}
                          {w.description && <p style={{ fontSize: 12, color: C.textSec, lineHeight: 1.5, marginBottom: 8 }}>{w.description}</p>}
                          {w.lien_url && (
                            <a href={w.lien_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#7C3AED", textDecoration: "none", background: "#7C3AED11", padding: "3px 8px", borderRadius: 6 }}>
                              🔗 {w.lien_url.slice(0, 50)}{w.lien_url.length > 50 ? "…" : ""}
                            </a>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                          {w.status !== "publie" && (
                            <button onClick={() => handleWebStatus(w.id, "publie")} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #2A9D6E, #34B67F)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✅ Publier</button>
                          )}
                          {w.status !== "refuse" && (
                            <button onClick={() => handleWebStatus(w.id, "refuse")} style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid " + C.pink, background: "transparent", color: C.pink, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕ Refuser</button>
                          )}
                          {w.status !== "en_attente" && (
                            <button onClick={() => handleWebStatus(w.id, "en_attente")} style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.yellowDark, fontSize: 11, cursor: "pointer" }}>⏳ Attente</button>
                          )}
                          <button onClick={() => handleDeleteWeb(w.id)} style={{ padding: "8px 10px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textTer, fontSize: 12, cursor: "pointer" }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== DOUBLONS TAB ===== */}
      {adminTab === "doublons" && (
        <div style={{ paddingBottom: 40 }}>
          <p style={{ fontSize: 13, color: C.textTer, marginBottom: 16 }}>
            Formations avec des titres identiques ou très proches. À examiner pour fusionner ou conserver si elles sont légitimement différentes.
          </p>
          {potentialDoublons.filter(g => !ignoredDoublonKeys.has(g.key)).length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textTer }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <p>Aucun doublon potentiel détecté.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {potentialDoublons.filter(g => !ignoredDoublonKeys.has(g.key)).map(group => (
                <div key={group.key} style={{ padding: mob ? 14 : 18, background: C.surface, borderRadius: 14, border: "2px solid " + C.orange + "55" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.orange, textTransform: "uppercase", letterSpacing: "0.05em" }}>🔁 {group.formations.length} formations similaires</div>
                    <button onClick={() => setIgnoredDoublonKeys(prev => { const next = new Set([...prev, group.key]); try { localStorage.setItem("admin_ignored_doublons", JSON.stringify([...next])); } catch {} return next; })} style={{ padding: "4px 12px", borderRadius: 8, border: "1.5px solid " + C.green + "55", background: C.greenBg, color: C.green, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      ✅ Pas un doublon — ignorer
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {group.formations.map(f => (
                      <div key={f.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 12px", background: C.bgAlt, borderRadius: 10 }}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{f.titre}</div>
                          <div style={{ fontSize: 11, color: C.textTer }}>
                            {(f as any).organisme?.nom || (f as any).formateur?.nom || "—"} · {f.status} · {f.date_ajout}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Link href={`/dashboard/admin/formation/${f.id}`} style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.accent, fontSize: 11, textDecoration: "none", fontWeight: 600 }}>✏️ Éditer</Link>
                          <Link href={`/formation/${f.id}`} target="_blank" style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, textDecoration: "none" }}>👁️ Voir</Link>
                          <button onClick={() => handleStatus(f.id, "supprimee")} style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>🗑️ Supprimer</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== AFFICHE TAB ===== */}
      {adminTab === "affiche" && (
        <div style={{ paddingBottom: 40 }}>
          <p style={{ fontSize: 13, color: C.textTer, marginBottom: 16 }}>Les formations publiées depuis moins de 30 jours sont automatiquement à l&apos;affiche. Vous pouvez les ordonner ou ajouter/retirer manuellement.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {formations.filter(f => f.status === "publiee").sort((a, b) => (a.affiche_order ?? 999) - (b.affiche_order ?? 999)).map(f => {
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
              const isAuto = f.date_ajout >= thirtyDaysAgo;
              const isForced = f.affiche_order !== null && f.affiche_order !== undefined;
              return (
                <div key={f.id} style={{ padding: mob ? 10 : 14, background: C.surface, borderRadius: 12, border: "1px solid " + (isForced ? C.accent + "33" : C.borderLight), display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{f.titre}</div>
                    <div style={{ fontSize: 11, color: C.textTer }}>Ajoutée le {f.date_ajout} · {f.domaine}{isAuto ? " · 🆕 Auto" : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="number" min="1" max="20" value={f.affiche_order ?? ""} onChange={e => handleAfficheOrder(f.id, e.target.value ? Number(e.target.value) : null)} placeholder="—" style={{ width: 50, padding: "5px 8px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 12, textAlign: "center" }} />
                    <span style={{ fontSize: 10, color: C.textTer }}>ordre</span>
                    {isForced && <button onClick={() => handleAfficheOrder(f.id, null)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid " + C.border, background: C.surface, color: C.textTer, fontSize: 10, cursor: "pointer" }}>✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== VILLES TAB ===== */}
      {adminTab === "villes" && (
        <div style={{ paddingBottom: 40 }}>
          <p style={{ fontSize: 13, color: C.textTer, marginBottom: 16 }}>Gérez ici les villes disponibles sur PopForm. Dès qu&apos;au moins une ville est ajoutée, <strong>seules ces villes</strong> apparaissent dans les filtres et formulaires — fini les doublons et fautes de frappe.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {[...villesList].sort((a, b) => {
              const cA = formations.filter(f => (f.sessions || []).some((s: any) => (s.lieu || "").includes(a.nom))).length;
              const cB = formations.filter(f => (f.sessions || []).some((s: any) => (s.lieu || "").includes(b.nom))).length;
              return cB - cA;
            }).map(v => (
              <div key={v.nom} style={{ padding: 12, background: C.surface, borderRadius: 12, border: "1px solid " + C.borderLight, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {v.image
                  ? <img src={v.image} alt={v.nom} style={{ width: 80, height: 50, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 80, height: 50, borderRadius: 8, background: C.bgAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.textTer, flexShrink: 0 }}>Pas d&apos;image</div>
                }
                <input
                  defaultValue={v.nom}
                  onBlur={e => handleRenameVille(v.nom, e.target.value)}
                  style={{ flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, fontWeight: 700 }}
                />
                <label style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.textSec, fontSize: 11, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                  📷 {v.image ? "Changer" : "Ajouter image"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadVilleImage(v.nom, file);
                  }} />
                </label>
                <button onClick={() => handleDeleteVille(v.nom)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>🗑️</button>
              </div>
            ))}
            {villesList.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: C.textTer, fontSize: 13 }}>Aucune ville ajoutée. Les villes seront détectées automatiquement depuis les formations.</div>
            )}
          </div>
          <div style={{ padding: 16, background: C.bgAlt, borderRadius: 12, border: "1.5px dashed " + C.border }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, marginBottom: 10, textTransform: "uppercase" }}>+ Nouvelle ville</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input value={newVille} onChange={e => setNewVille(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddVille()} placeholder="Nom de la ville" style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, width: 180 }} />
              <label style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                📷 {newVilleFile ? "✓ " + newVilleFile.name.slice(0, 18) : "Image (optionnel)"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setNewVilleFile(e.target.files?.[0] || null)} />
              </label>
              <button onClick={handleAddVille} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DOMAINES TAB ===== */}
      {adminTab === "domaines" && (
        <div style={{ paddingBottom: 40 }}>
          <p style={{ fontSize: 13, color: C.textTer, marginBottom: 16 }}>Gérez ici les domaines de formation. Vous pouvez contrôler quels domaines apparaissent sur la page d&apos;accueil et dans les filtres de recherche.</p>
          
          {/* Liste des domaines */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {domainesList.map((d, index) => (
              <div key={d.id} style={{ padding: 12, background: C.surface, borderRadius: 12, border: "1px solid " + C.borderLight, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 24, width: 40, textAlign: "center" }}>{d.emoji}</div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <input
                    value={editingDomaine?.id === d.id ? editingDomaine.nom : d.nom}
                    onChange={e => editingDomaine?.id === d.id && setEditingDomaine({ ...editingDomaine, nom: e.target.value })}
                    onFocus={() => setEditingDomaine(d)}
                    onBlur={() => {
                      if (editingDomaine && editingDomaine.id === d.id && editingDomaine.nom !== d.nom) {
                        handleUpdateDomaine(d.id, { nom: editingDomaine.nom });
                      }
                      setEditingDomaine(null);
                    }}
                    style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 13, fontWeight: 700 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.textSec, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={d.afficher_sur_accueil}
                      onChange={e => handleUpdateDomaine(d.id, { afficher_sur_accueil: e.target.checked })}
                      style={{ cursor: "pointer" }}
                    />
                    Accueil
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.textSec, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={d.afficher_dans_filtres}
                      onChange={e => handleUpdateDomaine(d.id, { afficher_dans_filtres: e.target.checked })}
                      style={{ cursor: "pointer" }}
                    />
                    Filtres
                  </label>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => handleMoveDomaine(index, "up")} disabled={index === 0} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid " + C.border, background: C.surface, color: index === 0 ? C.textTer + "44" : C.textSec, fontSize: 12, cursor: index === 0 ? "not-allowed" : "pointer" }}>↑</button>
                  <button onClick={() => handleMoveDomaine(index, "down")} disabled={index === domainesList.length - 1} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid " + C.border, background: C.surface, color: index === domainesList.length - 1 ? C.textTer + "44" : C.textSec, fontSize: 12, cursor: index === domainesList.length - 1 ? "not-allowed" : "pointer" }}>↓</button>
                  <button onClick={() => handleDeleteDomaine(d.id)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid " + C.border, background: C.surface, color: C.pink, fontSize: 12, cursor: "pointer" }}>🗑️</button>
                </div>
              </div>
            ))}
            {domainesList.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: C.textTer, fontSize: 13 }}>Aucun domaine configuré. Les domaines seront détectés automatiquement depuis les formations.</div>
            )}
          </div>

          {/* Ajouter un domaine */}
          <div style={{ padding: 16, background: C.bgAlt, borderRadius: 12, border: "1.5px dashed " + C.border }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, marginBottom: 10, textTransform: "uppercase" }}>+ Nouveau domaine</div>
            {domaineError && (
              <div style={{ padding: "8px 12px", marginBottom: 10, background: C.pinkBg, borderRadius: 8, border: "1px solid " + C.pink, color: C.pink, fontSize: 12 }}>
                ⚠️ {domaineError}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={newDomaine.emoji}
                onChange={e => setNewDomaine({ ...newDomaine, emoji: e.target.value })}
                placeholder="📚"
                style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, width: 60, textAlign: "center" }}
              />
              <input
                value={newDomaine.nom}
                onChange={e => setNewDomaine({ ...newDomaine, nom: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleAddDomaine()}
                placeholder="Nom du domaine"
                style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, flex: 1, minWidth: 150 }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.textSec, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={newDomaine.afficher_sur_accueil}
                  onChange={e => setNewDomaine({ ...newDomaine, afficher_sur_accueil: e.target.checked })}
                  style={{ cursor: "pointer" }}
                />
                Accueil
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.textSec, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={newDomaine.afficher_dans_filtres}
                  onChange={e => setNewDomaine({ ...newDomaine, afficher_dans_filtres: e.target.checked })}
                  style={{ cursor: "pointer" }}
                />
                Filtres
              </label>
              <button onClick={handleAddDomaine} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONGRÈS TAB ===== */}
      {adminTab === "congres" && (
        <div style={{ paddingBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 16 }}>🎤 Validation des congrès</h2>
          {congresList.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: C.textTer }}>Aucun congrès soumis.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {congresList.map((c: any) => (
              <div key={c.id} style={{ padding: mob ? 14 : 20, background: C.surface, borderRadius: 16, border: "1.5px solid " + (c.status === "en_attente" ? C.yellow + "88" : C.borderLight) }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  {c.photo_url && <img src={c.photo_url} alt={c.titre} style={{ width: 80, height: 54, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{c.titre}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 700, background: c.status === "publie" ? C.greenBg : c.status === "refuse" ? C.pinkBg : "#FFF3C4", color: c.status === "publie" ? C.green : c.status === "refuse" ? C.pink : "#9B6B00" }}>
                        {c.status === "publie" ? "✓ Publié" : c.status === "refuse" ? "✕ Refusé" : "⏳ En attente"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textTer, marginBottom: 4 }}>
                      📅 {c.date ? new Date(c.date).toLocaleDateString("fr-FR") : "—"}
                      {c.organisme?.nom && <> · 🏢 {c.organisme.nom}</>}
                      {c.adresse && <> · 📍 {c.adresse}</>}
                    </div>
                    {c.description && <p style={{ fontSize: 12, color: C.textSec, marginBottom: 6 }}>{c.description}</p>}
                    {(c.speakers || []).length > 0 && (
                      <div style={{ fontSize: 11, color: C.textTer }}>
                        👤 {(c.speakers as any[]).map((s: any) => s.nom + (s.titre_intervention ? ` (${s.titre_intervention})` : "")).join(" · ")}
                      </div>
                    )}
                    {c.lien_url && <div style={{ fontSize: 11, color: C.accent, marginTop: 4 }}>🔗 {c.lien_url}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {c.status !== "publie" && <button onClick={async () => { await supabase.from("congres").update({ status: "publie" }).eq("id", c.id); setCongresList(prev => prev.map(x => x.id === c.id ? { ...x, status: "publie" } : x)); }} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: C.greenBg, color: C.green, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✅ Publier</button>}
                    {c.status !== "refuse" && <button onClick={async () => { await supabase.from("congres").update({ status: "refuse" }).eq("id", c.id); setCongresList(prev => prev.map(x => x.id === c.id ? { ...x, status: "refuse" } : x)); }} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: C.pinkBg, color: C.pink, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✕ Refuser</button>}
                    {c.status !== "en_attente" && <button onClick={async () => { await supabase.from("congres").update({ status: "en_attente" }).eq("id", c.id); setCongresList(prev => prev.map(x => x.id === c.id ? { ...x, status: "en_attente" } : x)); }} style={{ padding: "7px 14px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textTer, fontSize: 12, cursor: "pointer" }}>⏳</button>}
                    <button onClick={async () => { if (!confirm("Supprimer ?")) return; await supabase.from("congres").delete().eq("id", c.id); setCongresList(prev => prev.filter(x => x.id !== c.id)); }} style={{ padding: "7px 10px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 12, cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      {adminTab === "formations" && unreadNotifs > 0 && (
        <div style={{ marginBottom: 20, padding: mob ? 12 : 16, background: C.yellowBg, borderRadius: 14, border: "1px solid " + C.yellow + "33" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.yellowDark, marginBottom: 8 }}>🔔 Notifications récentes</div>
          {pendingNotifs.slice(0, 5).map(n => (
            <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid " + C.yellow + "22", gap: 8, flexWrap: "wrap" }}>
              <div>
                <span style={{ fontSize: 12, color: C.text }}>{n.message}</span>
                <span style={{ fontSize: 10, color: C.textTer, marginLeft: 8 }}>{n.created_at?.slice(0, 16).replace("T", " ")}</span>
              </div>
              <button onClick={() => markRead(n.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid " + C.border, background: C.surface, color: C.textTer, fontSize: 10, cursor: "pointer" }}>✓ Lu</button>
            </div>
          ))}
        </div>
      )}

      {/* Merge requests */}
      {adminTab === "formations" && mergeRequests.length > 0 && (
        <div style={{ marginBottom: 20, padding: mob ? 12 : 16, background: "rgba(232,123,53,0.08)", borderRadius: 14, border: "1px solid rgba(232,123,53,0.25)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e87b35", marginBottom: 10 }}>🔗 Demandes de fusion de profil formateur ({mergeRequests.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mergeRequests.map(req => (
              <div key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.surface, borderRadius: 10, border: "1px solid " + C.borderLight, gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                    {req.target?.nom || "#" + req.target_id} ← fusionner « {req.orphan?.nom || "#" + req.orphan_id} »
                  </div>
                  <div style={{ fontSize: 11, color: C.textTer }}>Les formations de l&apos;orphan seront transférées · {req.created_at?.slice(0, 16).replace("T", " ")}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleApproveMerge(req)} style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: C.green, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✅ Approuver</button>
                  <button onClick={() => handleRejectMerge(req.id)} style={{ padding: "7px 14px", borderRadius: 9, border: "1.5px solid " + C.pink, background: "transparent", color: C.pink, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕ Refuser</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Association requests */}
      {adminTab === "formations" && assocRequests.length > 0 && (
        <div style={{ marginBottom: 20, padding: mob ? 12 : 16, background: C.blueBg, borderRadius: 14, border: "1px solid " + C.blue + "33" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginBottom: 10 }}>🔗 Demandes d&apos;association formateur ({assocRequests.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {assocRequests.map(req => (
              <div key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.surface, borderRadius: 10, border: "1px solid " + C.borderLight, gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{req.formateur?.nom || "Formateur"} → {req.formation?.titre || `Formation #${req.formation_id}`}</div>
                  <div style={{ fontSize: 11, color: C.textTer }}>{req.created_at?.slice(0, 16).replace("T", " ")}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleApproveAssoc(req)} style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: C.green, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✅ Approuver</button>
                  <button onClick={() => handleRejectAssoc(req.id)} style={{ padding: "7px 14px", borderRadius: 9, border: "1.5px solid " + C.pink, background: "transparent", color: C.pink, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕ Refuser</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {adminTab === "formations" && <>
      {/* Filter tabs + bouton nouvelle formation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <div style={{ display: "flex", gap: 4, padding: 4, background: C.bgAlt, borderRadius: 12, width: "fit-content", flexWrap: "wrap" }}>
        {[
          { v: "publiee", l: "✅ Publiées" },
          { v: "en_attente", l: "⏳ En attente (" + pendingCount + ")" },
          { v: "all", l: "📋 Toutes" },
          { v: "supprimee", l: "🗑️ Supprimées" + (deletedCount > 0 ? " (" + deletedCount + ")" : "") },
        ].map(t => (
          <button key={t.v} onClick={() => setFilter(t.v)} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: filter === t.v ? C.surface : "transparent", color: filter === t.v ? C.text : C.textTer, fontSize: 12, fontWeight: filter === t.v ? 700 : 500, cursor: "pointer", boxShadow: filter === t.v ? "0 1px 4px rgba(0,0,0,0.06)" : "none" }}>{t.l}</button>
        ))}
      </div>
      <Link href="/dashboard/admin/formation/new" style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>➕ Nouvelle formation</Link>
      </div>

      {/* Recherche et tri formations */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="🔍 Rechercher par titre, organisme, formateur…"
          value={formSearch}
          onChange={e => setFormSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 12, fontFamily: "inherit", outline: "none", background: C.surface }}
        />
        <select value={formSort} onChange={e => setFormSort(e.target.value as any)} style={{ padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 12, fontFamily: "inherit", background: C.surface, cursor: "pointer" }}>
          <option value="default">Tri : Récent d'abord</option>
          <option value="alpha">Tri : Alphabétique</option>
          <option value="organisme">Tri : Par organisme</option>
          <option value="recent">Tri : Dernière modification</option>
        </select>
      </div>

      {/* Formation list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: C.textTer }}>Aucune formation dans cette catégorie.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 40 }}>
          {filtered.map(f => {
            const expanded = expandedId === f.id;
            const past = f.status === "publiee" && isFormationPast(f);
            return (
              <div key={f.id} style={{ background: C.surface, borderRadius: 14, border: "1px solid " + (f.status === "en_attente" ? C.yellow + "44" : C.borderLight), overflow: "hidden", opacity: past ? 0.6 : 1 }}>
                <div style={{ padding: mob ? 12 : 18, display: "flex", gap: mob ? 8 : 16, alignItems: "center", flexWrap: "wrap", cursor: "pointer" }} onClick={() => setExpandedId(expanded ? null : f.id)}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: mob ? 14 : 16, fontWeight: 700, color: C.text }}>{f.titre}</span>
                      {statusBadge(f.status)}
                      {past && <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.borderLight, color: C.textTer }}>📅 Dates passées</span>}
                      {f.status === "supprimee" && (
                        <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: C.pinkBg, color: C.pink }}>
                          🗑️ {(() => { const sp = (f as any).supprime_par || ""; if (sp === "admin") return "par l'admin"; if (sp.startsWith("formateur:")) return "par " + sp.replace("formateur:", ""); if (sp.startsWith("organisme:")) return "par " + sp.replace("organisme:", ""); return sp || "origine inconnue"; })()}
                        </span>
                      )}
                      {f.status === "supprimee" && (f as any).suppression_message && (
                        <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, background: C.bgAlt, color: C.textSec, fontStyle: "italic" }}>
                          « {(f as any).suppression_message} »
                        </span>
                      )}
                      {(f as any).pending_update && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: "#E8F0FE", color: "#2E7CE6" }}>🔄 Modif. en attente</span>}
                    </div>
                    {(f as any).pending_update && (
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button onClick={() => handleApprovePendingUpdate(f.id)} style={{ padding: "4px 10px", borderRadius: 7, border: "none", background: C.greenBg, color: C.green, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✅ Approuver modif.</button>
                        <button onClick={() => handleRefusePendingUpdate(f.id)} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 11, cursor: "pointer" }}>✕ Refuser modif.</button>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: C.textTer }}>
                      <span>{f.domaine}</span><span>·</span><span>{f.modalite}</span><span>·</span><span>{f.prix}€</span>
                      {f.formateur && <><span>·</span><span>🎤 {f.formateur.nom}</span></>}
                      {f.organisme && <><span>·</span><span>🏢 {f.organisme.nom}</span></>}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: C.textTer }}>{expanded ? "▲" : "▼"}</span>
                </div>

                {expanded && (
                  <div style={{ padding: mob ? "0 12px 14px" : "0 18px 18px", borderTop: "1px solid " + C.borderLight }}>
                    <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12, marginTop: 14 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", marginBottom: 3 }}>Sous-titre</div>
                        <p style={{ fontSize: 13, color: C.textSec }}>{f.sous_titre || "—"}</p>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", marginBottom: 3 }}>Durée / Effectif</div>
                        <p style={{ fontSize: 13, color: C.textSec }}>{f.duree} · {f.effectif} places</p>
                      </div>
                      <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", marginBottom: 3 }}>Description</div>
                        <p style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.7 }}>{f.description}</p>
                      </div>
                      {f.mots_cles && f.mots_cles.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", marginBottom: 3 }}>Mots-clés</div>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{f.mots_cles.map(m => <span key={m} style={{ padding: "2px 7px", borderRadius: 6, fontSize: 10, background: C.yellowBg, color: C.yellowDark }}>{m}</span>)}</div>
                        </div>
                      )}
                      {f.populations && f.populations.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", marginBottom: 3 }}>Populations</div>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{f.populations.map(p => <span key={p} style={{ padding: "2px 7px", borderRadius: 6, fontSize: 10, background: C.blueBg, color: C.blue }}>{p}</span>)}</div>
                        </div>
                      )}
                      {(f.prise_en_charge || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", marginBottom: 3 }}>Prise en charge</div>
                          <div style={{ display: "flex", gap: 3 }}>{f.prise_en_charge.map(p => <PriseTag key={p} label={p} />)}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", marginBottom: 3 }}>Prix</div>
                        <p style={{ fontSize: 12, color: C.textSec }}>{f.prix}€{f.prix_salarie ? ` · Salarié: ${f.prix_salarie}€` : ""}{f.prix_liberal ? ` · Libéral: ${f.prix_liberal}€` : ""}{f.prix_dpc !== null && f.prix_dpc !== undefined ? ` · DPC: ${f.prix_dpc}€` : ""}</p>
                      </div>
                      {(f.sessions || []).length > 0 && (
                        <div style={{ gridColumn: mob ? "1" : "1 / -1" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase", marginBottom: 3 }}>Sessions</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {(f.sessions || []).map((s, i) => (
                              <div key={i} style={{ padding: "6px 10px", background: C.bgAlt, borderRadius: 8, fontSize: 12, color: C.textSec }}>📅 {s.dates} · 📍 {s.lieu}{s.adresse ? " — " + s.adresse : ""}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                      {f.status !== "publiee" && (
                        <button onClick={() => handleStatus(f.id, "publiee")} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #2A9D6E, #34B67F)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✅ Publier</button>
                      )}
                      {(f as any).pending_update && (
                        <button onClick={async () => { await supabase.from("formations").update({ pending_update: false }).eq("id", f.id); setFormations(prev => prev.map(x => x.id === f.id ? { ...x, pending_update: false } as any : x)); }} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: C.blueBg, color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Valider modif.</button>
                      )}
                      {!isDeleted(f) && f.status !== "en_attente" && (
                        <button onClick={() => handleStatus(f.id, "en_attente")} style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.yellowDark, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>⏳ Remettre en attente</button>
                      )}
                      {!isDeleted(f) && <Link href={`/dashboard/admin/formation/${f.id}`} style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>✏️ Modifier</Link>}
                      {f.status === "publiee" && (
                        <Link href={`/formation/${f.id}`} style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>👁️ Voir sur le site</Link>
                      )}
                      {!isDeleted(f) && <button onClick={() => handleStatus(f.id, "archivee")} style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textTer, fontSize: 12, cursor: "pointer" }}>📦 Archiver</button>}
                      {!isDeleted(f) ? (
                        <button onClick={() => { if (confirm(`Supprimer "${f.titre}" ?`)) handleStatus(f.id, "supprimee"); }} style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.pink, fontSize: 12, cursor: "pointer" }}>🗑️ Supprimer</button>
                      ) : (
                        <>
                          <button onClick={() => handleStatus(f.id, "archivee")} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: C.greenBg, color: C.green, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>♻️ Restaurer</button>
                          <button onClick={() => handleHardDelete(f.id, f.titre)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: C.pinkBg, color: C.pink, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑️ Supprimer définitivement</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </>}

      {/* ===== UTILISATEURS TAB ===== */}
      {adminTab === "utilisateurs" && (
        <div style={{ paddingBottom: 40 }}>

          {/* Nouvelles inscriptions en attente */}
          {selfRegisteredOrgs.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 10, padding: "12px 16px", background: C.greenBg, borderRadius: 12, border: "1.5px solid " + C.green + "44", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🔔</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{selfRegisteredOrgs.length} nouvelle{selfRegisteredOrgs.length > 1 ? "s" : ""} inscription{selfRegisteredOrgs.length > 1 ? "s" : ""} — en attente de validation</div>
                  <div style={{ fontSize: 11, color: C.textSec }}>Ces organismes se sont inscrits eux-mêmes. Validez et notifiez-les.</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
                {selfRegisteredOrgs.map(o => (
                  <div key={o.user_id} style={{ padding: 14, background: C.surface, borderRadius: 12, border: "1.5px solid " + C.green + "44", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 800, flexShrink: 0 }}>
                        {(o.organisme_nom || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.organisme_nom}</div>
                        <div style={{ fontSize: 10, color: C.textTer }}>{o.email}</div>
                        {o.created_at && <div style={{ fontSize: 10, color: C.textTer }}>Inscrit le {new Date(o.created_at).toLocaleDateString("fr-FR")}</div>}
                      </div>
                    </div>
                    {linkMsg?.id === o.user_id ? (
                      <div style={{ fontSize: 11, color: linkMsg!.ok ? C.green : C.accent, fontWeight: 600 }}>{linkMsg!.msg}</div>
                    ) : (
                      <button
                        disabled={validatingOrg === o.user_id}
                        onClick={async () => {
                          if (!confirm(`Valider et notifier "${o.organisme_nom}" (${o.email}) ?\n\nCela va créer l'espace organisme et leur envoyer un email de confirmation.`)) return;
                          setValidatingOrg(o.user_id);
                          const res = await fetch("/api/admin/validate-organisme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: o.user_id, organisme_nom: o.organisme_nom }) });
                          if (!res.ok) {
                            const d = await res.json();
                            setLinkMsg({ id: o.user_id, msg: "❌ " + (d.error || "Erreur"), ok: false });
                          } else {
                            await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "organisme_validated", user_id: o.user_id, nom: o.organisme_nom }) }).catch(() => {});
                            setLinkMsg({ id: o.user_id, msg: "✅ Organisme créé & email envoyé !", ok: true });
                            setSelfRegisteredOrgs(prev => prev.filter(x => x.user_id !== o.user_id));
                          }
                          setValidatingOrg(null);
                        }}
                        style={{ padding: "7px 10px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: validatingOrg === o.user_id ? 0.6 : 1 }}
                      >
                        {validatingOrg === o.user_id ? "Création…" : "✅ Valider & notifier"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation manuelle (cas particuliers) */}
          <ManualValidateOrg />

          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="🔍 Rechercher un organisme…"
              value={orgSearch}
              onChange={e => setOrgSearch(e.target.value)}
              style={{ width: "100%", maxWidth: 360, padding: "9px 14px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 12, fontFamily: "inherit", outline: "none", background: C.surface, boxSizing: "border-box" }}
            />
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>🏢 Organismes ({utilisateurs.organismes.length})</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10, marginBottom: 30 }}>
            {utilisateurs.organismes.filter(o => !orgSearch.trim() || (o.nom || "").toLowerCase().includes(orgSearch.toLowerCase())).sort((a: any, b: any) => (b.user_id ? 1 : 0) - (a.user_id ? 1 : 0)).map(o => (
              <div key={o.id} style={{ padding: 14, background: C.surface, borderRadius: 12, border: "1px solid " + C.borderLight, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 800, flexShrink: 0, overflow: "hidden" }}>
                    {o.logo && o.logo.startsWith("http") ? <img src={o.logo} alt={o.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (o.logo || (o.nom || "?").slice(0, 2))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.nom}</div>
                    <div style={{ fontSize: 10, color: o.user_id ? C.green : C.textTer }}>{o.user_id ? "✓ Compte actif" : "Importé — sans accès"}</div>
                  </div>
                </div>
                {!o.user_id && linkingOrg !== o.id && (
                  <button onClick={() => { setLinkingOrg(o.id); setLinkEmail(""); setLinkMsg(null); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    🔗 Lier un compte
                  </button>
                )}
                {linkingOrg === o.id && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      type="email"
                      placeholder="Email du compte à lier"
                      value={linkEmail}
                      onChange={e => setLinkEmail(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 12, fontFamily: "inherit", outline: "none" }}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={async () => {
                          setLinkMsg(null);
                          const res = await fetch("/api/admin/link-organisme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organisme_id: o.id, email: linkEmail }) });
                          const data = await res.json();
                          if (res.ok) {
                            if (data.invited) {
                              setLinkMsg({ id: o.id, msg: "✉️ Invitation envoyée — l'utilisateur recevra un email pour créer son compte", ok: true });
                            } else {
                              setLinkMsg({ id: o.id, msg: "✓ Compte lié avec succès", ok: true });
                              setUtilisateurs(prev => ({ ...prev, organismes: prev.organismes.map(x => x.id === o.id ? { ...x, user_id: data.user_id } : x) }));
                            }
                            setLinkingOrg(null);
                          } else {
                            setLinkMsg({ id: o.id, msg: data.error || "Erreur", ok: false });
                          }
                        }}
                        style={{ flex: 1, padding: "6px", borderRadius: 8, background: C.accent, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                      >Confirmer</button>
                      <button onClick={() => setLinkingOrg(null)} style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 11, cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                )}
                {linkMsg?.id === o.id && <div style={{ fontSize: 11, color: linkMsg!.ok ? C.green : C.accent, fontWeight: 600 }}>{linkMsg!.msg}</div>}
                <button
                  onClick={async () => {
                    const newVal = !o.hidden;
                    await supabase.from("organismes").update({ hidden: newVal }).eq("id", o.id);
                    setUtilisateurs(prev => ({ ...prev, organismes: prev.organismes.map((x: any) => x.id === o.id ? { ...x, hidden: newVal } : x) }));
                  }}
                  style={{ padding: "5px 10px", borderRadius: 8, border: "1.5px solid " + C.border, background: o.hidden ? C.yellowBg : C.surface, color: o.hidden ? C.yellowDark : C.textTer, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                >{o.hidden ? "👁️ Masqué — afficher" : "🙈 Masquer du site"}</button>
                <Link href={`/dashboard/admin/formation/new?organisme_id=${o.id}`} style={{ display: "block", textAlign: "center", padding: "7px", borderRadius: 8, background: C.gradient, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>+ Formation</Link>
              </div>
            ))}
          </div>

          {orphanOrganismesLibres.length > 0 && (
            <div style={{ marginBottom: 28, padding: "14px 18px", background: C.yellowBg, borderRadius: 12, border: "1.5px solid " + C.yellow + "66" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.yellowDark, marginBottom: 8 }}>⚠️ {orphanOrganismesLibres.length} organisme{orphanOrganismesLibres.length > 1 ? "s" : ""} libre{orphanOrganismesLibres.length > 1 ? "s" : ""} non créé{orphanOrganismesLibres.length > 1 ? "s" : ""}</div>
              <p style={{ fontSize: 12, color: C.yellowDark, margin: "0 0 10px" }}>Ces noms ont été saisis librement dans des formations mais n&apos;existent pas encore dans la liste des organismes.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {orphanOrganismesLibres.map(nom => (
                  <div key={nom} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C.surface, borderRadius: 9, border: "1.5px solid " + C.yellow + "88", fontSize: 12 }}>
                    <span style={{ fontWeight: 600, color: C.text }}>{nom}</span>
                    <button onClick={() => handleCreateOrganismeLibre(nom)} style={{ padding: "3px 10px", borderRadius: 7, border: "none", background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Créer</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>🎤 Formateurs ({utilisateurs.formateurs.length})</h2>
          <p style={{ fontSize: 12, color: C.textTer, marginBottom: 12 }}>Les formateurs ne doivent pas être liés à un organisme. Utilisez le bouton "Détacher" si nécessaire.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
            {utilisateurs.formateurs.map(f => {
              const linkedOrg = f.organisme_id ? utilisateurs.organismes.find((o: any) => o.id === f.organisme_id) : null;
              return (
                <div key={f.id} style={{ padding: 14, background: C.surface, borderRadius: 12, border: "1px solid " + (linkedOrg ? C.yellow + "66" : C.borderLight), display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 18, background: C.bgAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, overflow: "hidden", border: "1.5px solid " + C.border }}>
                      {f.photo && f.photo.startsWith("http") ? <img src={f.photo} alt={f.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🎤"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nom}</div>
                      <div style={{ fontSize: 10, color: f.user_id ? C.green : C.textTer }}>{f.user_id ? "✓ Compte actif" : "Importé"}</div>
                    </div>
                  </div>
                  {linkedOrg && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 7, background: C.yellowBg, fontSize: 11 }}>
                      <span style={{ color: C.yellowDark, flex: 1 }}>⚠️ Lié à : {linkedOrg.nom}</span>
                      <button
                        onClick={async () => {
                          if (!confirm(`Détacher ${f.nom} de l'organisme "${linkedOrg.nom}" ?`)) return;
                          await supabase.from("formateurs").update({ organisme_id: null }).eq("id", f.id);
                          setUtilisateurs(prev => ({ ...prev, formateurs: prev.formateurs.map((x: any) => x.id === f.id ? { ...x, organisme_id: null } : x) }));
                        }}
                        style={{ padding: "3px 8px", borderRadius: 6, border: "none", background: C.accent, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                      >Détacher</button>
                    </div>
                  )}
                  {f.merged_into_id && (
                    <button
                      onClick={async () => {
                        const target = utilisateurs.formateurs.find((x: any) => x.id === f.merged_into_id);
                        if (!confirm(`Annuler la fusion de "${f.nom}" avec "${target?.nom || "#" + f.merged_into_id}" ? Le profil sera restauré et ses formations re-attribuées.`)) return;
                        // Re-attribuer les formations liées via formateur_id
                        await supabase.from("formations").update({ formateur_id: f.id }).eq("formateur_id", f.merged_into_id);
                        // Restaurer le profil
                        await supabase.from("formateurs").update({ hidden: false, merged_into_id: null }).eq("id", f.id);
                        setUtilisateurs(prev => ({ ...prev, formateurs: prev.formateurs.map((x: any) => x.id === f.id ? { ...x, hidden: false, merged_into_id: null } : x) }));
                      }}
                      style={{ padding: "5px 10px", borderRadius: 8, border: "1.5px solid rgba(232,123,53,0.4)", background: "rgba(232,123,53,0.08)", color: "#e87b35", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >↩️ Annuler la fusion</button>
                  )}
                  <button
                    onClick={async () => {
                      const newVal = !f.hidden;
                      await supabase.from("formateurs").update({ hidden: newVal }).eq("id", f.id);
                      setUtilisateurs(prev => ({ ...prev, formateurs: prev.formateurs.map((x: any) => x.id === f.id ? { ...x, hidden: newVal } : x) }));
                    }}
                    style={{ padding: "5px 10px", borderRadius: 8, border: "1.5px solid " + C.border, background: f.hidden ? C.yellowBg : C.surface, color: f.hidden ? C.yellowDark : C.textTer, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                  >{f.hidden ? "👁️ Masqué — afficher" : "🙈 Masquer du site"}</button>
                  <Link href={`/dashboard/admin/formation/new?formateur_id=${f.id}`} style={{ display: "block", textAlign: "center", padding: "7px", borderRadius: 8, background: C.gradient, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>+ Formation</Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ===== CLICS TAB ===== */}
      {adminTab === "clics" && (
        <div style={{ paddingBottom: 40 }}>
          <p style={{ fontSize: 13, color: C.textTer, marginBottom: 16 }}>Nombre de clics sur "Voir la formation" par fiche. Données depuis l'activation du tracking.</p>
          {clickStats.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.textTer, fontSize: 13 }}>Aucun clic enregistré pour l'instant.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {clickStats.map((s, i) => (
                <div key={s.formation_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.surface, borderRadius: 10, border: "1px solid " + C.borderLight }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.textTer, width: 24, textAlign: "right", flexShrink: 0 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.titre}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 8, background: C.accentBg, color: C.accent, fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{s.nb} clic{s.nb > 1 ? "s" : ""}</span>
                  <Link href={`/dashboard/admin/formation/${s.formation_id}`} style={{ fontSize: 11, color: C.textTer, textDecoration: "none", flexShrink: 0 }}>→</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
