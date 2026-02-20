"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { C, type Formation, type DomaineAdmin } from "@/lib/data";
import { StarRow, PriseTag } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase, fetchAdminNotifications, type AdminNotification } from "@/lib/supabase-data";
import { uploadImage } from "@/lib/upload";
import { fetchDomainesAdmin, createDomaineAdmin, updateDomaineAdmin, deleteDomaineAdmin } from "@/lib/supabase-data";

const ADMIN_EMAIL = "quentin.dassy@gmail.com"; // Change to your admin email

export default function DashboardAdminPage() {
  const { user, profile } = useAuth();
  const mob = useIsMobile();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("en_attente");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [adminTab, setAdminTab] = useState<"formations" | "affiche" | "villes" | "domaines" | "webinaires" | "congres">("formations");

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
    if (!user) return;
    (async () => {
      try {
        const { data: f, error: fErr } = await supabase
          .from("formations")
          .select("*, sessions(*), formateur:formateurs(*), organisme:organismes(*)")
          .order("date_ajout", { ascending: false });
        if (fErr?.message?.includes("refresh") || fErr?.message?.includes("JWT")) { setLoading(false); return; }
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
      } catch (e: any) {
        // Session expired - redirect to home
        if (e?.message?.includes("refresh") || e?.message?.includes("JWT") || e?.message?.includes("Refresh Token")) {
          window.location.href = "/";
          return;
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const handleStatus = async (id: number, status: string) => {
    await supabase.from("formations").update({ status }).eq("id", id);
    setFormations(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    // Invalide le cache public pour que la formation apparaisse immédiatement
    const { invalidateCache } = await import("@/lib/data");
    invalidateCache();
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

  if (!user) { if (typeof window !== "undefined") window.location.href = "/"; return null }
  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  if (user.email !== ADMIN_EMAIL) { if (typeof window !== "undefined") window.location.href = "/"; return null }

  const filtered = filter === "all" ? formations : formations.filter(f => f.status === filter);
  const pendingCount = formations.filter(f => f.status === "en_attente").length;
  const pendingWebCount = webinaires.filter(w => w.status === "en_attente").length;
  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  const statusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      en_attente: { bg: C.yellowBg, color: C.yellowDark, label: "⏳ En attente" },
      publiee: { bg: C.greenBg, color: C.green, label: "✓ Publiée" },
      refusee: { bg: C.pinkBg, color: C.pink, label: "✕ Refusée" },
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
          { label: "Total", value: formations.length, icon: "🎬" },
          { label: "En attente", value: pendingCount, icon: "⏳", highlight: pendingCount > 0 },
          { label: "Publiées", value: formations.filter(f => f.status === "publiee").length, icon: "✅" },
          { label: "Webinaires ⏳", value: pendingWebCount, icon: "📡", highlight: pendingWebCount > 0 },
          { label: "Notifications", value: unreadNotifs, icon: "🔔", highlight: unreadNotifs > 0 },
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
        <button onClick={() => setAdminTab("villes")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: adminTab === "villes" ? C.surface : "transparent", color: adminTab === "villes" ? C.text : C.textTer, fontSize: 12, fontWeight: adminTab === "villes" ? 700 : 500, cursor: "pointer" }}>📍 Villes</button>
        <button onClick={() => setAdminTab("domaines")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: adminTab === "domaines" ? C.surface : "transparent", color: adminTab === "domaines" ? C.text : C.textTer, fontSize: 12, fontWeight: adminTab === "domaines" ? 700 : 500, cursor: "pointer" }}>🏷️ Domaines</button>
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
            {villesList.map(v => (
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
          {notifications.filter(n => !n.is_read).slice(0, 5).map(n => (
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

      {adminTab === "formations" && <>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: 4, background: C.bgAlt, borderRadius: 12, width: "fit-content", flexWrap: "wrap" }}>
        {[
          { v: "en_attente", l: "⏳ En attente (" + pendingCount + ")" },
          { v: "publiee", l: "✅ Publiées" },
          { v: "refusee", l: "✕ Refusées" },
          { v: "all", l: "📋 Toutes" },
        ].map(t => (
          <button key={t.v} onClick={() => setFilter(t.v)} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: filter === t.v ? C.surface : "transparent", color: filter === t.v ? C.text : C.textTer, fontSize: 12, fontWeight: filter === t.v ? 700 : 500, cursor: "pointer", boxShadow: filter === t.v ? "0 1px 4px rgba(0,0,0,0.06)" : "none" }}>{t.l}</button>
        ))}
      </div>

      {/* Formation list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: C.textTer }}>Aucune formation dans cette catégorie.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 40 }}>
          {filtered.map(f => {
            const expanded = expandedId === f.id;
            return (
              <div key={f.id} style={{ background: C.surface, borderRadius: 14, border: "1px solid " + (f.status === "en_attente" ? C.yellow + "44" : C.borderLight), overflow: "hidden" }}>
                <div style={{ padding: mob ? 12 : 18, display: "flex", gap: mob ? 8 : 16, alignItems: "center", flexWrap: "wrap", cursor: "pointer" }} onClick={() => setExpandedId(expanded ? null : f.id)}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: mob ? 14 : 16, fontWeight: 700, color: C.text }}>{f.titre}</span>
                      {statusBadge(f.status)}
                    </div>
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
                      {f.status !== "refusee" && (
                        <button onClick={() => handleStatus(f.id, "refusee")} style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid " + C.pink, background: "transparent", color: C.pink, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕ Refuser</button>
                      )}
                      {f.status !== "en_attente" && (
                        <button onClick={() => handleStatus(f.id, "en_attente")} style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.yellowDark, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>⏳ Remettre en attente</button>
                      )}
                      {f.status === "publiee" && (
                        <Link href={`/formation/${f.id}`} style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>👁️ Voir sur le site</Link>
                      )}
                      <button onClick={() => handleStatus(f.id, "archivee")} style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.textTer, fontSize: 12, cursor: "pointer" }}>📦 Archiver</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </>}
    </div>
  );
}
