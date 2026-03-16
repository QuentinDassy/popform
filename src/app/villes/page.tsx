"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C, fetchFormations, type Formation } from "@/lib/data";
import { CityCard } from "@/components/ui";
import FranceMap from "@/components/FranceMap";
import { useIsMobile } from "@/lib/hooks";
import { supabase } from "@/lib/supabase-data";

export default function VillesPage() {
  const mob = useIsMobile();
  const [cities, setCities] = useState<[string, number][]>([]);
  const [adminVilles, setAdminVilles] = useState<Record<string, string>>({});
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"carte" | "villes">("carte");

  useEffect(() => {
    function tout<T>(p: Promise<T>, fb: T): Promise<T> { return Promise.race([p, new Promise<T>(r => setTimeout(() => r(fb), 8000))]); }
    tout(supabase.from("villes_admin").select("*").order("nom").then((r: any) => r), { data: [], error: null }).then(({ data: villes }: { data: Record<string, string>[] | null }) => {
      const adminMap: Record<string, string> = {};
      (villes || []).forEach((v: Record<string, string>) => { adminMap[v.nom] = v.image || ""; });
      setAdminVilles(adminMap);
      fetchFormations().then(fs => {
        setFormations(fs);
        const norm = (s: string) => s.toLowerCase().replace(/-/g, " ").trim();
        const formationsByCity: Record<string, Set<number>> = {};
        const skipLieux = new Set(["Visio", "En ligne", "Présentiel", "Mixte"]);
        const addCity = (cityName: string, fId: number) => {
          if (cityName && !skipLieux.has(cityName)) {
            const key = norm(cityName);
            if (!formationsByCity[key]) formationsByCity[key] = new Set();
            formationsByCity[key].add(fId);
          }
        };
        fs.forEach(f => {
          (f.sessions || []).forEach((s: any) => {
            (s.lieu || "").split(", ").map((c: string) => c.trim()).filter(Boolean).forEach((cityName: string) => addCity(cityName, f.id));
            (s.session_parties || []).forEach((p: any) => {
              (p.lieu || p.ville || "").split(", ").map((c: string) => c.trim()).filter(Boolean).forEach((cityName: string) => addCity(cityName, f.id));
            });
          });
        });
        const cityCount: Record<string, number> = {};
        Object.entries(formationsByCity).forEach(([city, ids]) => { cityCount[city] = ids.size; });
        const adminNames = Object.keys(adminMap);
        if (adminNames.length > 0) {
          setCities(adminNames.map(n => {
            const nn = norm(n);
            const count = Object.entries(cityCount)
              .filter(([c]) => c === nn || c.startsWith(nn) || nn.startsWith(c))
              .reduce((sum, [, v]) => sum + v, 0);
            return [n, count] as [string, number];
          }).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]));
        } else {
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
        <h1 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.text, marginTop: 6 }}>Villes & Régions</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["carte", "villes"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 20px", borderRadius: 10, border: "1.5px solid " + (tab === t ? C.accent : C.border),
              background: tab === t ? C.accentBg : C.surface,
              color: tab === t ? C.accent : C.textSec,
              fontSize: 13, fontWeight: tab === t ? 700 : 400,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {t === "carte" ? "🗺️ Carte des régions" : "📍 Par ville"}
          </button>
        ))}
      </div>

      {tab === "carte" && (
        <div style={{ maxWidth: mob ? "100%" : 600, margin: "0 auto", paddingBottom: 40 }}>
          <FranceMap formations={formations} />
        </div>
      )}

      {tab === "villes" && (
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(auto-fill,minmax(200px,1fr))", gap: 12, paddingBottom: 40 }}>
          {cities.map(([city, count]) => <CityCard key={city} city={city} count={count} mob={mob} image={adminVilles[city]} />)}
        </div>
      )}
    </div>
  );
}
