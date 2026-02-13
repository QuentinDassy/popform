// src/lib/data.ts — Mock data + types + helpers

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

export type Session = { dates: string; lieu: string; adresse: string };
export type Formation = {
  id: number; titre: string; sousTitre: string; description: string;
  domaine: string; modalite: string; priseEnCharge: string[];
  duree: string; formateurId: number; organismeId: number | null;
  sessions: Session[]; prix: number; prixSalarie: number | string;
  prixLiberal: number | string; prixDPC: number | string;
  note: number; nbAvis: number; isNew: boolean; dateAjout: string;
  populations: string[]; motsCles: string[]; professions: string[];
  effectif: number; videoUrl: string; dateFin: string | null; sansLimite: boolean;
};
export type Organisme = { id: number; nom: string; logo: string; desc: string };
export type Formateur = { id: number; nom: string; bio: string; sexe: string; organismeId: number | null };
export type Avis = { id: number; formationId: number; userId: string; userName: string; note: number; texte: string; date: string };

export const ORGANISMES: Organisme[] = [
  { id: 1, nom: "OrthoFormation", logo: "OF", desc: "Formations continues en orthophonie depuis 2015." },
  { id: 2, nom: "FNO Formation", logo: "FN", desc: "Organisme de la Fédération Nationale des Orthophonistes." },
  { id: 3, nom: "SDORRP", logo: "SD", desc: "Syndicat des orthophonistes, formation professionnelle." },
  { id: 4, nom: "Formavox", logo: "FV", desc: "Formations en voix et fluence." },
  { id: 5, nom: "Logopédie Plus", logo: "LP", desc: "Formations innovantes en logopédie." },
  { id: 6, nom: "CPLOL Academy", logo: "CP", desc: "Formations européennes en orthophonie." },
];

export const FORMATEURS: Formateur[] = [
  { id: 1, nom: "Dr. Marie Lefort", bio: "Orthophoniste, docteure en sciences du langage.", sexe: "Femme", organismeId: 1 },
  { id: 2, nom: "Jean-Marc Dupuis", bio: "Formateur certifié en EBP.", sexe: "Homme", organismeId: 3 },
  { id: 3, nom: "Sophie Renard", bio: "Spécialiste du bégaiement.", sexe: "Femme", organismeId: null },
  { id: 4, nom: "Dr. Lucas Martin", bio: "Neuropsychologue, expert en aphasie.", sexe: "Homme", organismeId: 2 },
  { id: 5, nom: "Camille Durand", bio: "Spécialisée en oralité alimentaire.", sexe: "Femme", organismeId: 5 },
  { id: 6, nom: "Dr. Élise Petit", bio: "Chercheuse, troubles neurodégénératifs.", sexe: "Femme", organismeId: 2 },
  { id: 7, nom: "Alex Morin", bio: "Formateur·rice en cognition mathématique.", sexe: "Non genré", organismeId: null },
];

