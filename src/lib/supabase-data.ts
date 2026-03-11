import { createClient } from "@/lib/supabase";

export const supabase = createClient();

// ============ TYPES ============

export type SessionPartie = { titre: string; date_debut: string; date_fin: string; modalite: string; lieu: string; adresse: string; lien_visio: string };
export type Session = { id: number; dates: string; lieu: string; adresse: string; modalite_session?: string | null; lien_visio?: string | null; code_postal?: string | null; parties?: SessionPartie[] | null };
export type Organisme = { id: number; nom: string; logo: string; description: string; user_id?: string; site_url?: string | null };
export type Formateur = { id: number; nom: string; bio: string; sexe: string; organisme_id: number | null; user_id?: string; site_url?: string | null; photo_url?: string | null };
export type Formation = {
  id: number; titre: string; sous_titre: string; description: string;
  domaine: string; domaines?: string[]; modalite: string; prise_en_charge: string[];
  duree: string; formateur_id: number | null; formateur_ids?: number[] | null; organisme_id: number | null;
  prix: number; prix_salarie: number | null; prix_liberal: number | null; prix_dpc: number | null;
  prix_extras?: { label: string; value: number }[];
  note: number; nb_avis: number; is_new: boolean; date_ajout: string;
  populations: string[]; mots_cles: string[]; professions: string[];
  effectif: number; video_url: string; url_inscription: string;
  date_fin: string | null; sans_limite: boolean;
  status: string; photo_url?: string | null;
  pending_update?: boolean;
  affiche_order: number | null;
  sessions?: Session[];
  formateur?: Formateur;
  formateurs?: Formateur[];
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
const MEM_TTL = 2 * 60 * 1000;        // 2 min in-memory
const LS_TTL  = 4 * 60 * 60 * 1000;  // 4h localStorage (survives long inactivity)
const LS_KEY  = "pf_formations_v3";

function lsRead(): { data: Formation[]; t: number } | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function lsWrite(data: Formation[]) {
  try { if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify({ data, t: Date.now() })); } catch {}
}

// Public: formations with stale-while-revalidate
// Returns instantly from cache (localStorage or memory), refreshes in background
export async function fetchFormations(): Promise<Formation[]> {
  const now = Date.now();

  // 1. Memory cache (hot — same session, < 2 min)
  if (_formationsCache && now - _cacheTime < MEM_TTL) return _formationsCache;

  // 2. localStorage cache (warm — survived navigation/new tab, < 4h)
  const ls = lsRead();
  if (ls && now - ls.t < LS_TTL) {
    _formationsCache = ls.data;
    _cacheTime = ls.t;
    // Revalidate in background without blocking
    _fetchAndStore().catch(() => {});
    return ls.data;
  }

  // 3. Cold fetch (no cache or expired)
  return _fetchAndStore();
}

async function _fetchAndStore(): Promise<Formation[]> {
  try {
    const { data, error } = await supabase.from("formations").select("*, domaines, prix_extras, sessions(*, session_parties(lieu,ville)), formateur:formateurs(id,nom,sexe,bio,organisme_id), organisme:organismes(id,nom,logo)").eq("status", "publiee").order("date_ajout", { ascending: false });
    if (error) { console.error("fetchFormations error:", error); return _formationsCache || lsRead()?.data || []; }
    const result = data || [];
    // Batch-fetch formateurs for multi-formateur formations
    const multiIds = new Set<number>();
    result.forEach((f: any) => { if (f.formateur_ids?.length > 1) f.formateur_ids.forEach((id: number) => multiIds.add(id)); });
    if (multiIds.size > 0) {
      const { data: fmts } = await supabase.from("formateurs").select("id,nom,sexe,bio,organisme_id").in("id", Array.from(multiIds));
      if (fmts) {
        result.forEach((f: any) => {
          if (f.formateur_ids?.length > 1) {
            f.formateurs = fmts.filter((fm: any) => f.formateur_ids.includes(fm.id));
          }
        });
      }
    }
    _formationsCache = result;
    _cacheTime = Date.now();
    lsWrite(result);
    return result;
  } catch (e) {
    console.warn("fetchFormations error:", e);
    return _formationsCache || lsRead()?.data || [];
  }
}

export function invalidateCache() {
  _formationsCache = null;
  _cacheTime = 0;
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_KEY);
      // Also clear all per-formation caches
      const keys = Object.keys(localStorage).filter(k => k.startsWith(LS_FORMATION_PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
    }
  } catch {}
}

// Per-formation cache (id → {data, t})
const LS_FORMATION_PREFIX = "pf_formation_v1_";
const FORMATION_TTL = 5 * 60 * 1000; // 5 min

function lsReadFormation(id: number): { data: Formation; t: number } | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LS_FORMATION_PREFIX + id) : null;
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function lsWriteFormation(id: number, data: Formation) {
  try { if (typeof window !== "undefined") localStorage.setItem(LS_FORMATION_PREFIX + id, JSON.stringify({ data, t: Date.now() })); } catch {}
}

export async function fetchFormation(id: number): Promise<Formation | null> {
  // 1. Per-formation localStorage cache (< 5 min)
  const cached = lsReadFormation(id);
  if (cached && Date.now() - cached.t < FORMATION_TTL) {
    // Revalidate in background
    _fetchFormationRemote(id).then(f => { if (f) lsWriteFormation(id, f); }).catch(() => {});
    return cached.data;
  }
  // 2. Cold fetch — don't fall back to list cache: it only has (lieu,ville) for session_parties,
  //    which would make dates invisible on first load.
  return _fetchFormationRemote(id);
}

async function _fetchFormationRemote(id: number): Promise<Formation | null> {
  try {
    const { data, error } = await supabase
      .from("formations")
      .select("*, domaines, prix_extras, sessions(*, session_parties(*)), formateur:formateurs(id,nom,sexe,bio,photo_url,site_url), organisme:organismes(id,nom,logo,site_url)")
      .eq("id", id)
      .maybeSingle();
    if (error) { console.error("fetchFormation error:", error); return null; }
    if (data) {
      const ids: number[] = (data as any).formateur_ids?.length
        ? (data as any).formateur_ids
        : (data.formateur_id ? [data.formateur_id] : []);
      if (ids.length > 0) {
        const { data: fmts } = await supabase.from("formateurs").select("id,nom,sexe,bio,photo_url,site_url").in("id", ids);
        (data as any).formateurs = fmts || [];
      } else {
        (data as any).formateurs = data.formateur ? [data.formateur] : [];
      }
      lsWriteFormation(id, data);
    }
    return data;
  } catch (e) {
    console.warn("fetchFormation error:", e);
    return null;
  }
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

export async function fetchFormationsFaites(userId: string): Promise<number[]> {
  const { data } = await supabase.from("formations_faites").select("formation_id").eq("user_id", userId);
  return (data || []).map((r: any) => r.formation_id as number);
}

export async function toggleFormationFaite(userId: string, formationId: number): Promise<boolean> {
  const { data: existing } = await supabase.from("formations_faites").select("id").eq("user_id", userId).eq("formation_id", formationId).maybeSingle();
  if (existing) {
    await supabase.from("formations_faites").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("formations_faites").insert({ user_id: userId, formation_id: formationId });
    return true;
  }
}
