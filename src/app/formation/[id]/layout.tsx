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
    .from("formations")
    .select("titre, sous_titre, description, photo_url, organisme:organismes(nom), formateur:formateurs(nom)")
    .eq("id", id)
    .single();

  if (!f) return {};

  const orgRaw = f.organisme as unknown;
  const fmtRaw = f.formateur as unknown;
  const orgNom = Array.isArray(orgRaw) ? (orgRaw[0] as { nom: string } | undefined)?.nom : (orgRaw as { nom: string } | null)?.nom;
  const fmtNom = Array.isArray(fmtRaw) ? (fmtRaw[0] as { nom: string } | undefined)?.nom : (fmtRaw as { nom: string } | null)?.nom;
  const org = orgNom ?? fmtNom ?? "";
  const title = org ? `${f.titre} — ${org} | PopForm` : `${f.titre} | PopForm`;
  const description = (f.description || f.sous_titre || "Découvrez cette formation en orthophonie sur PopForm.").slice(0, 160);
  const image = (f.photo_url && f.photo_url.startsWith("http")) ? f.photo_url : "https://popform.fr/og-image.png";
  const url = `https://popform.fr/formation/${id}`;

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
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function FormationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
