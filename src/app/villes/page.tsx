"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C, fetchFormations, getAllCitiesFromFormations } from "@/lib/data";
import { CityCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase } from "@/lib/supabase-data";

export default function VillesPage() {
  const mob = useIsMobile();
  const [cities, setCities] = useState<[string, number][]>([]);
  const [adminVilles, setAdminVilles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let villeMap: Record<string, string> = {};
    const loadVilles = supabase.from("domaines").select("*").eq("type", "ville").then(({ data: villes }) => {
      (villes || []).forEach((v: Record<string, string>) => { villeMap[v.nom] = v.image || "" });
      setAdminVilles(villeMap);
    }).catch(() => {});
    const loadFormations = fetchFormations();
    Promise.all([loadFormations, loadVilles]).then(([formations]) => {
      const formationCities = getAllCitiesFromFormations(formations);
      const adminNames = Object.keys(villeMap);
      const allCities: [string, number][] = [];
      adminNames.forEach(name => {
        const found = formationCities.find(([c]) => c === name);
        allCities.push([name, found ? found[1] : 0]);
      });
      formationCities.forEach(([c, n]) => { if (!adminNames.includes(c)) allCities.push([c, n]) });
      setCities(allCities);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>🍿 Chargement...</div>;
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: mob ? "0 16px" : "0 40px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>📍 Toutes les villes</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(auto-fill,minmax(200px,1fr))", gap: 12, paddingBottom: 40 }}>
        {cities.map(([city, count]) => <CityCard key={city} city={city} count={count} mob={mob} image={adminVilles[city]} />)}
      </div>
    </div>
  );
}
