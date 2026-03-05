"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { C, REGIONS_CITIES } from "@/lib/data";

// Simplified France regions GeoJSON (gregoiredavid, public domain)
const GEO_URL =
  "https://cdn.jsdelivr.net/gh/gregoiredavid/france-geojson/regions-version-simplifiee.geojson";

// GeoJSON region names → our REGIONS_CITIES keys (minor differences)
const GEO_TO_KEY: Record<string, string> = {
  "Île-de-France": "Ile-de-France",
  "Provence-Alpes-Côte d'Azur": "Provence Alpes Côte d'Azur",
};
const getKey = (nom: string) => GEO_TO_KEY[nom] || nom;

function countFormations(key: string, formations: { sessions?: { lieu: string }[] }[]): number {
  const cities = new Set((REGIONS_CITIES[key] || []).map((c) => c.toLowerCase()));
  return formations.filter((f) =>
    (f.sessions || []).some((s) => cities.has((s.lieu || "").toLowerCase()))
  ).length;
}

const DOM_REGIONS = ["Guadeloupe", "Martinique", "Guyane", "Réunion", "Mayotte"];

export default function FranceMap({
  formations = [],
}: {
  formations?: { sessions?: { lieu: string }[] }[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const router = useRouter();
  const go = (key: string) => router.push("/catalogue?region=" + encodeURIComponent(key));

  const hovCount = hovered ? countFormations(hovered, formations) : 0;

  return (
    <div>
      {/* Map */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#f0f4f8" }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [2.5, 46.5], scale: 2600 }}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const nom: string = geo.properties.nom;
                const key = getKey(nom);
                const count = countFormations(key, formations);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => go(key)}
                    style={{
                      default: {
                        fill: count > 0 ? "#FFE8C0" : "#EEE8DC",
                        stroke: "#C8B898",
                        strokeWidth: 0.5,
                        outline: "none",
                        cursor: "pointer",
                        transition: "fill 0.15s",
                      },
                      hover: {
                        fill: C.accent,
                        stroke: C.accentDark,
                        strokeWidth: 1,
                        outline: "none",
                        cursor: "pointer",
                      },
                      pressed: {
                        fill: C.accentDark,
                        stroke: C.accentDark,
                        strokeWidth: 1,
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Info bar */}
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          fontSize: 13,
          color: hovered ? C.text : C.textTer,
          fontWeight: hovered ? 700 : 400,
          marginTop: 4,
        }}
      >
        {hovered ? (
          <>
            <span>🗺️ {hovered}</span>
            {hovCount > 0 ? (
              <span style={{ color: C.accent, fontWeight: 800 }}>
                {hovCount} formation{hovCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span style={{ color: C.textTer, fontWeight: 400, fontSize: 12 }}>aucune formation</span>
            )}
            <span style={{ color: C.textTer, fontSize: 12, fontWeight: 400 }}>— cliquer pour voir</span>
          </>
        ) : (
          <span>Survolez une région pour la sélectionner</span>
        )}
      </div>

      {/* Légende */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textTer }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: "#FFE8C0", border: "1px solid #C8B898", display: "inline-block" }} />
          Formations disponibles
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textTer }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: "#EEE8DC", border: "1px solid #C8B898", display: "inline-block" }} />
          Aucune formation
        </div>
      </div>

      {/* DOM */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.textTer,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          Territoires d'Outre-Mer
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {DOM_REGIONS.map((region) => {
            const count = countFormations(region, formations);
            return (
              <button
                key={region}
                onMouseEnter={() => setHovered(region)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => go(region)}
                style={{
                  padding: "10px 6px",
                  borderRadius: 12,
                  border: "1.5px solid " + (hovered === region ? C.accent : C.borderLight),
                  background: hovered === region ? C.accentBg : count > 0 ? "#FFF8EC" : C.surface,
                  color: hovered === region ? C.accent : C.textSec,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "center" as const,
                  transition: "all 0.15s",
                }}
              >
                <div>{region}</div>
                {count > 0 && (
                  <div style={{ fontSize: 9, color: C.accent, marginTop: 3 }}>
                    {count} form.
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
