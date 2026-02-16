import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://popform-k2t5.vercel.app";

  // Static pages
  const staticPages = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1 },
    { url: `${base}/catalogue`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${base}/villes`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${base}/organismes`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${base}/formateurs`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${base}/mentions-legales`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${base}/cgu`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  // Dynamic formation pages
  let formationPages: MetadataRoute.Sitemap = [];
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from("formations")
        .select("id, date_ajout")
        .eq("status", "publiee")
        .order("date_ajout", { ascending: false });
      if (data) {
        formationPages = data.map(f => ({
          url: `${base}/formation/${f.id}`,
          lastModified: new Date(f.date_ajout),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }));
      }
    }
  } catch (e) {
    console.error("Sitemap error:", e);
  }

  return [...staticPages, ...formationPages];
}
