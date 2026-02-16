import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

// ============ TYPES ============

export type Session = { id: number; dates: string; lieu: string; adresse: string };
export type Organisme = { id: number; nom: string; logo: string; description: string; user_id?: string };
export type Formateur = { id: number; nom: string; bio: string; sexe: string; organisme_id: number | null; user_id?: string };
export type Formation = {
  id: number; titre: string; sous_titre: string; description: string;
  domaine: string; modalite: string; prise_en_charge: string[];
  duree: string; formateur_id: number | null; organisme_id: number | null;
  prix: number; prix_salarie: number | null; prix_liberal: number | null; prix_dpc: number | null;
  note: number; nb_avis: number; is_new: boolean; date_ajout: string;
  populations: string[]; mots_cles: string[]; professions: string[];
  effectif: number; video_url: string; url_inscription: string;
  date_fin: string | null; sans_limite: boolean;
  status: string;
  affiche_order: number | null;
  sessions?: Session[];
  formateur?: Formateur;
  organisme?: Organisme;
};
export type Avis = { id: number; formation_id: number; user_id: string; user_name: string; note: number; texte: string; created_at: string; note_contenu: number | null; note_organisation: number | null; note_supports: number | null; note_pertinence: number | null };
export type Inscription = { id: number; user_id: string; formation_id: number; status: string };
export type Favori = { id: number; user_id: string; formation_id: number };
export type AdminNotification = { id: number; type: string; formation_id: number; user_id: string; message: string; is_read: boolean; created_at: string };

// ============ FETCH FUNCTIONS ============

// Public: all formations (RLS handles visibility)
export async function fetchFormations(): Promise<Formation[]> {
  const { data, error } = await supabase
    .from("formations")
    .select("*, sessions(*), formateur:formateurs(*), organisme:organismes(*)")
    .order("date_ajout", { ascending: false });
  if (error) { console.error("fetchFormations error:", error); return []; }
  return data || [];
}

export async function fetchFormation(id: number): Promise<Formation | null> {
  const { data, error } = await supabase
    .from("formations")
    .select("*, sessions(*), formateur:formateurs(*), organisme:organismes(*)")
    .eq("id", id)
    .single();
  if (error) { console.error("fetchFormation error:", error); return null; }
  return data;
}

// All formations (for dashboards - includes pending)
export async function fetchAllFormations(): Promise<Formation[]> {
  const { data, error } = await supabase
    .from("formations")
    .select("*, sessions(*), formateur:formateurs(*), organisme:organismes(*)")
    .order("date_ajout", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function fetchOrganismes(): Promise<Organisme[]> {
  const { data, error } = await supabase.from("organismes").select("*").order("nom");
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function fetchFormateurs(): Promise<(Formateur & { organisme?: Organisme })[]> {
  const { data, error } = await supabase.from("formateurs").select("*, organisme:organismes(*)").order("nom");
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function fetchAvis(formationId?: number): Promise<Avis[]> {
  let q = supabase.from("avis").select("*").order("created_at", { ascending: false });
  if (formationId) q = q.eq("formation_id", formationId);
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function addAvis(formationId: number, userId: string, userName: string, note: number, texte: string, subs?: { contenu: number; organisation: number; supports: number; pertinence: number }): Promise<Avis | null> {
  const { data, error } = await supabase.from("avis").insert({ formation_id: formationId, user_id: userId, user_name: userName, note, texte, note_contenu: subs?.contenu ?? null, note_organisation: subs?.organisation ?? null, note_supports: subs?.supports ?? null, note_pertinence: subs?.pertinence ?? null }).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function updateAvis(avisId: number, note: number, texte: string): Promise<boolean> {
  const { error } = await supabase.from("avis").update({ note, texte }).eq("id", avisId);
  if (error) { console.error(error); return false; }
  return true;
}

export async function fetchInscriptions(userId: string): Promise<Inscription[]> {
  const { data, error } = await supabase.from("inscriptions").select("*").eq("user_id", userId);
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function fetchFavoris(userId: string): Promise<Favori[]> {
  const { data, error } = await supabase.from("favoris").select("*").eq("user_id", userId);
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function toggleFavori(userId: string, formationId: number): Promise<boolean> {
  const { data: existing } = await supabase.from("favoris").select("id").eq("user_id", userId).eq("formation_id", formationId).single();
  if (existing) {
    await supabase.from("favoris").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("favoris").insert({ user_id: userId, formation_id: formationId });
    return true;
  }
}

// ============ ADMIN ============

export async function fetchAdminNotifications(): Promise<AdminNotification[]> {
  const { data, error } = await supabase.from("admin_notifications").select("*").order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function notifyAdmin(formationId: number, userId: string, message: string, type = "nouvelle_formation") {
  await supabase.from("admin_notifications").insert({ type, formation_id: formationId, user_id: userId, message });
}
