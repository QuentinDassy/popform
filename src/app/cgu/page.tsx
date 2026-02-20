"use client";
import Link from "next/link";
import { C } from "@/lib/data";

export default function CguPage() {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
      <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginTop: 12, marginBottom: 24 }}>Conditions Générales d'Utilisation</h1>
      <p style={{ fontSize: 12, color: C.textTer, marginBottom: 24 }}>Dernière mise à jour : février 2026</p>
      {[
        { title: "1. Objet", content: "Les présentes CGU régissent l'utilisation de la plateforme PopForm, accessible à l'adresse popform.fr. En accédant à la plateforme, vous acceptez ces conditions." },
        { title: "2. Description du service", content: "PopForm est une plateforme de référencement de formations continues destinées aux professionnels de santé, notamment les orthophonistes. Elle met en relation des organismes de formation, des formateurs indépendants et des professionnels souhaitant se former." },
        { title: "3. Inscription et compte", content: "L'inscription est gratuite pour les utilisateurs. Les organismes et formateurs peuvent créer un compte pour référencer leurs formations, sous réserve de validation par l'équipe PopForm." },
        { title: "4. Contenu", content: "Les organismes et formateurs sont responsables du contenu qu'ils publient. PopForm se réserve le droit de refuser ou supprimer tout contenu non conforme à sa charte éditoriale." },
        { title: "5. Données personnelles", content: "Vos données sont traitées conformément à notre politique de confidentialité et au RGPD. Vous pouvez exercer vos droits en écrivant à contact@popform.fr." },
        { title: "6. Contact", content: "Pour toute question relative aux CGU : contact@popform.fr" },
      ].map(({ title, content }) => (
        <div key={title} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7 }}>{content}</p>
        </div>
      ))}
    </div>
  );
}
