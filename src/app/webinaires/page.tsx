import { createClient } from "@supabase/supabase-js";
import WebinairesClient, { type Webinaire } from "./WebinairesClient";

export const revalidate = 0; // toujours fresh (pas de cache)

export default async function WebinairesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("webinaires")
    .select("*, organisme:organismes(nom), formateur:formateurs(nom)")
    .eq("status", "publie")
    .order("date_heure", { ascending: true });

  const webinaires = data || [];

  // Enrich with all formateurs from formateur_ids array
  const allFmtIds = [...new Set(webinaires.flatMap((w: any) => w.formateur_ids || []))] as number[];
  let formateursMap: Record<number, { id: number; nom: string }> = {};
  if (allFmtIds.length > 0) {
    const { data: fmts } = await supabase.from("formateurs").select("id, nom").in("id", allFmtIds);
    (fmts || []).forEach((f: any) => { formateursMap[f.id] = f; });
  }
  const enriched = webinaires.map((w: any) => ({
    ...w,
    formateurs: (w.formateur_ids || []).map((id: number) => formateursMap[id]).filter(Boolean),
  }));

  return <WebinairesClient webinaires={enriched as Webinaire[]} />;
}
