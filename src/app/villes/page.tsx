"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C, fetchFormations } from "@/lib/data";
import { CityCard } from "@/components/ui";
import { useIsMobile } from "@/lib/hooks";
import { supabase } from "@/lib/supabase-data";

export default function VillesPage() {
  const mob = useIsMobile();
  const [cities, setCities] = useState<[string, number][]>([]);
  const [adminVilles, setAdminVilles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("villes_admin").select("*").order("nom").then(({ data: villes }: { data: Record<string, string>[] | null }) => {
      const adminMap: Record<string, string> = {};
      (villes || []).forEach((v: Record<string, string>) => { adminMap[v.nom] = v.image || "" });
      setAdminVilles(adminMap);
      // Count formations per ville
      fetchFormations().then(formations => {
        const cityCount: Record<string, number> = {};
        formations.forEach(f => {
          (f.sessions || []).forEach((s: any) => {
            // Use 'lieu' field from sessions table (not 'ville')
            const cityName = s.lieu || s.ville;
            if (cityName && cityName !== "Visio" && cityName !== "En ligne") {
              cityCount[cityName] = (cityCount[cityName] || 0) + 1;
            }
          });
        });
        // Only show admin-defined villes
        const adminNames = Object.keys(adminMap);
        if (adminNames.length > 0) {
          setCities(adminNames.map(n => [n, cityCount[n] || 0]));
        } else {
          // No admin villes defined: show nothing (admin hasn't set up villes yet)
          setCities([]);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
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