export const FORMATIONS: Formation[] = [
  { id: 1, titre: "Prise en charge du langage oral", sousTitre: "Approche fondée sur les preuves pour les TDL", description: "Formation complète sur l'évaluation et la rééducation des troubles du langage oral chez l'enfant.", domaine: "Langage oral", modalite: "Présentiel", priseEnCharge: ["DPC", "FIF-PL"], duree: "14h (2j)", formateurId: 1, organismeId: 1, sessions: [{ dates: "15-16 mars 2026", lieu: "Paris", adresse: "12 rue de Rivoli, 75001" }, { dates: "22-23 mai 2026", lieu: "Lyon", adresse: "5 place Bellecour, 69002" }], prix: 590, prixSalarie: 490, prixLiberal: "", prixDPC: 0, note: 4.7, nbAvis: 34, isNew: true, dateAjout: "2026-02-01", populations: ["Enfant", "Adolescent"], motsCles: ["TDL", "évaluation", "rééducation", "langage", "développement"], professions: ["Orthophonie"], effectif: 20, videoUrl: "", dateFin: "2026-05-23", sansLimite: false },
  { id: 2, titre: "EBP en orthophonie", sousTitre: "Méthodologie de recherche et lecture critique", description: "Intégrez les données probantes dans votre pratique quotidienne.", domaine: "Pratique professionnelle", modalite: "Distanciel", priseEnCharge: ["FIF-PL"], duree: "7h (1j)", formateurId: 2, organismeId: 3, sessions: [{ dates: "10 avril 2026", lieu: "En ligne", adresse: "" }], prix: 320, prixSalarie: "", prixLiberal: 280, prixDPC: "", note: 4.9, nbAvis: 52, isNew: true, dateAjout: "2026-01-28", populations: ["Adulte"], motsCles: ["EBP", "recherche", "données probantes", "lecture critique", "méthodologie"], professions: ["Orthophonie", "Kinésithérapie"], effectif: 50, videoUrl: "", dateFin: null, sansLimite: true },
  { id: 3, titre: "Le bégaiement chez l'ado et l'adulte", sousTitre: "Nouvelles approches thérapeutiques", description: "Prise en charge du bégaiement persistant.", domaine: "Langage oral", modalite: "Mixte", priseEnCharge: ["DPC", "FIF-PL", "OPCO"], duree: "21h (3j)", formateurId: 3, organismeId: 4, sessions: [{ dates: "5-6 juin 2026", lieu: "Bordeaux", adresse: "10 cours de l'Intendance" }, { dates: "7-9 fév 2027", lieu: "Bordeaux", adresse: "10 cours de l'Intendance" }], prix: 870, prixSalarie: 750, prixLiberal: "", prixDPC: 0, note: 4.5, nbAvis: 21, isNew: false, dateAjout: "2025-11-15", populations: ["Adolescent", "Adulte"], motsCles: ["bégaiement", "fluence", "ado", "intégratif", "moteur"], professions: ["Orthophonie"], effectif: 18, videoUrl: "", dateFin: "2027-02-09", sansLimite: false },
  { id: 4, titre: "Rééducation des aphasies post-AVC", sousTitre: "Protocoles et études de cas", description: "Rééducation des aphasies vasculaires de la phase aiguë à la réinsertion.", domaine: "Neurologie", modalite: "Présentiel", priseEnCharge: ["DPC"], duree: "21h (3j)", formateurId: 4, organismeId: 2, sessions: [{ dates: "20-22 mai 2026", lieu: "Paris", adresse: "45 rue des Saints-Pères" }, { dates: "15-17 sept 2026", lieu: "Marseille", adresse: "" }], prix: 950, prixSalarie: "", prixLiberal: "", prixDPC: 0, note: 4.8, nbAvis: 45, isNew: false, dateAjout: "2025-10-20", populations: ["Adulte", "Senior"], motsCles: ["AVC", "aphasie", "neurologie", "rééducation", "langage"], professions: ["Orthophonie"], effectif: 15, videoUrl: "", dateFin: "2026-09-17", sansLimite: false },
  { id: 5, titre: "Oralité alimentaire chez le jeune enfant", sousTitre: "Évaluation sensorielle et rééducation", description: "Troubles de l'oralité du nourrisson.", domaine: "OMF", modalite: "Présentiel", priseEnCharge: ["FIF-PL", "OPCO"], duree: "14h (2j)", formateurId: 5, organismeId: 5, sessions: [{ dates: "3-4 avril 2026", lieu: "Lille", adresse: "3 rue Nationale, 59000" }], prix: 640, prixSalarie: 540, prixLiberal: "", prixDPC: "", note: 4.6, nbAvis: 28, isNew: true, dateAjout: "2026-02-05", populations: ["Enfant"], motsCles: ["oralité", "alimentation", "sensoriel", "nourrisson", "pédiatrie"], professions: ["Orthophonie", "Kinésithérapie"], effectif: 16, videoUrl: "", dateFin: "2026-04-04", sansLimite: false },
  { id: 6, titre: "Cognition mathématique et dyscalculie", sousTitre: "Évaluation et rééducation des troubles du nombre", description: "Comprendre et traiter les troubles logico-mathématiques.", domaine: "Cognition mathématique", modalite: "Distanciel", priseEnCharge: ["DPC", "FIF-PL"], duree: "14h (4 demi-j)", formateurId: 7, organismeId: null, sessions: [{ dates: "Mars-Avril 2026", lieu: "En ligne", adresse: "" }], prix: 520, prixSalarie: "", prixLiberal: 450, prixDPC: 0, note: 4.4, nbAvis: 19, isNew: false, dateAjout: "2025-12-10", populations: ["Enfant", "Adolescent"], motsCles: ["dyscalculie", "mathématiques", "nombre", "logique", "calcul"], professions: ["Orthophonie"], effectif: 30, videoUrl: "", dateFin: null, sansLimite: true },
  { id: 7, titre: "Retard de langage : dépistage précoce", sousTitre: "Repérer, évaluer et intervenir avant 4 ans", description: "Dépistage précoce et interventions chez le très jeune enfant.", domaine: "Langage oral", modalite: "Présentiel", priseEnCharge: ["DPC", "FIF-PL"], duree: "14h (2j)", formateurId: 5, organismeId: 1, sessions: [{ dates: "28-29 mars 2026", lieu: "Marseille", adresse: "" }], prix: 560, prixSalarie: "", prixLiberal: "", prixDPC: "", note: 4.8, nbAvis: 38, isNew: true, dateAjout: "2026-01-20", populations: ["Enfant"], motsCles: ["retard", "dépistage", "précoce", "intervention", "petite enfance"], professions: ["Orthophonie"], effectif: 22, videoUrl: "", dateFin: "2026-03-29", sansLimite: false },
  { id: 8, titre: "Maladies neurodégénératives", sousTitre: "Alzheimer, Parkinson, SLA", description: "Maintien cognitif chez les patients neurodégénératifs.", domaine: "Neurologie", modalite: "Mixte", priseEnCharge: ["DPC"], duree: "21h (3j)", formateurId: 6, organismeId: 2, sessions: [{ dates: "10-12 avril 2026", lieu: "Paris", adresse: "" }, { dates: "5-7 oct 2026", lieu: "Montreuil", adresse: "15 rue de Paris, 93100" }], prix: 890, prixSalarie: 790, prixLiberal: "", prixDPC: 0, note: 4.7, nbAvis: 31, isNew: false, dateAjout: "2025-11-08", populations: ["Adulte", "Senior"], motsCles: ["Alzheimer", "Parkinson", "neurodégénératif", "maintien", "cognition"], professions: ["Orthophonie", "Kinésithérapie"], effectif: 14, videoUrl: "", dateFin: "2026-10-07", sansLimite: false },
  { id: 9, titre: "Lexique et troubles d'accès lexical", sousTitre: "Modèles théoriques et rééducation", description: "Mécanismes d'acquisition et d'accès lexical.", domaine: "Langage oral", modalite: "Distanciel", priseEnCharge: ["FIF-PL"], duree: "7h (2 demi-j)", formateurId: 1, organismeId: 3, sessions: [{ dates: "18-19 avril 2026", lieu: "En ligne", adresse: "" }], prix: 290, prixSalarie: "", prixLiberal: 250, prixDPC: "", note: 4.5, nbAvis: 16, isNew: true, dateAjout: "2026-02-08", populations: ["Enfant", "Adulte"], motsCles: ["lexique", "accès lexical", "dénomination", "sémantique", "vocabulaire"], professions: ["Orthophonie"], effectif: 40, videoUrl: "", dateFin: null, sansLimite: true },
  { id: 10, titre: "Traumatismes crâniens", sousTitre: "Du coma à la réinsertion", description: "Séquelles cognitives et langagières des TC.", domaine: "Neurologie", modalite: "Présentiel", priseEnCharge: ["DPC", "FIF-PL"], duree: "14h (2j)", formateurId: 4, organismeId: 5, sessions: [{ dates: "14-15 mai 2026", lieu: "Bordeaux", adresse: "" }, { dates: "20-21 nov 2026", lieu: "Toulouse", adresse: "" }], prix: 680, prixSalarie: "", prixLiberal: "", prixDPC: 0, note: 4.6, nbAvis: 22, isNew: false, dateAjout: "2025-12-01", populations: ["Adulte", "Adolescent"], motsCles: ["traumatisme", "crânien", "TC", "rééducation", "cognition"], professions: ["Orthophonie", "Kinésithérapie"], effectif: 16, videoUrl: "", dateFin: "2026-11-21", sansLimite: false },
];

