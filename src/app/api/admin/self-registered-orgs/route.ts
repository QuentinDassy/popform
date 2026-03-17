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

  // Récupérer tous les users auth avec role=organisme en paginant
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

  // Filtrer : role=organisme ET invited_at est null (= auto-inscrit, pas invité par admin)
  const selfRegistered = allUsers.filter(u =>
    (u.user_metadata?.role === "organisme" || u.app_metadata?.role === "organisme") &&
    !u.invited_at
  );

  // Récupérer les organismes correspondants
  const userIds = selfRegistered.map((u: any) => u.id);
  if (userIds.length === 0) return NextResponse.json({ orgs: [] });

  const { data: orgs } = await admin.from("organismes").select("id, nom, user_id, logo, description").in("user_id", userIds);

  // Fusionner avec les infos user (email, date inscription)
  const result = (orgs || []).map(o => {
    const authUser = selfRegistered.find(u => u.id === o.user_id);
    return {
      ...o,
      email: authUser?.email || "",
      created_at: authUser?.created_at || "",
    };
  });

  return NextResponse.json({ orgs: result });
}
