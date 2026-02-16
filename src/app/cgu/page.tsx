"use client";
import Link from "next/link";
import { C } from "@/lib/data";

export default function CguPage() {
  const h2: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: C.text, marginTop: 28, marginBottom: 8 };
  const p: React.CSSProperties = { fontSize: 14, color: C.textSec, lineHeight: 1.8, marginBottom: 12 };
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginTop: 6 }}>Conditions Générales d&apos;Utilisation</h1>
        <p style={{ fontSize: 12, color: C.textTer }}>Dernière mise à jour : février 2026</p>
      </div>

      <h2 style={h2}>1. Objet</h2>
      <p style={p}>Les présentes CGU définissent les conditions d&apos;utilisation du site PopForm (popform.fr), plateforme de référencement de formations continues destinées aux professionnels de santé, principalement les orthophonistes.</p>

      <h2 style={h2}>2. Accès au service</h2>
      <p style={p}>L&apos;accès au catalogue de formations est libre et gratuit. La création d&apos;un compte est nécessaire pour : laisser des avis, s&apos;inscrire à des formations, enregistrer des favoris. L&apos;inscription est ouverte aux professionnels de santé (orthophonistes), aux organismes de formation et aux formateurs indépendants.</p>

      <h2 style={h2}>3. Comptes utilisateurs</h2>
      <p style={p}>Chaque utilisateur est responsable de la confidentialité de ses identifiants. PopForm ne peut être tenu responsable de tout accès non autorisé au compte d&apos;un utilisateur. Tout utilisateur peut demander la suppression de son compte en contactant contact@popform.fr.</p>

      <h2 style={h2}>4. Publication de formations</h2>
      <p style={p}>Les organismes et formateurs peuvent soumettre des formations via leur dashboard. Chaque soumission est soumise à validation avant publication. PopForm se réserve le droit de refuser, modifier ou retirer toute formation qui ne respecterait pas les standards de qualité ou la réglementation en vigueur.</p>

      <h2 style={h2}>5. Avis et commentaires</h2>
      <p style={p}>Les utilisateurs inscrits peuvent laisser des avis sur les formations. Les avis doivent être honnêtes, respectueux et constructifs. PopForm se réserve le droit de modérer ou supprimer tout avis inapproprié, diffamatoire ou contraire aux bonnes mœurs.</p>

      <h2 style={h2}>6. Responsabilité</h2>
      <p style={p}>PopForm est une plateforme de mise en relation. Les formations sont proposées et dispensées par des organismes et formateurs tiers. PopForm ne saurait être tenu responsable du contenu, de la qualité ou du déroulement des formations référencées.</p>

      <h2 style={h2}>7. Propriété intellectuelle</h2>
      <p style={p}>Le contenu du site (design, code, textes, logo PopForm) est protégé par le droit d&apos;auteur. Les descriptions de formations restent la propriété de leurs auteurs respectifs (organismes et formateurs).</p>

      <h2 style={h2}>8. Modification des CGU</h2>
      <p style={p}>PopForm se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle. L&apos;utilisation continue du service après modification vaut acceptation des nouvelles conditions.</p>

      <h2 style={h2}>9. Droit applicable</h2>
      <p style={p}>Les présentes CGU sont soumises au droit français. Tout litige sera porté devant les tribunaux compétents du ressort du siège social de l&apos;éditeur.</p>

      <h2 style={h2}>10. Contact</h2>
      <p style={p}>Pour toute question : contact@popform.fr</p>

      <div style={{ height: 40 }} />
    </div>
  );
}
