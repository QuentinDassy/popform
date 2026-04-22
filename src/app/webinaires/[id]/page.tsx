"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { C } from "@/lib/data";
import { supabase } from "@/lib/supabase-data";
import { useIsMobile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";

type Webinaire = {
  id: number;
  titre: string;
  description: string;
  date_heure: string;
  prix: number;
  lien_url: string;
  status: string;
  organisme_id: number | null;
  formateur_id: number | null;
  professions?: string[];
  organisme?: { nom: string; logo?: string } | null;
  formateur?: { nom: string; photo_url?: string } | null;
};

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    iso: d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z",
    isoLocal: d,
  };
}

function buildICS(w: Webinaire): string {
  const { iso, isoLocal } = formatDateFull(w.date_heure);
  const end = new Date(isoLocal.getTime() + 60 * 60 * 1000);
  const endIso = end.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const desc = (w.description || "").replace(/\n/g, "\\n");
  const url = w.lien_url || "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PopForm//Webinaire//FR",
    "BEGIN:VEVENT",
    `UID:webinaire-${w.id}@popform.fr`,
    `DTSTAMP:${iso}`,
    `DTSTART:${iso}`,
    `DTEND:${endIso}`,
    `SUMMARY:${w.titre}`,
    `DESCRIPTION:${desc}${url ? "\\n\\nLien: " + url : ""}`,
    url ? `URL:${url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

function buildGoogleCalLink(w: Webinaire): string {
  const start = new Date(w.date_heure);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: w.titre,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: (w.description || "") + (w.lien_url ? `\n\nLien: ${w.lien_url}` : ""),
    location: w.lien_url || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const REMINDER_OPTIONS = [
  { key: "7d", label: "7 jours avant" },
  { key: "1d", label: "1 jour avant" },
  { key: "1h", label: "1 heure avant" },
];

function getReminderTime(webinaireDateStr: string, key: string): Date {
  const t = new Date(webinaireDateStr).getTime();
  if (key === "7d") return new Date(t - 7 * 24 * 60 * 60 * 1000);
  if (key === "1d") return new Date(t - 24 * 60 * 60 * 1000);
  if (key === "1h") return new Date(t - 60 * 60 * 1000);
  return new Date(key); // custom ISO
}

export default function WebinairePage() {
  const { id } = useParams<{ id: string }>();
  const { user, setShowAuth } = useAuth();
  const mob = useIsMobile();
  const [w, setW] = useState<Webinaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [inscrit, setInscrit] = useState(false);
  const [inscribing, setInscribing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeReminders, setActiveReminders] = useState<string[]>([]);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);
  const [savingReminders, setSavingReminders] = useState(false);
  const [customReminderDate, setCustomReminderDate] = useState("");

  useEffect(() => {
    if (!id) return;
    supabase
      .from("webinaires")
      .select("*, organisme:organismes(nom, logo), formateur:formateurs(nom, photo_url)")
      .eq("id", id)
      .single()
      .then(({ data }: { data: Webinaire | null }) => {
        setW(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Check if user is already registered
  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("webinaire_inscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("webinaire_id", id)
      .maybeSingle()
      .then(({ data }: { data: { id: number } | null }) => {
        if (data) setInscrit(true);
      });
  }, [user, id]);

  // Load existing reminders
  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("webinaire_reminders")
      .select("reminder_type, scheduled_at")
      .eq("user_id", user.id)
      .eq("webinaire_id", id)
      .eq("sent", false)
      .then(({ data }: { data: { reminder_type: string; scheduled_at: string }[] | null }) => {
        if (data) setActiveReminders(data.map(r => r.reminder_type));
      });
  }, [user, id]);

  const handleInscrire = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!w) return;
    setInscribing(true);
    try {
      await supabase.from("webinaire_inscriptions").upsert(
        { user_id: user.id, webinaire_id: w.id },
        { onConflict: "user_id,webinaire_id", ignoreDuplicates: true }
      );
      setInscrit(true);
      setShowCalendar(true);
    } finally {
      setInscribing(false);
    }
  };

  const handleDownloadICS = () => {
    if (!w) return;
    const ics = buildICS(w);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webinaire-${w.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveReminders = async () => {
    if (!user || !w) { setShowAuth(true); return; }
    setSavingReminders(true);
    setReminderMsg(null);
    try {
      // Delete old unsent reminders for this webinaire
      await supabase.from("webinaire_reminders")
        .delete()
        .eq("user_id", user.id)
        .eq("webinaire_id", w.id)
        .eq("sent", false);

      // Get user email
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const email = authUser?.email;
      if (!email) { setSavingReminders(false); return; }

      const remindersToSave = [...activeReminders];
      if (customReminderDate) remindersToSave.push(customReminderDate);

      for (const key of remindersToSave) {
        const scheduledAt = getReminderTime(w.date_heure, key);
        if (scheduledAt > new Date()) {
          await supabase.from("webinaire_reminders").insert({
            user_id: user.id,
            email,
            webinaire_id: w.id,
            webinaire_titre: w.titre,
            webinaire_date: w.date_heure,
            lien_url: w.lien_url || "",
            reminder_type: key,
            scheduled_at: scheduledAt.toISOString(),
            sent: false,
          });
        }
      }
      setReminderMsg("✅ Rappels enregistrés ! Vous recevrez un email de PopForm.");
      setTimeout(() => setReminderMsg(null), 4000);
    } finally {
      setSavingReminders(false);
    }
  };

  const px = mob ? "0 14px" : "0 24px";

  if (loading) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: px, paddingTop: 60, textAlign: "center", color: C.textTer }}>
        Chargement…
      </div>
    );
  }

  if (!w) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: px, paddingTop: 60, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
        <p style={{ color: C.textSec }}>Ce webinaire est introuvable.</p>
        <Link href="/webinaires" style={{ color: C.accent, fontWeight: 700 }}>← Retour aux webinaires</Link>
      </div>
    );
  }

  const { date, time } = formatDateFull(w.date_heure);
  const now = new Date();
  const startTime = new Date(w.date_heure);
  const dureeMs = ((w as any).duree ?? 2) * 60 * 60 * 1000;
  const endTime = new Date(startTime.getTime() + dureeMs);
  const endTimeStr = endTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const isLive = now >= startTime && now < endTime;
  const isPast = now >= endTime;
  const googleLink = buildGoogleCalLink(w);
  const profs = w.professions || [];
  const profBadges: { label: string; color: string; bg: string }[] = [];
  if (profs.includes("Kinésithérapeutes")) profBadges.push({ label: "✋ Kinésithérapeutes", color: C.blue, bg: C.blueBg });
  if (profs.some(p => p === "Orthophonistes" || p === "Orthophonie")) profBadges.push({ label: "🗣️ Orthophonistes", color: C.accent, bg: C.accentBg });

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: px, paddingBottom: 60 }}>
      {/* Back */}
      <div style={{ paddingTop: 20, marginBottom: 20 }}>
        <Link href="/webinaires" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>
          ← Tous les webinaires
        </Link>
      </div>

      {/* Card */}
      <div style={{ background: C.surface, borderRadius: 20, border: "1.5px solid " + C.borderLight, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: mob ? "24px 20px 20px" : "32px 32px 24px", background: `linear-gradient(135deg, #7C3AED11 0%, #f0f4ff 100%)`, borderBottom: "1px solid " + C.borderLight }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: C.blueBg, color: C.blue }}>💻 Visio</span>
            {w.prix === 0
              ? <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: C.greenBg, color: C.green }}>Gratuit</span>
              : <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: C.bgAlt, color: C.textSec }}>{w.prix} €</span>}
            {isLive && <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: "#FEE2E2", color: "#DC2626", animation: "pulse 2s infinite" }}>🔴 EN DIRECT</span>}
            {isPast && <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: C.bgAlt, color: C.textTer }}>Passé</span>}
            {profBadges.map(b => (
              <span key={b.label} style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: b.bg, color: b.color }}>{b.label}</span>
            ))}
          </div>
          <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, lineHeight: 1.25, marginBottom: 16 }}>{w.titre}</h1>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: C.surface, borderRadius: 12, padding: "12px 16px", border: "1px solid " + C.borderLight }}>
            <span style={{ fontSize: 22 }}>📅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, textTransform: "capitalize" }}>{date}</div>
              <div style={{ fontSize: 13, color: C.textTer }}>de {time} à {endTimeStr}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: mob ? "20px 20px" : "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Description */}
          {w.description && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>À propos</div>
              <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{w.description}</p>
            </div>
          )}

          {/* Organisme / formateur */}
          {(w.organisme?.nom || w.formateur?.nom) && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {w.organisme?.nom && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: C.bgAlt, borderRadius: 10, border: "1px solid " + C.borderLight }}>
                  <span style={{ fontSize: 18 }}>🏢</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{w.organisme.nom}</span>
                </div>
              )}
              {w.formateur?.nom && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: C.bgAlt, borderRadius: 10, border: "1px solid " + C.borderLight }}>
                  <span style={{ fontSize: 18 }}>🎤</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{w.formateur.nom}</span>
                </div>
              )}
            </div>
          )}

          {/* INSCRIPTION + ACTIONS */}
          {!isPast && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* S'inscrire */}
              {inscrit ? (
                <div style={{ padding: "14px 20px", borderRadius: 14, background: C.greenBg, border: "1.5px solid " + C.green + "44", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Vous êtes inscrit·e !</div>
                    <div style={{ fontSize: 12, color: C.green + "BB" }}>L&apos;événement est enregistré dans votre compte.</div>
                  </div>
                  {w.lien_url && (
                    <a href={w.lien_url} target="_blank" rel="noopener noreferrer"
                      style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 10, background: isLive ? "#DC2626" : C.green, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                      {isLive ? "🔴 Rejoindre la visio" : "Rejoindre la visio →"}
                    </a>
                  )}
                </div>
              ) : (
                <button onClick={handleInscrire} disabled={inscribing}
                  style={{ display: "block", width: "100%", padding: "15px 24px", borderRadius: 14, background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: inscribing ? "default" : "pointer", opacity: inscribing ? 0.6 : 1 }}>
                  {inscribing ? "⏳ Inscription…" : "✍️ S'inscrire au webinaire"}
                </button>
              )}

              {/* Calendrier — visible si inscrit OU si on clique */}
              {(inscrit || showCalendar) && (
                <div style={{ padding: "18px 20px", background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.05em" }}>📅 Ajouter à mon calendrier</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={handleDownloadICS}
                      style={{ flex: 1, minWidth: 150, padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      📥 Apple / Outlook (.ics)
                    </button>
                    <a href={googleLink} target="_blank" rel="noopener noreferrer"
                      style={{ flex: 1, minWidth: 150, padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      📅 Google Agenda
                    </a>
                  </div>
                </div>
              )}

              {/* Rappels par email — visible si inscrit */}
              {inscrit && (
                <div style={{ padding: "18px 20px", background: C.bgAlt, borderRadius: 14, border: "1px solid " + C.borderLight, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.05em" }}>🔔 Rappels par email PopForm</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {REMINDER_OPTIONS.map(opt => {
                      const reminderDate = getReminderTime(w.date_heure, opt.key);
                      const isFuture = reminderDate > new Date();
                      if (!isFuture) return null;
                      const active = activeReminders.includes(opt.key);
                      return (
                        <button key={opt.key} onClick={() => setActiveReminders(prev => active ? prev.filter(x => x !== opt.key) : [...prev, opt.key])}
                          style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid " + (active ? "#7C3AED44" : C.border), background: active ? "#7C3AED11" : C.surface, color: active ? "#7C3AED" : C.textSec, fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer" }}>
                          {active ? "✓ " : ""}{opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: C.textTer, display: "block", marginBottom: 4 }}>Heure personnalisée</label>
                    <input type="datetime-local" value={customReminderDate} onChange={e => setCustomReminderDate(e.target.value)}
                      max={w.date_heure}
                      style={{ padding: "8px 12px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 12, fontFamily: "inherit" }} />
                  </div>
                  {reminderMsg && <p style={{ fontSize: 13, color: reminderMsg.startsWith("✅") ? C.green : C.pink, margin: 0 }}>{reminderMsg}</p>}
                  <button onClick={handleSaveReminders} disabled={savingReminders || (activeReminders.length === 0 && !customReminderDate)}
                    style={{ alignSelf: "flex-start", padding: "9px 20px", borderRadius: 10, border: "none", background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (savingReminders || (activeReminders.length === 0 && !customReminderDate)) ? "default" : "pointer", opacity: (savingReminders || (activeReminders.length === 0 && !customReminderDate)) ? 0.5 : 1 }}>
                    {savingReminders ? "⏳ Enregistrement…" : "Enregistrer les rappels"}
                  </button>
                </div>
              )}

              {/* Rejoindre directement sans inscription */}
              {!inscrit && w.lien_url && (
                <a href={w.lien_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", padding: "12px 20px", borderRadius: 12, border: "1.5px solid " + C.border, background: C.surface, color: C.textSec, fontSize: 13, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
                  💻 Rejoindre directement la visio (sans s&apos;inscrire)
                </a>
              )}
              {!inscrit && w.lien_url && (
                <button onClick={() => setShowCalendar(!showCalendar)}
                  style={{ background: "none", border: "none", color: C.textTer, fontSize: 12, cursor: "pointer", textDecoration: "underline", textAlign: "left" }}>
                  📅 Ajouter directement au calendrier (sans s&apos;inscrire)
                </button>
              )}
              {!inscrit && showCalendar && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={handleDownloadICS}
                    style={{ flex: 1, minWidth: 150, padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    📥 Apple / Outlook (.ics)
                  </button>
                  <a href={googleLink} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, minWidth: 150, padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    📅 Google Agenda
                  </a>
                </div>
              )}
            </div>
          )}

          {isPast && (
            <div style={{ padding: "14px 18px", borderRadius: 12, background: C.bgAlt, border: "1px solid " + C.borderLight, color: C.textTer, fontSize: 13, textAlign: "center" }}>
              Ce webinaire a eu lieu. Consultez les prochains webinaires disponibles.
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Link href="/webinaires" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Voir tous les webinaires</Link>
      </div>
    </div>
  );
}
