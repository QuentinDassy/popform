// src/lib/data.ts — Design tokens, photos, helpers
// Types and data fetching are in supabase-data.ts

import type { Formation as FormationType } from "./supabase-data";
export type { Formation, Formateur, Organisme, Avis, Session, Inscription, Favori, AdminNotification } from "./supabase-data";
export { fetchFormations, fetchFormation, fetchAllFormations, fetchOrganismes, fetchFormateurs, fetchAvis, addAvis, updateAvis, fetchInscriptions, fetchFavoris, toggleFavori, fetchAdminNotifications, notifyAdmin, invalidateCache } from "./supabase-data";

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
  "Lille": "https://images.unsplash.com/photo-1600028068930-83f75de17400?w=400&h=250&fit=crop",
  "Marseille": "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&h=250&fit=crop",
  "Bordeaux": "https://images.unsplash.com/photo-1593194142338-6b0d860e4783?w=400&h=250&fit=crop",
  "Lyon": "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400&h=250&fit=crop",
  "Toulouse": "https://images.unsplash.com/photo-1582764048895-db0c0e680674?w=400&h=250&fit=crop",
  "Montreuil": "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=250&fit=crop",
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

export function getAllCitiesFromFormations(formations: FormationType[]): [string, number][] {
  const cities: Record<string, number> = {};
  formations.forEach(f => (f.sessions || []).forEach(s => {
    if (s.lieu && s.lieu !== "En ligne") cities[s.lieu] = (cities[s.lieu] || 0) + 1;
  }));
  return Object.entries(cities).sort((a, b) => b[1] - a[1]);
}
