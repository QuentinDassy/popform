// src/lib/data.ts — Design tokens, photos, helpers
// Types and data fetching are in supabase-data.ts

import type { Formation as FormationType } from "./supabase-data";
export type { Formation, Formateur, Organisme, Avis, Session, Inscription, Favori, AdminNotification, DomaineAdmin } from "./supabase-data";
export { 
  fetchFormations, fetchFormation, fetchAllFormations, fetchOrganismes, fetchFormateurs, 
  fetchAvis, addAvis, updateAvis, fetchInscriptions, fetchFavoris, toggleFavori, 
  fetchAdminNotifications, notifyAdmin, invalidateCache,
  fetchDomainesAdmin, fetchDomainesAccueil, fetchDomainesFiltres, createDomaineAdmin, updateDomaineAdmin, deleteDomaineAdmin
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
  "Langage oral": "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=400&fit=crop",
  "Langage écrit": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&h=400&fit=crop",
  "Cognition mathématique": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop",
  "Neurologie": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&h=400&fit=crop",
  "Pratique professionnelle": "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&h=400&fit=crop",
  "OMF": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=400&fit=crop",
  "default": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop",
};

export const CITY_PHOTOS: Record<string, string> = {
  "Paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=250&fit=crop",
  "Lyon": "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400&h=250&fit=crop",
  "Marseille": "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&h=250&fit=crop",
  "Bordeaux": "https://images.unsplash.com/photo-1593194142338-6b0d860e4783?w=400&h=250&fit=crop",
  "Toulouse": "https://images.unsplash.com/photo-1582764048895-db0c0e680674?w=400&h=250&fit=crop",
  "Lille": "https://images.unsplash.com/photo-1600028068930-83f75de17400?w=400&h=250&fit=crop",
  "Nantes": "https://images.unsplash.com/photo-1571406761122-3e7c88b98e25?w=400&h=250&fit=crop",
  "Nice": "https://images.unsplash.com/photo-1491557345352-5929e343eb89?w=400&h=250&fit=crop",
  "Strasbourg": "https://images.unsplash.com/photo-1576808597967-93e2f1b5b6dc?w=400&h=250&fit=crop",
  "Rennes": "https://images.unsplash.com/photo-1598177250617-1c285a0e2dd0?w=400&h=250&fit=crop",
  "Montpellier": "https://images.unsplash.com/photo-1580994960786-c2c5dcfd4be4?w=400&h=250&fit=crop",
  "Grenoble": "https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=400&h=250&fit=crop",
  "Aix-en-Provence": "https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400&h=250&fit=crop",
  "Brest": "https://images.unsplash.com/photo-1549892877-20bebe8f4c91?w=400&h=250&fit=crop",
  "Dijon": "https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=400&h=250&fit=crop",
  "Rouen": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&h=250&fit=crop",
  "Reims": "https://images.unsplash.com/photo-1571680322279-a226e6a4cc2a?w=400&h=250&fit=crop",
  "Le Mans": "https://images.unsplash.com/photo-1599476843688-c8d67cd3fe7e?w=400&h=250&fit=crop",
  "Amiens": "https://images.unsplash.com/photo-1548401747-31a6e83de1d0?w=400&h=250&fit=crop",
  "Nancy": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=250&fit=crop",
  "Metz": "https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=400&h=250&fit=crop",
  "Caen": "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=250&fit=crop",
  "Limoges": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&h=250&fit=crop",
  "Angers": "https://images.unsplash.com/photo-1598177250617-1c285a0e2dd0?w=400&h=250&fit=crop",
  "Poitiers": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&h=250&fit=crop",
  "Clermont-Ferrand": "https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=400&h=250&fit=crop",
  "Tours": "https://images.unsplash.com/photo-1598177250617-1c285a0e2dd0?w=400&h=250&fit=crop",
  "Orléans": "https://images.unsplash.com/photo-1598177250617-1c285a0e2dd0?w=400&h=250&fit=crop",
  "Besançon": "https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=400&h=250&fit=crop",
  "Toulon": "https://images.unsplash.com/photo-1491557345352-5929e343eb89?w=400&h=250&fit=crop",
  "Avignon": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=250&fit=crop",
  "Perpignan": "https://images.unsplash.com/photo-1580994960786-c2c5dcfd4be4?w=400&h=250&fit=crop",
  "Montreuil": "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=250&fit=crop",
  "Nîmes": "https://images.unsplash.com/photo-1580994960786-c2c5dcfd4be4?w=400&h=250&fit=crop",
  "Pau": "https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=400&h=250&fit=crop",
  "La Rochelle": "https://images.unsplash.com/photo-1593194142338-6b0d860e4783?w=400&h=250&fit=crop",
};

export const DC: Record<string, { bg: string; color: string }> = {
  "Langage oral": { bg: "rgba(42,157,110,0.1)", color: "#2A9D6E" },
  "Langage écrit": { bg: "rgba(46,124,230,0.1)", color: "#2E7CE6" },
  "Cognition mathématique": { bg: "rgba(232,123,53,0.1)", color: "#E87B35" },
  "Neurologie": { bg: "rgba(46,124,230,0.1)", color: "#2E7CE6" },
  "Pratique professionnelle": { bg: "rgba(212,43,43,0.1)", color: "#D42B2B" },
  "OMF": { bg: "rgba(232,69,117,0.1)", color: "#E84575" },
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
};

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
