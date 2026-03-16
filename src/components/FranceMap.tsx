"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { C, REGIONS_CITIES } from "@/lib/data";

// Real France regions GeoJSON (gregoiredavid, public domain) — served locally
const GEO_URL = "/france-regions.geojson";

// SVG canvas
const W = 600;
const H = 560;
const SCALE = 1800;
const CENTER_LON = 2.5;
const CENTER_LAT = 46.5;

// Mercator projection: [lon, lat] → [x, y] in SVG coordinates
const φ0 = Math.log(Math.tan(Math.PI / 4 + (CENTER_LAT * Math.PI) / 360));
function project(lon: number, lat: number): [number, number] {
  const x = SCALE * ((lon - CENTER_LON) * Math.PI) / 180;
  const y = -SCALE * (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) - φ0);
  return [W / 2 + x, H / 2 + y];
}

function ringToPath(ring: number[][]): string {
  return (
    ring
      .map((p, i) => {
        const [x, y] = project(p[0], p[1]);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ") + "Z"
  );
}

function featureToPath(geometry: { type: string; coordinates: unknown }): string {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as number[][][]).map(ringToPath).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][])
      .flatMap((poly) => poly.map(ringToPath))
      .join(" ");
  }
  return "";
}

// GeoJSON name → REGIONS_CITIES key (minor discrepancies)
const GEO_TO_KEY: Record<string, string> = {
  "Île-de-France": "Ile-de-France",
  "Provence-Alpes-Côte d'Azur": "Provence Alpes Côte d'Azur",
};
const getKey = (nom: string) => GEO_TO_KEY[nom] || nom;

const normCity = (s: string) => s.toLowerCase().replace(/-/g, " ").trim();

function countFormations(
  key: string,
  formations: { sessions?: { lieu: string; session_parties?: { lieu?: string; ville?: string }[] }[] }[]
): number {
  const cities = (REGIONS_CITIES[key] || []).map((c) => normCity(c));
  const matchesCity = (text: string) => {
    const t = normCity(text);
    return cities.some((c) => t === c || t.includes(c));
  };
  return formations.filter((f) =>
    (f.sessions || []).some((s) => {
      const parts = (s.lieu || "").split(", ").map((p) => p.trim()).filter(Boolean);
      if (parts.some((p) => matchesCity(p))) return true;
      return (s.session_parties || []).some((p) => matchesCity(p.lieu || p.ville || ""));
    })
  ).length;
}

interface GeoFeature {
  properties: { nom: string };
  geometry: { type: string; coordinates: unknown };
}

// Contour géographique de la Belgique (lon, lat) — sens horaire
const BELGIUM_RING: number[][] = [
  [2.54, 51.09], [2.75, 51.16], [2.92, 51.23], [3.19, 51.34], [3.36, 51.37],
  [4.17, 51.37], [4.53, 51.47], [5.48, 51.47],
  [5.69, 50.77], [6.14, 50.50], [6.40, 50.35], [6.35, 50.16],
  [6.03, 49.97], [5.82, 49.54],
  [5.15, 49.55], [4.83, 49.56], [4.14, 49.74],
  [3.68, 50.07], [3.52, 50.32], [3.21, 50.71], [2.83, 50.87],
  [2.54, 51.09],
];

const DOM_REGIONS = ["Guadeloupe", "Martinique", "Guyane", "Réunion", "Mayotte"];

export default function FranceMap({
  formations = [],
}: {
  formations?: { sessions?: { lieu: string }[] }[];
}) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((data) => setFeatures(data.features || []))
      .catch(console.error);
  }, []);

  const go = (key: string) =>
    router.push("/catalogue?region=" + encodeURIComponent(key));

  const hovCount = hovered ? countFormations(hovered, formations) : 0;

  return (
    <div>
      {/* SVG map */}
      <div
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          background: "transparent",
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          aria-label="Carte des régions de France"
        >
          {features.length === 0 && (
            <text
              x={W / 2}
              y={H / 2}
              textAnchor="middle"
              fill={C.textTer}
              fontSize={14}
            >
              Chargement…
            </text>
          )}
          {/* Belgique — dessinée AVANT la France pour que la France couvre le chevauchement sud */}
          {(() => {
            const count = countFormations("Belgique", formations);
            const isHov = hovered === "Belgique";
            const d = ringToPath(BELGIUM_RING);
            return (
              <g transform="translate(0,-14)">
                <path d={d} fill="none" stroke="white" strokeWidth={4} style={{ pointerEvents: "none" }} />
                <path
                  d={d}
                  fill={isHov ? C.accent : count > 0 ? "#FFE8C0" : "#E8DFCF"}
                  stroke={isHov ? C.accentDark : "#BFB09A"}
                  strokeWidth={isHov ? 1.2 : 0.6}
                  style={{ pointerEvents: "none", transition: "fill 0.15s, stroke 0.15s" }}
                />
              </g>
            );
          })()}

          {features.map((f, i) => {
            const nom = f.properties.nom;
            const key = getKey(nom);
            const count = countFormations(key, formations);
            const isHov = hovered === key;
            return (
              <path
                key={i}
                d={featureToPath(f.geometry)}
                fill={isHov ? C.accent : count > 0 ? "#FFE8C0" : "#E8DFCF"}
                stroke={isHov ? C.accentDark : "#BFB09A"}
                strokeWidth={isHov ? 1.2 : 0.6}
                style={{ cursor: "pointer", transition: "fill 0.15s, stroke 0.15s" }}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => go(key)}
              />
            );
          })}

          {/* Belgique — zone cliquable dessinée APRÈS la France */}
          {(() => {
            const d = ringToPath(BELGIUM_RING);
            return (
              <g
                transform="translate(0,-14)"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered("Belgique")}
                onMouseLeave={() => setHovered(null)}
                onClick={() => go("Belgique")}
              >
                <path d={d} fill="transparent" stroke="none" />
              </g>
            );
          })()}
        </svg>
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
              <span style={{ color: C.textTer, fontWeight: 400, fontSize: 12 }}>
                aucune formation
              </span>
            )}
            <span style={{ color: C.textTer, fontSize: 12, fontWeight: 400 }}>
              — cliquer pour voir
            </span>
          </>
        ) : (
          <span>Survolez une région pour la sélectionner</span>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 16 }}>
        {[
          { color: "#FFE8C0", label: "Formations disponibles" },
          { color: "#E8DFCF", label: "Aucune formation" },
        ].map(({ color, label }) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textTer }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: color,
                border: "1px solid #BFB09A",
                display: "inline-block",
              }}
            />
            {label}
          </div>
        ))}
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
          DROM
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {DOM_REGIONS.map((region) => {
            const count = countFormations(region, formations);
            const isHov = hovered === region;
            return (
              <button
                key={region}
                onMouseEnter={() => setHovered(region)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => go(region)}
                style={{
                  padding: "10px 6px",
                  borderRadius: 12,
                  border: "1.5px solid " + (isHov ? C.accent : C.borderLight),
                  background: isHov ? C.accentBg : count > 0 ? "#FFF8EC" : C.surface,
                  color: isHov ? C.accent : C.textSec,
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
