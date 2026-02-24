/**
 * Upload a file directly via the authenticated Supabase browser client.
 * Falls back to /api/upload server route if direct upload fails.
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const contentType = file.type || "image/jpeg";
  const rawExt = file.name.split(".").pop()?.toLowerCase() || "";
  const ext = (rawExt === "heic" || rawExt === "heif" || !rawExt)
    ? (contentType.includes("png") ? "png" : contentType.includes("gif") ? "gif" : contentType.includes("webp") ? "webp" : "jpg")
    : rawExt;
  const slug = folder + "/" + Date.now() + "." + ext;

  // First try: direct client upload with user session
  try {
    const { createClient } = await import("@/lib/supabase");
    const supabase = createClient();

    const { error, data } = await supabase.storage
      .from("images")
      .upload(slug, file, { contentType, upsert: true });

    if (!error && data) {
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(slug);
      return urlData.publicUrl;
    }
    console.warn("Direct upload failed:", error?.message);
  } catch (_) {}

  // Fallback: server route (uses service role key)
  const fd = new FormData();
  fd.append("file", file);
  fd.append("path", slug);

  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Upload failed");
  return json.url as string;
}
