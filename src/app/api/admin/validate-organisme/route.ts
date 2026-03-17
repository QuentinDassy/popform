import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });

  // Vérifier que l'appelant est admin
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(url, anonKey, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });
  const { data: { user: caller } } = await supabaseAuth.auth.getUser();
  if (!caller) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: callerProf } = await admin.from("profiles").select("role").eq("id", caller.id).single();
  if (callerProf?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { user_id, organisme_nom } = await req.json();
  if (!user_id || !organisme_nom) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

  // Créer l'entrée organismes
  const { error: orgErr } = await admin.from("organismes").insert({ nom: organisme_nom, user_id });
  if (orgErr) return NextResponse.json({ error: "Erreur création organisme : " + orgErr.message }, { status: 500 });

  // Mettre à jour le profil en role=organisme
  await admin.from("profiles").update({ role: "organisme" }).eq("id", user_id);

  return NextResponse.json({ ok: true });
}
