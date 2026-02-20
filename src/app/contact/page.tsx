"use client";
import Link from "next/link";
import { C } from "@/lib/data";

export default function ContactPage() {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
      <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginTop: 12, marginBottom: 8 }}>Contact</h1>
      <p style={{ fontSize: 15, color: C.textSec, lineHeight: 1.7, marginBottom: 24 }}>
        Vous avez une question, une suggestion ou un problème technique ? N'hésitez pas à nous contacter.
      </p>
      <div style={{ padding: 24, background: C.surface, borderRadius: 16, border: "1px solid " + C.border }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", marginBottom: 4 }}>Email</div>
          <a href="mailto:contact@popform.fr" style={{ fontSize: 16, color: C.accent, fontWeight: 700, textDecoration: "none" }}>contact@popform.fr</a>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", marginBottom: 4 }}>Organismes & formateurs</div>
          <p style={{ fontSize: 14, color: C.textSec }}>Pour référencer vos formations ou rejoindre la plateforme, écrivez-nous à <a href="mailto:contact@popform.fr" style={{ color: C.accent }}>contact@popform.fr</a></p>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textTer, textTransform: "uppercase", marginBottom: 4 }}>Délai de réponse</div>
          <p style={{ fontSize: 14, color: C.textSec }}>Nous répondons sous 48h ouvrées.</p>
        </div>
      </div>
    </div>
  );
}
