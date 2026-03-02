import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

function sanitizePath(path: string): string | null {
  if (!path || typeof path !== "string") return null;
  // Interdit le path traversal et les chemins absolus
  if (path.includes("..") || path.startsWith("/") || path.startsWith("\\")) return null;
  // Seuls les caractères alphanumériques, /, -, _ et . sont autorisés
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(path)) return null;
  // Extensions autorisées uniquement
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext || !["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return null;
  return path;
}

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Vérifier que la clé service est configurée
    if (!serviceKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY manquante");
      return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });
    }

    // Vérifier que l'utilisateur est authentifié
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;

    if (!file || !path) {
      return NextResponse.json({ error: "Fichier ou chemin manquant" }, { status: 400 });
    }

    // Valider le type MIME (côté serveur — pas de confiance aveugle au client)
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Seuls JPEG, PNG, WebP et GIF sont acceptés." },
        { status: 400 }
      );
    }

    // Valider la taille
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux (maximum 5 Mo)" }, { status: 400 });
    }

    // Assainir le chemin
    const safePath = sanitizePath(path);
    if (!safePath) {
      return NextResponse.json({ error: "Chemin de fichier invalide" }, { status: 400 });
    }

    // Upload avec la clé service (bypass RLS pour le storage)
    const storageClient = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error } = await storageClient.storage
      .from("images")
      .upload(safePath, buffer, { contentType: file.type, upsert: true });

    if (error) {
      console.error("Erreur upload storage:", error.message);
      return NextResponse.json({ error: `Upload échoué: ${error.message}` }, { status: 500 });
    }

    const { data: urlData } = storageClient.storage.from("images").getPublicUrl(safePath);
    return NextResponse.json({ url: urlData.publicUrl });

  } catch (e: any) {
    console.error("Erreur API upload:", e);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
