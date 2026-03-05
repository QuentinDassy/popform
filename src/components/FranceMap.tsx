"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { C, REGIONS_CITIES } from "@/lib/data";

// Approximate SVG paths for France's 13 metropolitan regions (simplified polygons)
const METRO_PATHS: Record<string, { path: string; cx: number; cy: number; short: string }> = {
  "Hauts-de-France":            { path: "M 195 20 L 372 20 L 398 93 L 360 115 L 248 118 L 195 90 Z",                                                               cx: 290, cy: 68,  short: "Hauts-de-France" },
  "Normandie":                  { path: "M 50 72 L 195 20 L 195 90 L 180 158 L 125 178 L 75 168 L 42 128 Z",                                                        cx: 118, cy: 112, short: "Normandie" },
  "Grand Est":                  { path: "M 372 20 L 490 62 L 500 182 L 470 218 L 393 228 L 332 200 L 295 162 L 302 115 L 360 115 L 398 93 Z",                       cx: 408, cy: 138, short: "Grand Est" },
  "Île-de-France":              { path: "M 248 118 L 302 115 L 295 162 L 272 192 L 228 168 Z",                                                                      cx: 270, cy: 152, short: "Île-de-France" },
  "Bretagne":                   { path: "M 10 135 L 50 72 L 75 168 L 55 205 L 22 218 Z",                                                                            cx: 44,  cy: 168, short: "Bretagne" },
  "Pays de la Loire":           { path: "M 55 205 L 75 168 L 125 178 L 180 158 L 200 222 L 185 282 L 138 292 L 78 272 Z",                                           cx: 128, cy: 232, short: "Pays de la Loire" },
  "Centre-Val de Loire":        { path: "M 180 158 L 228 168 L 272 192 L 290 238 L 270 288 L 202 288 L 185 282 L 200 222 Z",                                        cx: 234, cy: 238, short: "Centre-Val de Loire" },
  "Bourgogne-Franche-Comté":   { path: "M 295 162 L 393 228 L 395 318 L 350 348 L 268 318 L 270 288 L 290 238 L 272 192 Z",                                        cx: 332, cy: 268, short: "Bourgogne-FC" },
  "Nouvelle-Aquitaine":         { path: "M 78 272 L 138 292 L 185 282 L 202 288 L 218 385 L 192 452 L 122 465 L 52 440 L 32 378 L 48 298 Z",                        cx: 122, cy: 370, short: "Nouvelle-Aquitaine" },
  "Auvergne-Rhône-Alpes":      { path: "M 268 318 L 350 348 L 398 318 L 448 285 L 472 218 L 393 228 L 290 238 L 270 288 Z",                                        cx: 372, cy: 282, short: "Auvergne-RA" },
  "Occitanie":                  { path: "M 122 465 L 192 452 L 218 385 L 268 395 L 288 450 L 248 502 L 168 510 L 90 495 Z",                                          cx: 188, cy: 472, short: "Occitanie" },
  "Provence Alpes Côte d'Azur": { path: "M 268 395 L 268 318 L 350 348 L 398 318 L 448 285 L 480 358 L 458 435 L 400 472 L 315 478 L 288 450 Z",                    cx: 378, cy: 412, short: "PACA" },
  "Corse":                      { path: "M 418 458 L 440 448 L 460 492 L 448 525 L 422 518 Z",                                                                       cx: 440, cy: 492, short: "Corse" },
};

const DOM_REGIONS = ["Guadeloupe", "Martinique", "Guyane", "Réunion", "Mayotte"];

function countFormationsInRegion(region: string, formations: { sessions?: { lieu: string }[] }[]): number {
  const cities = new Set((REGIONS_CITIES[region] || []).map(c => c.toLowerCase()));
  return formations.filter(f =>
    (f.sessions || []).some(s => cities.has(s.lieu?.toLowerCase() || ""))
  ).length;
}

export default function FranceMap({ formations = [] }: { formations?: { sessions?: { lieu: string }[] }[] }) {
  const [hov, setHov] = useState<string | null>(null);
  const router = useRouter();

  const go = (region: string) => router.push("/catalogue?region=" + encodeURIComponent(region));

  const fill = (region: string) => {
    if (hov === region) return C.accent;
    return "#F5EDD8";
  };

  const stroke = (region: string) => hov === region ? C.accentDark : "#D4B896";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      {/* Metropolitan France SVG */}
      <div style={{ position: "relative", width: "100%", maxWidth: 520 }}>
        <svg
          viewBox="0 0 510 545"
          style={{ width: "100%", height: "auto", cursor: "default" }}
          aria-label="Carte des régions de France"
        >
          {Object.entries(METRO_PATHS).map(([region, { path, cx, cy, short }]) => {
            const count = countFormationsInRegion(region, formations);
            const isHov = hov === region;
            return (
              <g
                key={region}
                onMouseEnter={() => setHov(region)}
                onMouseLeave={() => setHov(null)}
                onClick={() => go(region)}
                style={{ cursor: "pointer" }}
              >
                <path
                  d={path}
                  fill={fill(region)}
                  stroke={stroke(region)}
                  strokeWidth={isHov ? 2 : 1}
                  style={{ transition: "fill 0.18s, stroke 0.18s" }}
                />
                {/* Label — only show for large-enough regions */}
                {!["Bretagne", "Île-de-France", "Corse"].includes(region) && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    fontSize={isHov ? 10 : 9}
                    fontWeight={isHov ? 800 : 600}
                    fill={isHov ? "#fff" : C.textSec}
                    style={{ pointerEvents: "none", transition: "fill 0.18s", userSelect: "none" }}
                  >
                    {short}
                  </text>
                )}
                {count > 0 && (
                  <text
                    x={cx}
                    y={cy + 13}
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight={600}
                    fill={isHov ? "rgba(255,255,255,0.85)" : C.accent}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {count} formation{count > 1 ? "s" : ""}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip on hover */}
        {hov && (
          <div style={{
            position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
            background: C.text, color: "#fff", borderRadius: 10, padding: "6px 14px",
            fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          }}>
            {hov} — {countFormationsInRegion(hov, formations)} formation{countFormationsInRegion(hov, formations) !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* DOM regions */}
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
          Territoires d'Outre-Mer
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {DOM_REGIONS.map(region => {
            const count = countFormationsInRegion(region, formations);
            const isHov = hov === region;
            return (
              <button
                key={region}
                onMouseEnter={() => setHov(region)}
                onMouseLeave={() => setHov(null)}
                onClick={() => go(region)}
                style={{
                  padding: "10px 6px",
                  borderRadius: 12,
                  border: "1.5px solid " + (isHov ? C.accent : C.borderLight),
                  background: isHov ? C.accentBg : C.surface,
                  color: isHov ? C.accent : C.textSec,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "center",
                  transition: "all 0.18s",
                }}
              >
                <div>{region}</div>
                {count > 0 && (
                  <div style={{ fontSize: 9, fontWeight: 600, color: C.accent, marginTop: 3 }}>
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
