// ═══ PopForm Design Tokens ═══
export const C = {
  bg: "#FFFDF7",
  bgAlt: "#FFF8EC",
  surface: "#FFFFFF",
  surfaceHover: "#FFFBF2",
  border: "#F0E4CC",
  borderLight: "#F5EDD8",
  text: "#2D1B06",
  textSec: "#6B4F2D",
  textTer: "#A48C6A",
  accent: "#D42B2B",
  accentLight: "#E84545",
  accentBg: "rgba(212,43,43,0.07)",
  accentDark: "#A91E1E",
  yellow: "#F5B731",
  yellowLight: "#FACA4E",
  yellowBg: "rgba(245,183,49,0.1)",
  yellowDark: "#D49A1A",
  cream: "#FFF3D6",
  green: "#2A9D6E",
  greenBg: "rgba(42,157,110,0.08)",
  blue: "#2E7CE6",
  blueBg: "rgba(46,124,230,0.08)",
  pink: "#E84575",
  pinkBg: "rgba(232,69,117,0.08)",
  orange: "#E87B35",
  orangeBg: "rgba(232,123,53,0.08)",
  gradient: "linear-gradient(135deg, #D42B2B, #E84545, #F5B731)",
  gradientSoft: "linear-gradient(135deg, #D42B2B, #E84545)",
  gradientWarm: "linear-gradient(135deg, #F5B731, #FACA4E)",
  gradientBg:
    "linear-gradient(135deg, rgba(245,183,49,0.08), rgba(212,43,43,0.05))",
  gradientHero:
    "linear-gradient(160deg, #FFF8EC 0%, #FFFDF7 30%, #FFF3D6 60%, #FFFDF7 100%)",
};

// ═══ Domain Colors ═══
export const DOMAIN_COLORS: Record<string, { bg: string; color: string }> = {
  "Langage oral": { bg: "rgba(42,157,110,0.1)", color: "#2A9D6E" },
  "Langage écrit": { bg: "rgba(46,124,230,0.1)", color: "#2E7CE6" },
  EBP: { bg: "rgba(212,43,43,0.1)", color: "#D42B2B" },
  Bégaiement: { bg: "rgba(232,69,117,0.1)", color: "#E84575" },
  Neurologie: { bg: "rgba(46,124,230,0.1)", color: "#2E7CE6" },
  Oralité: { bg: "rgba(245,183,49,0.1)", color: "#D49A1A" },
  Surdité: { bg: "rgba(212,43,43,0.1)", color: "#D42B2B" },
  Voix: { bg: "rgba(232,69,117,0.1)", color: "#E84575" },
  Déglutition: { bg: "rgba(42,157,110,0.1)", color: "#2A9D6E" },
  "Autisme / TSA": { bg: "rgba(232,123,53,0.1)", color: "#E87B35" },
};

export const getDomainColor = (d: string) =>
  DOMAIN_COLORS[d] || { bg: "rgba(212,43,43,0.1)", color: "#D42B2B" };

export const PRISE_COLORS: Record<string, { bg: string; color: string }> = {
  DPC: { bg: C.greenBg, color: "#1E7A54" },
  "FIF-PL": { bg: C.accentBg, color: C.accentDark },
  OPCO: { bg: C.yellowBg, color: C.yellowDark },
};

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

export const getDomainPhoto = (d: string) =>
  DOMAIN_PHOTOS[d] || DOMAIN_PHOTOS["default"];

// ═══ Types ═══
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "organisme" | "formateur" | "admin";
  avatar_url: string | null;
}
