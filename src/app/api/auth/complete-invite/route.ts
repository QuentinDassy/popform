import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(_req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });

  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(url, anonKey, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const organisme_id = user.user_metadata?.organisme_id;
  if (!organisme_id) return NextResponse.json({ ok: true, skipped: true });

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Supprimer l'éventuel organisme auto-créé en doublon
  const { data: existingOrgs } = await admin.from("organismes").select("id").eq("user_id", user.id).neq("id", organisme_id);
  if (existingOrgs?.length) {
    const idsToDelete = existingOrgs.map((o: any) => o.id);
    await admin.from("formations").update({ organisme_id }).in("organisme_id", idsToDelete);
    await admin.from("formateurs").update({ organisme_id }).in("organisme_id", idsToDelete);
    await admin.from("organismes").delete().in("id", idsToDelete);
  }

  await admin.from("organismes").update({ user_id: user.id }).eq("id", organisme_id);
  await admin.from("profiles").update({ role: "organisme" }).eq("id", user.id);

  return NextResponse.json({ ok: true });
}
