"use client";
import Link from "next/link";
import { C, getAllCities } from "@/lib/data";
import { CityCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";

export default function VillesPage() {
  const sorted = getAllCities();
  const mob = useIsMobile();
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>📍 Toutes les villes</h1>
        <p style={{ fontSize: 12, color: C.textTer, marginTop: 3 }}>Triées par nombre de formations</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(auto-fill,minmax(200px,1fr))", gap: 12, paddingBottom: 40 }}>
        {sorted.map(([city, count]) => <CityCard key={city} city={city} count={count} mob={mob} />)}
      </div>
    </div>
  );
}
