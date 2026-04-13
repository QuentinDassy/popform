import { createClient } from "@supabase/supabase-js";
import WebinairesClient, { type Webinaire } from "./WebinairesClient";

export const revalidate = 300; // revalidate toutes les 5 minutes

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

  return <WebinairesClient webinaires={(data as Webinaire[]) || []} />;
}
