import { createClient } from "./supabase";
import type { Formation } from "./constants";

const supabase = () => createClient();

// ═══ Formations ═══

export async function getFormations(options?: {
  search?: string;
  domaine?: string;
  modalite?: string;
  ville?: string;
  priseEnCharge?: string;
  sort?: string;
  limit?: number;
}) {
  const sb = supabase();
  let query = sb
    .from("formations")
    .select(
      `
      *,
      domaines ( name, slug, icon, color ),
      organismes ( id, name, slug, logo_url, website ),
      formateurs ( id, full_name, slug, bio, photo_url ),
      sessions ( id, date_label, lieu, ville, date_debut )
    `
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (options?.search) {
    query = query.textSearch("fts", options.search, {
      type: "websearch",
      config: "french",
    });
  }
  if (options?.domaine) {
    query = query.eq("domaines.slug", options.domaine);
  }
  if (options?.modalite) {
    query = query.eq("modalite", options.modalite);
  }
  if (options?.ville) {
    query = query.eq("sessions.ville", options.ville);
  }
  if (options?.priseEnCharge) {
    query = query.contains("prise_en_charge", [options.priseEnCharge]);
  }
  if (options?.sort === "prix-asc") query = query.order("prix", { ascending: true });
  else if (options?.sort === "prix-desc") query = query.order("prix", { ascending: false });
  else if (options?.sort === "note") query = query.order("average_rating", { ascending: false });

  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getFormationBySlug(slug: string) {
  const sb = supabase();
  const { data, error } = await sb
    .from("formations")
    .select(
      `
      *,
      domaines ( name, slug, icon, color ),
      organismes ( id, name, slug, logo_url, website ),
      formateurs ( id, full_name, slug, bio, photo_url ),
      sessions ( id, date_label, lieu, ville, date_debut, places_restantes )
    `
    )
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (error) throw error;
  return data;
}

export async function getNewFormations(limit = 6) {
  const sb = supabase();
  const { data } = await sb
    .from("formations")
    .select(
      `*, domaines(name, slug, icon, color), organismes(id, name, slug),
       formateurs(id, full_name, slug), sessions(id, date_label, lieu, ville)`
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getFormationsByDomaine(domaineSlug: string, limit = 6) {
  const sb = supabase();
  const { data } = await sb
    .from("formations")
    .select(
      `*, domaines!inner(name, slug, icon, color), organismes(id, name, slug),
       formateurs(id, full_name, slug), sessions(id, date_label, lieu, ville)`
    )
    .eq("status", "approved")
    .eq("domaines.slug", domaineSlug)
    .order("average_rating", { ascending: false })
    .limit(limit);
  return data || [];
}

// ═══ Domaines ═══

export async function getDomaines() {
  const sb = supabase();
  const { data } = await sb
    .from("domaines")
    .select("*")
    .order("sort_order");
  return data || [];
}

// ═══ Favoris ═══

export async function getFavoris(userId: string) {
  const sb = supabase();
  const { data } = await sb
    .from("favoris")
    .select("formation_id")
    .eq("user_id", userId);
  return (data || []).map((f) => f.formation_id);
}

export async function toggleFavori(userId: string, formationId: string) {
  const sb = supabase();
  // Check if exists
  const { data: existing } = await sb
    .from("favoris")
    .select("id")
    .eq("user_id", userId)
    .eq("formation_id", formationId)
    .single();

  if (existing) {
    await sb.from("favoris").delete().eq("id", existing.id);
    return false; // removed
  } else {
    await sb.from("favoris").insert({ user_id: userId, formation_id: formationId });
    return true; // added
  }
}

// ═══ Avis ═══

export async function getAvis(formationId: string) {
  const sb = supabase();
  const { data } = await sb
    .from("avis")
    .select("*, profiles(full_name, avatar_url)")
    .eq("formation_id", formationId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function submitAvis(
  userId: string,
  formationId: string,
  rating: number,
  comment?: string
) {
  const sb = supabase();
  const { error } = await sb.from("avis").upsert(
    {
      user_id: userId,
      formation_id: formationId,
      rating,
      comment: comment || null,
    },
    { onConflict: "user_id,formation_id" }
  );
  if (error) throw error;
}

// ═══ Newsletter ═══

export async function subscribeNewsletter(email: string) {
  const sb = supabase();
  const { error } = await sb
    .from("newsletter_subscribers")
    .upsert({ email, is_active: true }, { onConflict: "email" });
  if (error) throw error;
}

// ═══ Auth helpers ═══

export async function getCurrentUser() {
  const sb = supabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}
