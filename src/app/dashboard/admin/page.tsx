"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { C, type Formation } from "@/lib/data";
import { StarRow, PriseTag } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase, fetchAdminNotifications, type AdminNotification } from "@/lib/supabase-data";

const ADMIN_EMAIL = "quentin.dassy@gmail.com"; // Change to your admin email

export default function DashboardAdminPage() {
  const { user, profile } = useAuth();
  const mob = useIsMobile();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("en_attente");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: f } = await supabase
        .from("formations")
        .select("*, sessions(*), formateur:formateurs(*), organisme:organismes(*)")
        .order("date_ajout", { ascending: false });
      setFormations(f || []);
      const notifs = await fetchAdminNotifications();
      setNotifications(notifs);
      setLoading(false);
    })();
  }, [user]);

  const handleStatus = async (id: number, status: string) => {
    await supabase.from("formations").update({ status }).eq("id", id);
    setFormations(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  };

  const markRead = async (id: number) => {
    await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  if (!user) { if (typeof window !== "undefined") window.location.href = "/"; return null }
  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  if (user.email !== ADMIN_EMAIL) { if (typeof window !== "undefined") window.location.href = "/"; return null }

  const filtered = filter === "all" ? formations : formations.filter(f => f.status === filter);
  const pendingCount = formations.filter(f => f.status === "en_attente").length;
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
          { label: "Refusées", value: formations.filter(f => f.status === "refusee").length, icon: "✕" },
          { label: "Notifications", value: unreadNotifs, icon: "🔔", highlight: unreadNotifs > 0 },
        ].map(s => (
          <div key={s.label} style={{ padding: mob ? 10 : 14, background: s.highlight ? C.yellowBg : C.surface, borderRadius: 14, border: "1px solid " + (s.highlight ? C.yellow + "44" : C.borderLight), textAlign: "center" }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: s.highlight ? C.yellowDark : C.text }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textTer }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Notifications */}
      {unreadNotifs > 0 && (
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
    </div>
  );
}
