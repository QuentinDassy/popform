import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(_req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });

  // Vérifier que l'appelant est admin
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(url, anonKey, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  // Récupérer tous les users auth en paginant
  const allUsers: any[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    });
    const data = await res.json();
    const batch = data.users || [];
    allUsers.push(...batch);
    if (batch.length < 1000) break;
    page++;
  }

  // Filtrer : role=organisme dans les metadata ET invited_at est null (= auto-inscrit)
  const candidates = allUsers.filter(u => {
    const role = u.user_metadata?.role || u.app_metadata?.role;
    return role === "organisme" && !u.invited_at;
  });

  if (candidates.length === 0) return NextResponse.json({ orgs: [] });

  // Exclure ceux qui ont déjà un organisme lié dans la DB (déjà validés)
  const candidateIds = candidates.map((u: any) => u.id);
  const { data: linkedOrgs } = await admin.from("organismes").select("user_id").in("user_id", candidateIds);
  const alreadyLinked = new Set((linkedOrgs || []).map((o: any) => o.user_id));

  const result = candidates
    .filter((u: any) => !alreadyLinked.has(u.id))
    .map((u: any) => ({
      user_id: u.id,
      email: u.email || "",
      created_at: u.created_at || "",
      organisme_nom: u.user_metadata?.organisme_nom || u.user_metadata?.full_name || u.email || "",
    }));

  return NextResponse.json({ orgs: result });
}
