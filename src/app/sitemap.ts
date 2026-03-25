import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE = "https://popform.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/catalogue`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/formateurs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/organismes`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/villes`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/cgu`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/mentions-legales`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [{ data: formations }, { data: formateurs }, { data: organismes }] = await Promise.all([
      supabase.from("formations").select("id, date_ajout").eq("status", "publiee").order("date_ajout", { ascending: false }),
      supabase.from("formateurs").select("id, updated_at").not("user_id", "is", null),
      supabase.from("organismes").select("id").eq("hidden", false),
    ]);

    const formationRoutes: MetadataRoute.Sitemap = (formations || []).map((f) => ({
      url: `${BASE}/formation/${f.id}`,
      lastModified: f.date_ajout ? new Date(f.date_ajout) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const formateurRoutes: MetadataRoute.Sitemap = (formateurs || []).map((f) => ({
      url: `${BASE}/formateur/${f.id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

    const organismeRoutes: MetadataRoute.Sitemap = (organismes || []).map((o) => ({
      url: `${BASE}/organisme/${o.id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...formationRoutes, ...formateurRoutes, ...organismeRoutes];
  } catch {
    return staticRoutes;
  }
}
