import { createClient } from "@/lib/supabase";

export const supabase = createClient();

// ============ TYPES ============

export type SessionPartie = { titre: string; date_debut: string; date_fin: string; modalite: string; lieu: string; adresse: string; lien_visio: string };
export type Session = { id: number; dates: string; lieu: string; adresse: string; modalite_session?: string | null; lien_visio?: string | null; code_postal?: string | null; parties?: SessionPartie[] | null };
export type Organisme = { id: number; nom: string; logo: string; description: string; user_id?: string; site_url?: string | null };
export type Formateur = { id: number; nom: string; bio: string; sexe: string; organisme_id: number | null; user_id?: string; site_url?: string | null; photo_url?: string | null };
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
  pending_update?: boolean;
  affiche_order: number | null;
  sessions?: Session[];
  formateur?: Formateur;
  organisme?: Organisme;
};
export type Avis = { id: number; formation_id: number; user_id: string; user_name: string; note: number; texte: string; created_at: string; note_contenu: number | null; note_organisation: number | null; note_supports: number | null; note_pertinence: number | null };
export type Inscription = { id: number; user_id: string; formation_id: number; session_id?: number | null; status: string };
export type Favori = { id: number; user_id: string; formation_id: number };
export type AdminNotification = { id: number; type: string; formation_id: number; user_id: string; message: string; is_read: boolean; created_at: string };
export type DomaineAdmin = { 
  id: number; 
  nom: string; 
  emoji: string; 
  afficher_sur_accueil: boolean; 
  ordre_affichage: number;
  afficher_dans_filtres: boolean;
  created_at?: string;
};

// ============ FETCH FUNCTIONS ============

// ============ CACHE ============
let _formationsCache: Formation[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 0; // No cache - always fresh (can re-enable after launch)

// Public: all formations with cache
export async function fetchFormations(): Promise<Formation[]> {
  const now = Date.now();
  if (_formationsCache && now - _cacheTime < CACHE_TTL) return _formationsCache;
  const { data, error } = await supabase
    .from("formations")
    .select("*, sessions(*), formateur:formateurs(id,nom,sexe,bio,organisme_id), organisme:organismes(id,nom,logo)")
    .eq("status", "publiee")
    .order("date_ajout", { ascending: false });
  if (error) { console.error("fetchFormations error:", error); return _formationsCache || []; }
  const result = data || [];
  _formationsCache = result;
  _cacheTime = now;
  return result;
}

export function invalidateCache() { _formationsCache = null; _cacheTime = 0; }

export async function fetchFormation(id: number): Promise<Formation | null> {
  // Try cache first
  if (_formationsCache) {
    const cached = _formationsCache.find(f => f.id === id);
    if (cached) return cached;
  }
  const { data, error } = await supabase
    .from("formations")
    .select("*, sessions(*, session_parties(*)), formateur:formateurs(id,nom,sexe,bio), organisme:organismes(id,nom,logo)")
    .eq("id", id)
    .single();
  if (error) { console.error("fetchFormation error:", error); return null; }
  return data;
}

// All formations (for dashboards - includes pending)
export async function fetchAllFormations(): Promise<Formation[]> {
  const { data, error } = await supabase
    .from("formations")
    .select("*, sessions(*), formateur:formateurs(id,nom,sexe,bio,organisme_id), organisme:organismes(id,nom,logo)")
    .eq("status", "publiee")
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

// ============ DOMAINES ADMIN ============

// Fetch all domaines (for filters)
export async function fetchDomainesAdmin(): Promise<DomaineAdmin[]> {
  const { data, error } = await supabase
    .from("domaines_admin")
    .select("*")
    .order("ordre_affichage", { ascending: true });
  if (error) { console.error("fetchDomainesAdmin error:", error); return []; }
  return data || [];
}

// Fetch only domaines that should appear on homepage
export async function fetchDomainesAccueil(): Promise<DomaineAdmin[]> {
  const { data, error } = await supabase
    .from("domaines_admin")
    .select("*")
    .eq("afficher_sur_accueil", true)
    .order("ordre_affichage", { ascending: true });
  if (error) { console.error("fetchDomainesAccueil error:", error); return []; }
  return data || [];
}

// Fetch only domaines that should appear in filters
export async function fetchDomainesFiltres(): Promise<DomaineAdmin[]> {
  const { data, error } = await supabase
    .from("domaines_admin")
    .select("*")
    .eq("afficher_dans_filtres", true)
    .order("ordre_affichage", { ascending: true });
  if (error) { console.error("fetchDomainesFiltres error:", error); return []; }
  return data || [];
}

// Create a new domaine
export async function createDomaineAdmin(domaine: Omit<DomaineAdmin, 'id' | 'created_at'>): Promise<DomaineAdmin | null> {
  const { data, error } = await supabase
    .from("domaines_admin")
    .insert(domaine)
    .select();
  if (error) { 
    console.error("createDomaineAdmin error:", error.message || error); 
    throw new Error(error.message || "Erreur lors de la création du domaine");
  }
  return data?.[0] || null;
}

// Update a domaine
export async function updateDomaineAdmin(id: number, updates: Partial<DomaineAdmin>): Promise<boolean> {
  const { error } = await supabase
    .from("domaines_admin")
    .update(updates)
    .eq("id", id);
  if (error) { console.error("updateDomaineAdmin error:", error); return false; }
  return true;
}

// Delete a domaine
export async function deleteDomaineAdmin(id: number): Promise<boolean> {
  const { error } = await supabase
    .from("domaines_admin")
    .delete()
    .eq("id", id);
  if (error) { console.error("deleteDomaineAdmin error:", error); return false; }
  return true;
}
