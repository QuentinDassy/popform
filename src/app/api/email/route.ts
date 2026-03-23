import { NextResponse, type NextRequest } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "PopForm <noreply@popform.fr>";
const ADMIN_TO = "quentin.dassy@gmail.com";
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://popform.fr";

function esc(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) { console.error("[email] RESEND_API_KEY not set — email not sent"); return; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const result = await res.json();
  if (!res.ok) console.error("[email] Resend error:", result);
  else console.log("[email] Sent to", to, "— id:", result.id);
}

function brandedHtml(title: string, body: string) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#FAF8F4;font-family:system-ui,sans-serif">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06)">
  <div style="background:linear-gradient(135deg,#D42B2B,#E85555);padding:28px 32px">
    <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">🍿 PopForm</div>
  </div>
  <div style="padding:32px">
    <h1 style="font-size:20px;font-weight:800;color:#2D1B06;margin:0 0 16px">${title}</h1>
    ${body}
  </div>
  <div style="padding:16px 32px 24px;border-top:1px solid #F0EBE3;font-size:11px;color:#A48C6A;text-align:center">
    PopForm — La plateforme de formations pour orthophonistes
  </div>
</div></body></html>`;
}

export async function POST(request: NextRequest) {
  try {
    const { type, ...data } = await request.json();
    if (type === "new_user") {
      const { email, role, full_name } = data;
      const roleLabel = role === "organisme" ? "Organisme" : "Formateur·rice";
      await sendEmail(
        ADMIN_TO,
        `Nouvelle inscription ${roleLabel} : ${esc(full_name || email)}`,
        brandedHtml(
          `Nouvel·le ${roleLabel} inscrit·e`,
          `<p style="color:#5C4A2A;font-size:14px;line-height:1.6;margin:0 0 12px">Un nouveau compte vient d'être créé sur PopForm :</p>
           <div style="background:#FAF8F4;border-radius:10px;padding:16px;margin-bottom:20px">
             <div style="font-size:15px;font-weight:700;color:#2D1B06;margin-bottom:4px">${esc(full_name || "—")}</div>
             <div style="font-size:13px;color:#A48C6A">${esc(email)} · ${roleLabel}</div>
           </div>
           <a href="${BASE_URL}/dashboard/admin" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#D42B2B,#E85555);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Voir le tableau de bord →</a>`
        )
      );
    }

    if (type === "new_formation") {
      // Formation soumise → email à l'admin
      const { titre, formateur_nom } = data;
      await sendEmail(
        ADMIN_TO,
        `Nouvelle formation soumise : ${titre}`,
        brandedHtml(
          "Nouvelle formation en attente de validation",
          `<p style="color:#5C4A2A;font-size:14px;line-height:1.6;margin:0 0 12px">Un formateur vient de soumettre une formation qui attend votre validation :</p>
           <div style="background:#FAF8F4;border-radius:10px;padding:16px;margin-bottom:20px">
             <div style="font-size:15px;font-weight:700;color:#2D1B06;margin-bottom:4px">${esc(titre)}</div>
             <div style="font-size:13px;color:#A48C6A">Formateur : ${esc(formateur_nom)}</div>
           </div>
           <a href="${BASE_URL}/dashboard/admin" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#D42B2B,#E85555);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Voir le tableau de bord →</a>`
        )
      );
    }

    if (type === "formation_accepted") {
      // Formation publiée → email au formateur
      const { user_id, formation_id, titre } = data;
      if (!user_id) return NextResponse.json({ ok: true });

      // Récupérer l'email du formateur via service role
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey) { console.warn("SUPABASE_SERVICE_ROLE_KEY not set"); return NextResponse.json({ ok: true }); }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user_id}`,
        { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
      );
      const userData = await res.json();
      const email = userData?.email;
      if (!email) return NextResponse.json({ ok: true });

      await sendEmail(
        email,
        `Votre formation "${titre}" est publiée !`,
        brandedHtml(
          "Votre formation est en ligne !",
          `<p style="color:#5C4A2A;font-size:14px;line-height:1.6;margin:0 0 12px">Bonne nouvelle ! Votre formation a été validée par notre équipe et est maintenant visible sur PopForm.</p>
           <div style="background:#FAF8F4;border-radius:10px;padding:16px;margin-bottom:20px">
             <div style="font-size:15px;font-weight:700;color:#2D1B06">${esc(titre)}</div>
           </div>
           <a href="${BASE_URL}/formation/${formation_id}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#D42B2B,#E85555);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Voir ma formation →</a>`
        )
      );
    }

    if (type === "organisme_validated") {
      // Compte organisme validé par l'admin → email à l'organisme
      const { user_id, nom } = data;
      if (!user_id) return NextResponse.json({ ok: true });

      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey) { console.warn("SUPABASE_SERVICE_ROLE_KEY not set"); return NextResponse.json({ ok: true }); }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user_id}`,
        { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
      );
      const userData = await res.json();
      const email = userData?.email;
      if (!email) return NextResponse.json({ ok: true });

      await sendEmail(
        email,
        "Votre compte PopForm est validé !",
        brandedHtml(
          "Bienvenue sur PopForm !",
          `<p style="color:#5C4A2A;font-size:14px;line-height:1.6;margin:0 0 12px">Bonne nouvelle ! Votre compte organisme <strong>${esc(nom || "")}</strong> a été validé par notre équipe. Vous pouvez maintenant publier vos formations.</p>
           <a href="${BASE_URL}/dashboard/organisme" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#D42B2B,#E85555);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Accéder à mon espace →</a>`
        )
      );
    }

    if (type === "duplicate_formation") {
      const { titre, formateur_nom, existing_titre } = data;
      await sendEmail(
        ADMIN_TO,
        `⚠️ Doublon possible : "${titre}"`,
        brandedHtml(
          "Formation similaire déjà existante",
          `<p style="color:#5C4A2A;font-size:14px;line-height:1.6;margin:0 0 12px">Un formateur vient de soumettre une formation dont le titre est proche d'une formation existante :</p>
           <div style="background:#FAF8F4;border-radius:10px;padding:16px;margin-bottom:12px">
             <div style="font-size:12px;color:#A48C6A;margin-bottom:4px">Nouvelle formation</div>
             <div style="font-size:15px;font-weight:700;color:#2D1B06">${esc(titre)}</div>
             <div style="font-size:13px;color:#A48C6A;margin-top:2px">Formateur : ${esc(formateur_nom)}</div>
           </div>
           <div style="background:#FFF8EC;border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid #E8D5A0">
             <div style="font-size:12px;color:#A48C6A;margin-bottom:4px">Formation existante similaire</div>
             <div style="font-size:15px;font-weight:700;color:#2D1B06">${esc(existing_titre)}</div>
           </div>
           <a href="${BASE_URL}/dashboard/admin" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#D42B2B,#E85555);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Vérifier dans le tableau de bord →</a>`
        )
      );
    }

    if (type === "newsletter_confirm") {
      const { email: to } = data;
      if (!to) return NextResponse.json({ ok: true });

      // Insert into newsletter_subscribers via service role (bypasses RLS)
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (serviceKey && supabaseUrl) {
        const res = await fetch(`${supabaseUrl}/rest/v1/newsletter_subscribers`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({ email: to.trim().toLowerCase(), created_at: new Date().toISOString() }),
        });
        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          console.error(`[newsletter] insert failed ${res.status}:`, errBody);
        }
      } else {
        console.error("[newsletter] missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
      }

      await sendEmail(
        to,
        "Bienvenue dans la newsletter PopForm 🍿",
        brandedHtml(
          "Vous êtes inscrit·e !",
          `<p style="color:#5C4A2A;font-size:14px;line-height:1.6;margin:0 0 16px">Merci de rejoindre la newsletter PopForm ! Vous recevrez chaque semaine les nouvelles formations, les actus et les séances à ne pas rater.</p>
           <a href="${BASE_URL}/catalogue" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#D42B2B,#E85555);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Voir le catalogue →</a>
           <p style="color:#A48C6A;font-size:12px;margin-top:20px">Pour vous désabonner, rendez-vous dans votre espace PopForm.</p>`
        )
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Email API error:", e);
    return NextResponse.json({ ok: true }); // ne jamais bloquer l'utilisateur
  }
}
