"use client";
import Link from "next/link";
import { C } from "@/lib/data";

export default function MentionsLegalesPage() {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
      <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginTop: 12, marginBottom: 24 }}>Mentions légales</h1>
      {[
        { title: "Éditeur du site", items: ["Nom : PopForm", "Email : contact@popform.fr"] },
        { title: "Hébergement", items: ["Vercel Inc.", "340 Pine Street, Suite 701, San Francisco, CA 94104, USA", "https://vercel.com"] },
        { title: "Propriété intellectuelle", items: ["L'ensemble du contenu de ce site (textes, images, logos) est protégé par le droit d'auteur. Toute reproduction est interdite sans autorisation préalable."] },
        { title: "Données personnelles", items: ["Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits : contact@popform.fr"] },
        { title: "Cookies", items: ["Ce site utilise des cookies techniques nécessaires au fonctionnement de la plateforme. Aucun cookie publicitaire n'est utilisé."] },
      ].map(({ title, items }) => (
        <div key={title} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{title}</h2>
          {items.map((item, i) => <p key={i} style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7, marginBottom: 4 }}>{item}</p>)}
        </div>
      ))}
    </div>
  );
}
