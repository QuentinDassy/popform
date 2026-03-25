import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  let nom = "Formateur·rice";
  let titre = "";
  let photoUrl: string | null = null;
  let nbFormations = 0;

  if (id) {
    const sb = createClient(supabaseUrl, supabaseKey);
    const [{ data: f }, { count }] = await Promise.all([
      sb.from("formateurs").select("nom, titre, specialite, photo_url").eq("id", id).single(),
      sb.from("formations").select("id", { count: "exact", head: true }).eq("status", "publiee").or(`formateur_id.eq.${id},formateur_ids.cs.{${id}}`),
    ]);
    if (f) {
      nom = f.nom || nom;
      titre = f.titre || f.specialite || "";
      photoUrl = f.photo_url && f.photo_url.startsWith("http") ? f.photo_url : null;
    }
    nbFormations = count || 0;
  }

  const initials = nom.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#FFF8EC",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div style={{ width: "100%", height: 8, background: "#D42B2B", display: "flex" }} />

        {/* Background decoration */}
        <div style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(212,43,43,0.06)",
          display: "flex",
        }} />
        <div style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(245,183,49,0.1)",
          display: "flex",
        }} />

        {/* Content */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "40px 80px", gap: 60 }}>
          {/* Avatar */}
          <div style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #D42B2B 0%, #F5B731 100%)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 72,
            color: "#fff",
            fontWeight: 800,
            overflow: "hidden",
            border: "6px solid #fff",
            boxShadow: "0 8px 32px rgba(212,43,43,0.2)",
          }}>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* Text */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#D42B2B", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Formateur·rice · PopForm 🍿
            </div>
            <div style={{ fontSize: 58, fontWeight: 900, color: "#2D1B06", lineHeight: 1.1 }}>
              {nom}
            </div>
            {titre && (
              <div style={{ fontSize: 24, color: "#6B4F2D", fontWeight: 500 }}>
                {titre}
              </div>
            )}
            {nbFormations > 0 && (
              <div style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(212,43,43,0.08)",
                border: "1.5px solid rgba(212,43,43,0.2)",
                borderRadius: 12,
                padding: "8px 20px",
                width: "fit-content",
                color: "#D42B2B",
                fontWeight: 700,
                fontSize: 20,
              }}>
                {nbFormations} formation{nbFormations > 1 ? "s" : ""} publiée{nbFormations > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "0 80px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 18, color: "#A48C6A", fontWeight: 500 }}>
            popform.fr
          </div>
          <div style={{ fontSize: 15, color: "#A48C6A" }}>
            La plateforme des formations en orthophonie
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
