"use client";
import Link from "next/link";
import { C } from "@/lib/data";

export default function NotFound() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🍿</div>
        <h1 style={{ fontSize: 48, fontWeight: 800, color: C.text, marginBottom: 8 }}>404</h1>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>Fin de bobine !</h2>
        <p style={{ fontSize: 14, color: C.textTer, maxWidth: 360, margin: "0 auto 24px", lineHeight: 1.7 }}>
          Cette page n&apos;existe pas ou a été déplacée. Retournez au programme !
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ padding: "12px 24px", borderRadius: 12, background: C.gradient, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Accueil 🏠</Link>
          <Link href="/catalogue" style={{ padding: "12px 24px", borderRadius: 12, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Catalogue 🎬</Link>
        </div>
      </div>
    </div>
  );
}
