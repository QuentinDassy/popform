"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C } from "@/lib/data";
import { useIsMobile } from "@/lib/hooks";
import { supabase } from "@/lib/supabase-data";
import { useAuth } from "@/lib/auth-context";

type Webinaire = {
  id: number;
  titre: string;
  description: string;
  date_heure: string; // ISO datetime
  prix: number;
  lien_url: string;
  organisme_id?: number | null;
  formateur_id?: number | null;
  status: string; // "publie" | "en_attente" | "refuse"
  created_at: string;
  organisme?: { nom: string } | null;
  formateur?: { nom: string } | null;
};

function Countdown({ target }: { target: string }) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    const update = () => setDiff(new Date(target).getTime() - Date.now());
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [target]);

  if (diff <= 0) return <span style={{ color: C.green, fontWeight: 700, fontSize: 12 }}>🔴 En cours !</span>;

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {days > 0 && <CountCell value={days} label="j" />}
      <CountCell value={hours} label="h" />
      <CountCell value={mins} label="m" />
      <CountCell value={secs} label="s" />
    </div>
  );
}

function CountCell({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ padding: "4px 8px", borderRadius: 7, background: C.accentBg, color: C.accent, fontSize: 15, fontWeight: 800, minWidth: 36, lineHeight: 1.3 }}>{String(value).padStart(2, "0")}</div>
      <div style={{ fontSize: 9, color: C.textTer, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function WebinaireListPage() {
  const mob = useIsMobile();
  const { user, profile } = useAuth();
  const [webinaires, setWebinaires] = useState<Webinaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [inscribed, setInscribed] = useState<number[]>([]);
  const [reminder, setReminder] = useState<number | null>(null);
  const [reminderEmail, setReminderEmail] = useState("");
  const [reminderSent, setReminderSent] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("webinaires")
        .select("*, organisme:organismes(nom), formateur:formateurs(nom)")
        .eq("status", "publie")
        .order("date_heure", { ascending: true });
      setWebinaires(data || []);
      if (user) {
        const { data: ins } = await supabase.from("webinaire_inscriptions").select("webinaire_id").eq("user_id", user.id);
        setInscribed((ins || []).map((i: { webinaire_id: number }) => i.webinaire_id));
      }
      setLoading(false);
    })();
  }, [user]);

  const handleInscription = async (w: Webinaire) => {
    if (!user) return alert("Connectez-vous pour vous inscrire.");
    if (inscribed.includes(w.id)) return;
    await supabase.from("webinaire_inscriptions").upsert({ user_id: user.id, webinaire_id: w.id, email: user.email });
    setInscribed(prev => [...prev, w.id]);
    setReminder(w.id);
    setReminderEmail(user.email || "");
  };

  const handleSendReminder = async (wId: number) => {
    // Store reminder preference in Supabase
    await supabase.from("webinaire_inscriptions").update({ reminder_30min: true, reminder_email: reminderEmail }).eq("webinaire_id", wId).eq("user_id", user?.id || "");
    setReminderSent(prev => [...prev, wId]);
    setReminder(null);
  };

  const now = new Date();
  const upcoming = webinaires.filter(w => new Date(w.date_heure) > now);
  const past = webinaires.filter(w => new Date(w.date_heure) <= now);

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: mob ? "0 16px" : "0 40px", paddingBottom: 60 }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>📡 Webinaires</h1>
        <p style={{ fontSize: 13, color: C.textTer }}>Sessions en ligne en direct pour orthophonistes</p>
      </div>

      {upcoming.length === 0 && past.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: C.textTer }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
          <p>Aucun webinaire programmé pour l'instant. Revenez bientôt !</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 14 }}>⏳ À venir</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
            {upcoming.map(w => {
              const isInscribed = inscribed.includes(w.id);
              const isReminderSent = reminderSent.includes(w.id);
              const dateObj = new Date(w.date_heure);
              const dateStr = dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
              const timeStr = dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

              return (
                <div key={w.id} style={{ padding: mob ? 16 : 22, background: C.surface, borderRadius: 16, border: "1.5px solid " + C.borderLight, position: "relative", overflow: "hidden" }}>
                  {/* Bandeau webinaire */}
                  <div style={{ position: "absolute", top: 14, right: 14, padding: "3px 10px", borderRadius: 8, background: C.gradientSoft, color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>📡 WEBINAIRE</div>

                  <div style={{ marginBottom: 10 }}>
                    <h3 style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: C.text, marginBottom: 4, paddingRight: 90 }}>{w.titre}</h3>
                    <div style={{ fontSize: 12, color: C.textTer }}>
                      📅 {dateStr} à {timeStr}
                      {w.organisme && <> · 🏢 {w.organisme.nom}</>}
                      {w.formateur && <> · 🎤 {w.formateur.nom}</>}
                    </div>
                  </div>

                  {w.description && <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5, marginBottom: 14 }}>{w.description}</p>}

                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    {/* Compte à rebours */}
                    <div>
                      <div style={{ fontSize: 10, color: C.textTer, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>Début dans</div>
                      <Countdown target={w.date_heure} />
                    </div>

                    <div style={{ flex: 1 }} />

                    {/* Prix */}
                    <div style={{ fontSize: 14, fontWeight: 800, color: w.prix === 0 ? C.green : C.text }}>
                      {w.prix === 0 ? "🎁 Gratuit" : w.prix + " €"}
                    </div>

                    {/* Bouton inscription */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      <button onClick={() => handleInscription(w)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: isInscribed ? C.greenBg : C.gradient, color: isInscribed ? C.green : "#fff", fontSize: 13, fontWeight: 700, cursor: isInscribed ? "default" : "pointer" }}>
                        {isInscribed ? "✅ Inscrit·e" : "S'inscrire →"}
                      </button>
                      {isInscribed && w.lien_url && (
                        <a href={w.lien_url} target="_blank" rel="noreferrer" style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #7C3AED44", background: "#7C3AED11", color: "#7C3AED", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                          🔗 Lien de connexion
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Modal rappel email */}
                  {reminder === w.id && !isReminderSent && (
                    <div style={{ marginTop: 14, padding: 14, background: C.gradientBg, borderRadius: 12, border: "1px solid " + C.borderLight }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>📬 Recevoir un rappel 30 min avant ?</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input type="email" value={reminderEmail} onChange={e => setReminderEmail(e.target.value)} placeholder="votre@email.fr" style={{ flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                        <button onClick={() => handleSendReminder(w.id)} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Oui, me rappeler !</button>
                        <button onClick={() => setReminder(null)} style={{ padding: "8px 12px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textTer, fontSize: 13, cursor: "pointer" }}>Non merci</button>
                      </div>
                    </div>
                  )}
                  {isReminderSent && <p style={{ marginTop: 8, fontSize: 12, color: C.green }}>✅ Rappel programmé pour {reminderEmail}</p>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: C.textTer, marginBottom: 14 }}>📼 Webinaires passés</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {past.map(w => (
              <div key={w.id} style={{ padding: mob ? 14 : 18, background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight, opacity: 0.7 }}>
                <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: C.textSec, marginBottom: 2 }}>{w.titre}</h3>
                    <div style={{ fontSize: 11, color: C.textTer }}>📅 {new Date(w.date_heure).toLocaleDateString("fr-FR")}</div>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 8, background: C.borderLight, color: C.textTer, fontSize: 10, fontWeight: 600, alignSelf: "flex-start" }}>Terminé</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CTA pour les organismes/formateurs */}
      {user && (profile?.role === "organisme" || profile?.role === "formateur") && (
        <div style={{ marginTop: 32, padding: mob ? 16 : 24, background: C.gradientBg, borderRadius: 16, border: "1px solid " + C.borderLight, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: C.text, marginBottom: 12, fontWeight: 600 }}>Vous souhaitez proposer un webinaire ?</p>
          <Link href={profile.role === "organisme" ? "/dashboard/organisme" : "/dashboard/formateur"} style={{ padding: "10px 24px", borderRadius: 10, background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Soumettre un webinaire →</Link>
        </div>
      )}
    </div>
  );
}
