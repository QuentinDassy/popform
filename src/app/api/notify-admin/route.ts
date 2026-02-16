import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "quentin.dassy@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Supabase webhook sends: { type, table, record, schema, old_record }
    const record = body.record || body;
    const titre = record.titre || "Sans titre";
    const status = record.status || "en_attente";
    const domaine = record.domaine || "";
    const prix = record.prix || 0;

    // Only notify for pending formations
    if (status !== "en_attente") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Send email via Supabase's built-in email (or use Resend/Brevo later)
    // For now, we use a simple fetch to a free email API
    // You can replace this with Resend, Brevo, or any SMTP service

    // Option: Use Supabase Edge Function with Resend
    // For MVP, we log and rely on the admin_notifications table
    console.log(`[ADMIN NOTIFICATION] Nouvelle formation en attente: "${titre}" (${domaine}, ${prix}€)`);

    // If you add Resend API key later, uncomment this:
    /*
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "PopForm <noreply@popform.fr>",
          to: [ADMIN_EMAIL],
          subject: `🍿 Nouvelle formation en attente: ${titre}`,
          html: `
            <h2>Nouvelle formation en attente de validation</h2>
            <p><strong>${titre}</strong></p>
            <p>Domaine: ${domaine}</p>
            <p>Prix: ${prix}€</p>
            <p>Status: ${status}</p>
            <br/>
            <p><a href="https://popform-k2t5.vercel.app/dashboard/admin">→ Accéder au dashboard admin</a></p>
          `,
        }),
      });
    }
    */

    return NextResponse.json({ ok: true, message: `Notification logged for: ${titre}` });
  } catch (error) {
    console.error("Notify admin error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
