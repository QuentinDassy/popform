// ═══ Design Tokens ═══
export const C = {
  bg: "#FAFBFF",
  bgAlt: "#F1F3FB",
  surface: "#FFFFFF",
  surfaceHover: "#F6F7FC",
  border: "#E2E5F1",
  borderLight: "#ECEEF6",
  text: "#1A1D2E",
  textSec: "#5A5F7A",
  textTer: "#9196B0",
  accent: "#6C5CE7",
  accentLight: "#8B7CF0",
  accentBg: "rgba(108,92,231,0.08)",
  green: "#00B48A",
  greenBg: "rgba(0,180,138,0.08)",
  yellow: "#E8A817",
  yellowBg: "rgba(232,168,23,0.08)",
  pink: "#E8457A",
  pinkBg: "rgba(232,69,122,0.08)",
  blue: "#2E8AE6",
  blueBg: "rgba(46,138,230,0.08)",
  orange: "#E87B35",
  orangeBg: "rgba(232,123,53,0.08)",
  gradient: "linear-gradient(135deg, #6C5CE7, #8B7CF0, #38BDF8)",
  gradientSoft: "linear-gradient(135deg, #6C5CE7, #A78BFA)",
  gradientWarm: "linear-gradient(135deg, #E8457A, #F59E0B)",
  gradientBg: "linear-gradient(135deg, rgba(108,92,231,0.06), rgba(56,189,248,0.06))",
  gradientHero:
    "linear-gradient(160deg, #F0EEFF 0%, #FAFBFF 30%, #EEF6FF 60%, #FAFBFF 100%)",
};

// ═══ Domain → Color mapping ═══
export const DOMAIN_COLORS: Record<string, { bg: string; color: string }> = {
  "Langage oral": { bg: "rgba(0,180,138,0.1)", color: "#00B48A" },
  "Langage écrit": { bg: "rgba(46,138,230,0.1)", color: "#2E8AE6" },
  EBP: { bg: "rgba(108,92,231,0.1)", color: "#6C5CE7" },
  Bégaiement: { bg: "rgba(232,69,122,0.1)", color: "#E8457A" },
  Neurologie: { bg: "rgba(46,138,230,0.1)", color: "#2E8AE6" },
  Oralité: { bg: "rgba(232,168,23,0.1)", color: "#D4960E" },
  Surdité: { bg: "rgba(108,92,231,0.1)", color: "#6C5CE7" },
  Voix: { bg: "rgba(232,69,122,0.1)", color: "#E8457A" },
  Déglutition: { bg: "rgba(0,180,138,0.1)", color: "#00B48A" },
  "Autisme / TSA": { bg: "rgba(232,123,53,0.1)", color: "#E87B35" },
  Aphasie: { bg: "rgba(46,138,230,0.1)", color: "#2E8AE6" },
  Handicap: { bg: "rgba(232,123,53,0.1)", color: "#E87B35" },
};

export const getDomainColor = (domaine: string) =>
  DOMAIN_COLORS[domaine] || { bg: "rgba(108,92,231,0.1)", color: "#6C5CE7" };

// ═══ Prise en charge colors ═══
export const PRISE_COLORS: Record<string, { bg: string; color: string }> = {
  DPC: { bg: "rgba(0,180,138,0.1)", color: "#00916E" },
  "FIF-PL": { bg: "rgba(108,92,231,0.1)", color: "#5A4BD1" },
  OPCO: { bg: "rgba(232,168,23,0.1)", color: "#B8860B" },
  Personnel: { bg: "rgba(145,150,176,0.1)", color: "#5A5F7A" },
};

// ═══ Placeholder photos by domain ═══
export const DOMAIN_PHOTOS: Record<string, string> = {
  "Langage oral":
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=400&fit=crop",
  EBP: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&h=400&fit=crop",
  Bégaiement:
    "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=600&h=400&fit=crop",
  Neurologie:
    "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&h=400&fit=crop",
  Oralité:
    "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&h=400&fit=crop",
  "Autisme / TSA":
    "https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=600&h=400&fit=crop",
  default:
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop",
};

export const getDomainPhoto = (domaine: string) =>
  DOMAIN_PHOTOS[domaine] || DOMAIN_PHOTOS["default"];

// ═══ Types ═══
export interface Formation {
  id: string;
  titre: string;
  slug: string;
  sous_titre: string | null;
  description: string;
  domaine: string;
  modalite: "presentiel" | "distanciel" | "mixte";
  duree: string;
  prix: number;
  prise_en_charge: string[];
  average_rating: number;
  review_count: number;
  is_featured: boolean;
  status: "approved";
  organisme: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    website: string | null;
  };
  formateur: {
    id: string;
    full_name: string;
    slug: string;
    bio: string | null;
    photo_url: string | null;
  } | null;
  sessions: {
    id: string;
    date_label: string;
    lieu: string;
    ville: string;
  }[];
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "organisme" | "formateur" | "admin";
  avatar_url: string | null;
}
