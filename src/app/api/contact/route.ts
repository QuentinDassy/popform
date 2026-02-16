import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { nom, email, message } = await req.json();
    if (!nom || !email || !message) return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

    // Store in Supabase admin_notifications table
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await supabase.from("admin_notifications").insert({
      type: "contact",
      message: `[Contact] ${nom} (${email}): ${message.slice(0, 500)}`,
    });

    console.log(`[CONTACT] From: ${nom} <${email}> — ${message.slice(0, 200)}`);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
