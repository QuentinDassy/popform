"use client";
import Link from "next/link";
import { C } from "@/lib/data";

export default function MentionsLegalesPage() {
  const h2: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: C.text, marginTop: 28, marginBottom: 8 };
  const p: React.CSSProperties = { fontSize: 14, color: C.textSec, lineHeight: 1.8, marginBottom: 12 };
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginTop: 6 }}>Mentions légales</h1>
      </div>
      <h2 style={h2}>Éditeur du site</h2>
      <p style={p}>
        PopForm est édité par [Nom de la société / Nom personnel].<br />
        Siège social : [Adresse complète]<br />
        SIRET : [Numéro SIRET]<br />
        Directeur de la publication : Quentin Dassy<br />
        Email : contact@popform.fr
      </p>
      <h2 style={h2}>Hébergement</h2>
      <p style={p}>
        Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.<br />
        Les données sont hébergées par Supabase Inc. (base de données) et Vercel Inc. (application).
      </p>
      <h2 style={h2}>Propriété intellectuelle</h2>
      <p style={p}>
        L&apos;ensemble du contenu du site PopForm (textes, images, graphismes, logo, icônes) est la propriété exclusive de l&apos;éditeur ou de ses partenaires. Toute reproduction, représentation ou diffusion, en tout ou partie, du contenu de ce site est interdite sans autorisation préalable.
      </p>
      <h2 style={h2}>Données personnelles</h2>
      <p style={p}>
        Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression et de portabilité de vos données personnelles. Pour exercer ces droits, contactez-nous à : contact@popform.fr
      </p>
      <p style={p}>
        Les données collectées (nom, email, inscriptions) sont utilisées uniquement pour le fonctionnement du service. Elles ne sont ni vendues ni transmises à des tiers à des fins commerciales.
      </p>
      <h2 style={h2}>Cookies</h2>
      <p style={p}>
        PopForm utilise des cookies techniques nécessaires au fonctionnement du service (authentification, préférences). Aucun cookie publicitaire ou de tracking n&apos;est utilisé.
      </p>
      <h2 style={h2}>Responsabilité</h2>
      <p style={p}>
        Les informations présentes sur le site sont fournies à titre indicatif. L&apos;éditeur ne saurait être tenu responsable des erreurs, omissions ou résultats obtenus suite à l&apos;utilisation de ces informations. Les formations référencées sur PopForm sont proposées par des organismes et formateurs tiers.
      </p>
      <div style={{ height: 40 }} />
    </div>
  );
}
