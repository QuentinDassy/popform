import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sb = createClient(supabaseUrl, supabaseKey);
  const { data: o } = await sb
    .from("organismes")
    .select("nom, description, logo, site_url")
    .eq("id", id)
    .single();

  if (!o) return {};

  const title = `${o.nom} | PopForm`;
  const description = o.description ? o.description.slice(0, 160) : `Découvrez les formations de ${o.nom} sur PopForm.`;
  const hasLogo = !!(o.logo && o.logo.startsWith("http"));
  const image = hasLogo ? o.logo : "https://popform.fr/og-image.png";
  const url = `https://popform.fr/organisme/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "PopForm",
      locale: "fr_FR",
      type: "website",
      images: [{ url: image, width: hasLogo ? 400 : 1200, height: hasLogo ? 400 : 630, alt: o.nom }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function OrganismeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
