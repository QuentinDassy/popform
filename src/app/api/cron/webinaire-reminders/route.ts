import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "PopForm <noreply@popform.fr>";
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://popform.fr";
const CRON_SECRET = process.env.CRON_SECRET;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function sendReminderEmail(to: string, webinaireTitre: string, webinaireDate: string, lienUrl: string, webinaireId: number, minutesBefore: number) {
  if (!RESEND_API_KEY) return;
  const dateStr = new Date(webinaireDate).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const whenLabel = minutesBefore >= 60 * 24 * 7 ? "dans 7 jours" : minutesBefore >= 60 * 24 ? "demain" : minutesBefore >= 60 ? `dans ${Math.round(minutesBefore / 60)}h` : `dans ${minutesBefore} min`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#FAF8F4;font-family:system-ui,sans-serif">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06)">
  <div style="background:linear-gradient(135deg,#7C3AED,#4F46E5);padding:28px 32px">
    <div style="color:#fff;font-size:22px;font-weight:800">🍿 PopForm · Rappel webinaire</div>
  </div>
  <div style="padding:32px">
    <h1 style="font-size:20px;font-weight:800;color:#2D1B06;margin:0 0 8px">⏰ Rappel : ${whenLabel}</h1>
    <p style="color:#5C4A2A;font-size:14px;line-height:1.6;margin:0 0 16px">Votre webinaire commence ${whenLabel} :</p>
    <div style="background:#FAF8F4;border-radius:12px;padding:18px;margin-bottom:20px;border:1px solid #F0EBE3">
      <div style="font-size:16px;font-weight:800;color:#2D1B06;margin-bottom:6px">${webinaireTitre}</div>
      <div style="font-size:13px;color:#A48C6A">📅 ${dateStr}</div>
    </div>
    ${lienUrl ? `<a href="${lienUrl}" style="display:inline-block;padding:13px 24px;background:linear-gradient(135deg,#7C3AED,#4F46E5);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:16px">Rejoindre le webinaire →</a>` : ""}
    <p style="color:#A48C6A;font-size:12px;margin-top:16px">
      <a href="${BASE_URL}/webinaires/${webinaireId}" style="color:#7C3AED">Voir la page du webinaire</a>
    </p>
  </div>
  <div style="padding:16px 32px 24px;border-top:1px solid #F0EBE3;font-size:11px;color:#A48C6A;text-align:center">
    PopForm — Pour vous désabonner des rappels, rendez-vous sur la page du webinaire.
  </div>
</div></body></html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject: `⏰ Rappel ${whenLabel} : ${webinaireTitre}`, html }),
  });
}

export async function GET(request: NextRequest) {
  // Protect cron endpoint
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();
  const now = new Date();
  // Find all reminders that should be sent (scheduled_at is in the past or within 5 min, not yet sent)
  const window5min = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const { data: reminders, error } = await sb
    .from("webinaire_reminders")
    .select("*")
    .eq("sent", false)
    .lte("scheduled_at", window5min);

  if (error) {
    console.error("[cron] fetch reminders error:", error);
    return NextResponse.json({ ok: false, error: error.message });
  }

  let sent = 0;
  for (const r of reminders || []) {
    try {
      const webinaireDate = new Date(r.webinaire_date);
      const minutesBefore = Math.round((webinaireDate.getTime() - now.getTime()) / 60000);
      await sendReminderEmail(r.email, r.webinaire_titre, r.webinaire_date, r.lien_url || "", r.webinaire_id, minutesBefore);
      await sb.from("webinaire_reminders").update({ sent: true, sent_at: now.toISOString() }).eq("id", r.id);
      sent++;
    } catch (e) {
      console.error("[cron] send reminder error for id", r.id, e);
    }
  }

  return NextResponse.json({ ok: true, sent, total: (reminders || []).length });
}