export const INIT_AVIS: Avis[] = [
  { id: 1, formationId: 1, userId: "me", userName: "Vous", note: 5, texte: "Excellente formation, très concrète avec beaucoup de cas cliniques.", date: "2026-03-18" },
  { id: 2, formationId: 1, userId: "u2", userName: "Claire B.", note: 4, texte: "Très bien structurée, j'aurais aimé plus de temps sur la partie évaluation.", date: "2026-03-20" },
  { id: 3, formationId: 1, userId: "u3", userName: "Thomas R.", note: 5, texte: "Indispensable pour tout orthophoniste travaillant avec des enfants TDL.", date: "2026-04-02" },
  { id: 4, formationId: 2, userId: "u4", userName: "Sarah M.", note: 5, texte: "J'ai enfin compris comment lire un article scientifique correctement !", date: "2026-04-12" },
  { id: 5, formationId: 2, userId: "u5", userName: "Julie L.", note: 5, texte: "Formation qui change la pratique au quotidien.", date: "2026-04-15" },
  { id: 6, formationId: 4, userId: "me", userName: "Vous", note: 4, texte: "Très complet sur les aphasies, bonne articulation théorie/pratique.", date: "2026-05-25" },
  { id: 7, formationId: 4, userId: "u6", userName: "Marc D.", note: 5, texte: "Le Dr Martin est un excellent pédagogue.", date: "2026-06-01" },
  { id: 8, formationId: 3, userId: "u7", userName: "Léa P.", note: 4, texte: "Approche intégrative très intéressante, Sophie est bienveillante.", date: "2026-06-10" },
  { id: 9, formationId: 5, userId: "u8", userName: "Nadia K.", note: 5, texte: "Enfin une formation concrète sur l'oralité alimentaire !", date: "2026-04-06" },
  { id: 10, formationId: 6, userId: "u9", userName: "Pierre V.", note: 4, texte: "Bon contenu, parfois un peu dense pour le format distanciel.", date: "2026-04-20" },
];

export function fmtLabel(fId: number) {
  const f = FORMATEURS.find(x => x.id === fId);
  if (!f) return "";
  return f.sexe === "Femme" ? "D'autres formations de cette formatrice" : f.sexe === "Homme" ? "D'autres formations de ce formateur" : "D'autres formations de cet·te formateur·rice";
}

export function fmtTitle(fId: number) {
  const f = FORMATEURS.find(x => x.id === fId);
  if (!f) return "Formateur·rice";
  return f.sexe === "Femme" ? "Formatrice" : f.sexe === "Homme" ? "Formateur" : "Formateur·rice";
}

export function getAllCities(): [string, number][] {
  const cities: Record<string, number> = {};
  FORMATIONS.forEach(f => f.sessions.forEach(s => {
    if (s.lieu && s.lieu !== "En ligne") cities[s.lieu] = (cities[s.lieu] || 0) + 1;
  }));
  return Object.entries(cities).sort((a, b) => b[1] - a[1]);
}
