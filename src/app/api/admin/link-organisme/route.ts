import { NextRequest, NextResponse } from "next/server";
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
  const { data: callerProfile } = await supabaseAuth.from("profiles").select("role").eq("id", caller.id).single();
  if (callerProfile?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { organisme_id, email } = await req.json();
  if (!organisme_id || !email) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Trouver l'utilisateur par email
  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: "Erreur recherche utilisateur" }, { status: 500 });
  const target = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!target) {
    // Utilisateur inexistant : envoyer une invitation
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { organisme_id, role: "organisme" },
      redirectTo: `${siteUrl}/auth/callback`,
    });
    if (inviteErr) return NextResponse.json({ error: "Erreur envoi invitation : " + inviteErr.message }, { status: 500 });
    return NextResponse.json({ invited: true });
  }

  // Supprimer l'éventuel organisme vide auto-créé pour cet utilisateur (doublon)
  const { data: existingOrgs } = await admin.from("organismes").select("id").eq("user_id", target.id).neq("id", organisme_id);
  if (existingOrgs?.length) {
    const idsToDelete = existingOrgs.map((o: any) => o.id);
    await admin.from("formations").update({ organisme_id: organisme_id }).in("organisme_id", idsToDelete);
    await admin.from("formateurs").update({ organisme_id: organisme_id }).in("organisme_id", idsToDelete);
    await admin.from("organismes").delete().in("id", idsToDelete);
  }

  // Lier l'organisme au user_id
  const { error: orgErr } = await admin.from("organismes").update({ user_id: target.id }).eq("id", organisme_id);
  if (orgErr) return NextResponse.json({ error: "Erreur mise à jour organisme" }, { status: 500 });

  // Passer le profil en rôle organisme
  const { error: profErr } = await admin.from("profiles").update({ role: "organisme" }).eq("id", target.id);
  if (profErr) return NextResponse.json({ error: "Erreur mise à jour profil" }, { status: 500 });

  return NextResponse.json({ ok: true, user_id: target.id });
}
