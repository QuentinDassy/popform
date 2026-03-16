// src/lib/data.ts — Design tokens, photos, helpers
// Types and data fetching are in supabase-data.ts

import type { Formation as FormationType } from "./supabase-data";
export type { Formation, Formateur, Organisme, Avis, Session, Inscription, Favori, AdminNotification, DomaineAdmin } from "./supabase-data";
export {
  fetchFormations, fetchFormation, fetchAllFormations, fetchOrganismes, fetchFormateurs,
  fetchAvis, addAvis, updateAvis, deleteAvis, fetchInscriptions, fetchFavoris, toggleFavori,
  fetchAdminNotifications, notifyAdmin, invalidateCache,
  fetchDomainesAdmin, fetchDomainesAccueil, fetchDomainesFiltres, createDomaineAdmin, updateDomaineAdmin, deleteDomaineAdmin,
  fetchFormationsFaites, toggleFormationFaite
} from "./supabase-data";

export const C = {
  bg: "#FFFDF7", bgAlt: "#FFF8EC", surface: "#FFFFFF",
  border: "#F0E4CC", borderLight: "#F5EDD8",
  text: "#2D1B06", textSec: "#6B4F2D", textTer: "#A48C6A",
  accent: "#D42B2B", accentBg: "rgba(212,43,43,0.07)", accentDark: "#A91E1E",
  yellow: "#F5B731", yellowBg: "rgba(245,183,49,0.1)", yellowDark: "#D49A1A",
  cream: "#FFF3D6",
  green: "#2A9D6E", greenBg: "rgba(42,157,110,0.08)",
  blue: "#2E7CE6", blueBg: "rgba(46,124,230,0.08)",
  pink: "#E84575", pinkBg: "rgba(232,69,117,0.08)",
  orange: "#E87B35",
  gradient: "linear-gradient(135deg, #D42B2B, #E84545, #F5B731)",
  gradientSoft: "linear-gradient(135deg, #D42B2B, #E84545)",
  gradientBg: "linear-gradient(135deg, rgba(245,183,49,0.08), rgba(212,43,43,0.05))",
  gradientHero: "linear-gradient(160deg, #FFF8EC 0%, #FFFDF7 30%, #FFF3D6 60%, #FFFDF7 100%)",
};

export const PHOTOS: Record<string, string> = {
  "Langage oral": "/langageoral.png",
  "Langage écrit": "/langageécrit.png",
  "Cognition mathématique": "/cognitionmath.png",
  "Neurologie": "/neurologiepf.png",
  "Pratique professionnelle": "/pratiquepro.png",
  "OMF": "/omfpf.png",
  "Oralité": "/oralitepf.png",
  "Voix": "/Voix.png",
  "Bégaiement": "/begaiement.png",
  "Handicap": "/handicappf.png",
  "TSA": "/tsa.png",
  "Relation orthophonique": "/relationortho.png",
  "default": "/langageoral.png",
};

export const DOMAIN_PHOTO_CHOICES = [
  { label: "Langage oral", src: "/langageoral.png" },
  { label: "Langage écrit", src: "/langageécrit.png" },
  { label: "Cognition math.", src: "/cognitionmath.png" },
  { label: "Neurologie", src: "/neurologiepf.png" },
  { label: "Pratique prof.", src: "/pratiquepro.png" },
  { label: "OMF", src: "/omfpf.png" },
  { label: "Oralité", src: "/oralitepf.png" },
  { label: "Voix", src: "/Voix.png" },
  { label: "Bégaiement", src: "/begaiement.png" },
  { label: "Handicap", src: "/handicappf.png" },
  { label: "TSA", src: "/tsa.png" },
  { label: "Relation ortho.", src: "/relationortho.png" },
];

export const CITY_PHOTOS: Record<string, string> = {};

export const DC: Record<string, { bg: string; color: string }> = {
  "Langage oral": { bg: "rgba(42,157,110,0.1)", color: "#2A9D6E" },
  "Langage écrit": { bg: "rgba(46,124,230,0.1)", color: "#2E7CE6" },
  "Cognition mathématique": { bg: "rgba(232,123,53,0.1)", color: "#E87B35" },
  "Neurologie": { bg: "rgba(46,124,230,0.1)", color: "#2E7CE6" },
  "Pratique professionnelle": { bg: "rgba(212,43,43,0.1)", color: "#D42B2B" },
  "OMF": { bg: "rgba(232,69,117,0.1)", color: "#E84575" },
  "TSA": { bg: "rgba(124,58,237,0.1)", color: "#7C3AED" },
  "Relation orthophonique": { bg: "rgba(42,157,110,0.1)", color: "#2A9D6E" },
};

export const getDC = (d: string) => DC[d] || { bg: "rgba(212,43,43,0.1)", color: "#D42B2B" };
export const getPhoto = (d: string) => PHOTOS[d] || PHOTOS["default"];

export function fmtLabel(f: { sexe: string } | null | undefined) {
  if (!f) return "";
  return f.sexe === "Femme" ? "D'autres formations de cette formatrice" : f.sexe === "Homme" ? "D'autres formations de ce formateur" : "D'autres formations de cet·te formateur·rice";
}

export function fmtTitle(f: { sexe: string } | null | undefined) {
  if (!f) return "Formateur·rice";
  return f.sexe === "Femme" ? "Formatrice" : f.sexe === "Homme" ? "Formateur" : "Formateur·rice";
}

