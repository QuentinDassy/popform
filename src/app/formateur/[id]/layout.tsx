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
  const { data: f } = await sb
    .from("formateurs")
    .select("nom, bio, sexe, photo_url")
    .eq("id", id)
    .single();

  if (!f) return {};

  const title = `${f.nom} · Formateur·rice | PopForm 🍿`;
  const description = f.bio ? f.bio.slice(0, 160) : `Découvrez le profil et les formations de ${f.nom} sur PopForm.`;
  const image = `https://www.popform.fr/api/og/formateur?id=${id}`;
  const url = `https://popform.fr/formateur/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "PopForm",
      locale: "fr_FR",
      type: "profile",
      images: [{ url: image, width: 1200, height: 630, alt: f.nom }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function FormateurLayout({ children }: { children: React.ReactNode }) {
  return children;
}