export const REGIONS_CITIES: Record<string, string[]> = {
  "Auvergne-Rhône-Alpes": ["Lyon", "Grenoble", "Clermont-Ferrand", "Saint-Étienne", "Annecy", "Chambéry", "Valence", "Aurillac", "Bourg-en-Bresse", "Le Puy-en-Velay", "Moulins", "Privas", "Roanne", "Vichy", "Montluçon"],
  "Bourgogne-Franche-Comté": ["Dijon", "Besançon", "Chalon-sur-Saône", "Belfort", "Auxerre", "Nevers", "Mâcon", "Montbéliard", "Lons-le-Saunier", "Vesoul"],
  "Bretagne": ["Rennes", "Brest", "Quimper", "Lorient", "Vannes", "Saint-Brieuc", "Saint-Malo", "Lannion"],
  "Centre-Val de Loire": ["Orléans", "Tours", "Bourges", "Blois", "Chartres", "Châteauroux", "Vendôme"],
  "Corse": ["Ajaccio", "Bastia", "Porto-Vecchio", "Corte"],
  "Grand Est": ["Strasbourg", "Reims", "Metz", "Nancy", "Mulhouse", "Colmar", "Châlons-en-Champagne", "Épinal", "Troyes", "Thionville", "Sélestat"],
  "Hauts-de-France": ["Lille", "Amiens", "Roubaix", "Tourcoing", "Dunkerque", "Calais", "Lens", "Arras", "Valenciennes", "Laon", "Beauvais", "Boulogne-sur-Mer", "Douai", "Cambrai"],
  "Ile-de-France": ["Paris", "Versailles", "Boulogne-Billancourt", "Montreuil", "Argenteuil", "Saint-Denis", "Nanterre", "Créteil", "Vitry-sur-Seine", "Neuilly-sur-Seine", "Issy-les-Moulineaux", "Cergy", "Évry", "Melun", "Pontoise", "Vincennes", "Saint-Germain-en-Laye", "Massy", "Palaiseau", "Gif-sur-Yvette"],
  "Normandie": ["Rouen", "Caen", "Le Havre", "Cherbourg", "Alençon", "Évreux", "Saint-Lô", "Bayeux", "Lisieux", "Dieppe"],
  "Nouvelle-Aquitaine": ["Bordeaux", "Limoges", "Poitiers", "La Rochelle", "Bayonne", "Pau", "Périgueux", "Agen", "Angoulême", "Niort", "Mont-de-Marsan", "Brive-la-Gaillarde", "Rochefort", "Mérignac", "Pessac"],
  "Occitanie": ["Toulouse", "Montpellier", "Nîmes", "Perpignan", "Carcassonne", "Albi", "Rodez", "Narbonne", "Béziers", "Sète", "Cahors", "Foix", "Mende", "Tarbes", "Castres"],
  "Pays de la Loire": ["Nantes", "Angers", "Le Mans", "Saint-Nazaire", "La Roche-sur-Yon", "Laval", "Cholet", "Saint-Herblain"],
  "Provence Alpes Côte d'Azur": ["Marseille", "Nice", "Toulon", "Aix-en-Provence", "Avignon", "Cannes", "Antibes", "Gap", "Grasse", "Fréjus", "Draguignan"],
  "Guadeloupe": ["Pointe-à-Pitre", "Basse-Terre", "Baie-Mahault", "Le Gosier"],
  "Guyane": ["Cayenne", "Saint-Laurent-du-Maroni", "Kourou"],
  "Martinique": ["Fort-de-France", "Le Lamentin", "Le Robert"],
  "Mayotte": ["Mamoudzou", "Koungou", "Bandraboua"],
  "Réunion": ["Saint-Denis", "Saint-Paul", "Le Tampon", "Saint-Pierre", "Saint-André"],
  "Belgique": ["Bruxelles", "Liège", "Anvers", "Gand", "Bruges", "Charleroi", "Namur", "Louvain", "Mons", "Arlon"],
};

export const FRENCH_REGIONS = Object.keys(REGIONS_CITIES).filter(r => r !== "Belgique");
export const DOM_REGIONS_LIST = ["Guadeloupe", "Guyane", "Martinique", "Mayotte", "Réunion"];

export const CITY_TO_REGION: Record<string, string> = Object.entries(REGIONS_CITIES).reduce(
  (acc, [region, cities]) => { cities.forEach(c => { acc[c] = region; }); return acc; },
  {} as Record<string, string>
);

const SKIP_LIEUX = new Set(["Visio", "En ligne", "Présentiel", "Mixte", ""]);

export function getAllCitiesFromFormations(formations: FormationType[]): [string, number][] {
  const cityMap: Record<string, Set<number>> = {};
  const addCity = (city: string, formationId: number) => {
    if (!SKIP_LIEUX.has(city)) {
      if (!cityMap[city]) cityMap[city] = new Set();
      cityMap[city].add(formationId);
    }
  };
  formations.forEach(f => (f.sessions || []).forEach((s: any) => {
    // Check session.lieu (may be comma-separated for multi-lieu)
    (s.lieu || "").trim().split(", ").map((c: string) => c.trim()).filter(Boolean).forEach((city: string) => addCity(city, f.id));
    // Also check session_parties.lieu (for admin-created multi-lieu formations)
    (s.session_parties || []).forEach((p: any) => {
      const pLieu = (p.lieu || p.ville || "").trim();
      pLieu.split(", ").map((c: string) => c.trim()).filter(Boolean).forEach((city: string) => addCity(city, f.id));
    });
  }));
  return Object.entries(cityMap).map(([city, ids]) => [city, ids.size] as [string, number]).sort((a, b) => b[1] - a[1]);
}
